import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, validate, type EntityEnvelope } from "./contracts";
import type { McpAuthContext } from "./auth";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { uploadImageToTelegram } from "@/lib/telegram-storage";
import { executeMissionOperation, isMissionOperation } from "./missions";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { buildSessionHourPlan } from "@/lib/session-close-hours";
import { syncSessionToCampaignMemory } from "@/lib/campaign-memory-indexer";
import { sendFeedbackRequestEmailsForSession } from "@/lib/session-close-feedback";

import { readSiteImages } from "./images";

const columns = "id,campaign_id,type,name,content,attributes,image_url,admin_only,mcp_status,mcp_revision,xp_value,is_core,global_status,updated_at";
const mapColumns = "id,campaign_id,name,description,map_type,image_url,visibility,parent_map_id,wiki_entity_id,admin_only,created_at,updated_at";
const notFound = () => new ApiError(404, "Entity not found");

function envelope(row: Record<string, any> | null): EntityEnvelope {
  if (!row) throw new ApiError(503, "Backend returned no entity");
  return {
    schema_version: 1, id: row.id, campaign_id: row.campaign_id, kind: row.type,
    name: row.name, body: row.content?.body ?? "", attributes: row.attributes ?? {},
    image_url: row.image_url ?? null, admin_only: row.admin_only === true, status: row.mcp_status, revision: row.mcp_revision,
    xp_value: row.xp_value ?? 0, is_core: row.is_core === true, global_status: row.global_status ?? null,
    source: { domain: "wiki", id: row.id },
  };
}

function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new ApiError(503, "Backend operation failed");
  return result.data;
}

function assertMcpScope(auth: McpAuthContext, campaignId: string): void {
  // The personal connector is deliberately single-scope. The UUID is config, never caller authority.
  if (!auth.isAdmin || !process.env.MCP_CAMPAIGN_ID || process.env.MCP_CAMPAIGN_ID !== campaignId) throw notFound();
}

async function authorizeSessionMcp(auth: McpAuthContext, campaignId: string) {
  if (!process.env.MCP_CAMPAIGN_ID || process.env.MCP_CAMPAIGN_ID !== campaignId) throw notFound();
  const profile = checked(await auth.db.from("profiles").select("role").eq("id", auth.userId).maybeSingle());
  const campaign = checked(await auth.db.from("campaigns").select("id,gm_id,admin_drafts_enabled").eq("id", campaignId).maybeSingle());
  if (!campaign || campaign.admin_drafts_enabled !== true || !(profile?.role === "gm" || profile?.role === "admin" || campaign.gm_id === auth.userId)) throw notFound();
  return campaign;
}

const eligibleSignup = (status: string) => ["approved", "confirmed", "attended", "absent"].includes(status.toLowerCase());

function sessionClosePayload(a: Record<string, any>) {
  return {
    campaign_id: a.campaign_id, session_id: a.session_id,
    attendance: Object.fromEntries(Object.entries(a.attendance).sort(([left], [right]) => left.localeCompare(right))),
    xp_gained: a.xp_gained,
    per_player_xp_awards: [...(a.per_player_xp_awards ?? [])].sort((left: any, right: any) => left.playerId.localeCompare(right.playerId)),
    elapsed_hours: a.elapsed_hours, summary: a.summary.trim(), gm_private_notes: a.gm_private_notes?.trim() || null,
  };
}

function makeSessionCloseToken(payload: unknown, updatedAt: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new ApiError(503, "Session close signing is not configured");
  return createHmac("sha256", secret).update(JSON.stringify({ payload, updatedAt })).digest("hex");
}

async function executeSessionOperation(auth: McpAuthContext, operation: string, a: Record<string, any>, createAdmin = createSupabaseAdminClient) {
  const campaign = await authorizeSessionMcp(auth, a.campaign_id);
  const admin: any = createAdmin();
  if (operation === "list_sessions" && !a.session_id) {
    const { data, error } = await admin.from("sessions").select("id,campaign_id,title,scheduled_at,status,session_summary,gm_private_notes,elapsed_hours,is_pre_closed,pre_closed_xp_gained,pre_closed_xp_awards").eq("campaign_id", a.campaign_id).order("scheduled_at", { ascending: false }).range(a.offset ?? 0, (a.offset ?? 0) + (a.limit ?? 20) - 1);
    if (error) throw new ApiError(503, "Session list lookup failed");
    return { sessions: data ?? [] };
  }
  const sessionQuery = admin.from("sessions").select("id,campaign_id,title,scheduled_at,status,location,session_summary,gm_private_notes,elapsed_hours,is_pre_closed,pre_closed_xp_gained,pre_closed_xp_awards,updated_at").eq("campaign_id", a.campaign_id);
  const { data: session, error: sessionError } = await sessionQuery.eq("id", a.session_id).maybeSingle();
  if (sessionError) throw new ApiError(503, "Session lookup failed");
  if (!session) throw notFound();
  const signupResult = await admin.from("session_signups").select("player_id,status").eq("session_id", a.session_id).order("signed_up_at");
  if (signupResult.error) throw new ApiError(503, "Session signup lookup failed");
  const signups = (signupResult.data ?? []).filter((row: any) => eligibleSignup(row.status));
  const playerIds: string[] = signups.map((row: any) => String(row.player_id));
  const [profilesResult, charactersResult] = await Promise.all([
    playerIds.length ? admin.from("profiles").select("id,display_name,first_name,last_name").in("id", playerIds) : Promise.resolve({ data: [], error: null }),
    playerIds.length ? admin.from("campaign_characters").select("id,name,assigned_to,current_xp,time_offset_hours").eq("campaign_id", a.campaign_id).in("assigned_to", playerIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error || charactersResult.error) throw new ApiError(503, "Session participant lookup failed");
  const profileMap = new Map((profilesResult.data ?? []).map((row: any) => [row.id, row]));
  const charactersByPlayer = new Map<string, any[]>();
  for (const character of charactersResult.data ?? []) charactersByPlayer.set(character.assigned_to, [...(charactersByPlayer.get(character.assigned_to) ?? []), character]);
  const participants = signups.map((row: any) => {
    const profile: any = profileMap.get(row.player_id);
    return { player_id: row.player_id, status: row.status, name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || profile?.display_name || row.player_id, characters: charactersByPlayer.get(row.player_id) ?? [] };
  });
  if (operation === "list_sessions") return { session, participants };
  if (operation === "close_session" && session.status === "completed") {
    const [ledger, hourRows] = await Promise.all([
      admin.from("session_xp_awards").select("campaign_id,player_id,character_id,xp_awarded,xp_after").eq("session_id", a.session_id).order("created_at"),
      admin.from("session_hour_awards").select("character_id,hours_awarded,hours_before,hours_after,calendar_date_after").eq("session_id", a.session_id),
    ]);
    if (ledger.error || hourRows.error) throw new ApiError(503, "Completed session readback failed");
    return { success: true, already_closed: true, session, xp_ledger: ledger.data ?? [], hours: { characters: hourRows.data ?? [], reapplied: false } };
  }
  if (session.status !== "scheduled") throw new ApiError(409, "Session is not scheduled; no changes applied");
  if (operation === "close_session") {
    const expectedToken = makeSessionCloseToken(sessionClosePayload(a), a.proposal_updated_at);
    const suppliedToken = Buffer.from(a.proposal_token, "hex");
    if (session.updated_at !== a.proposal_updated_at || suppliedToken.length !== 32 || !timingSafeEqual(Buffer.from(expectedToken, "hex"), suppliedToken)) throw new ApiError(409, "Reviewed proposal is stale or does not match this close request; prepare it again");
  }

  const candidateIds = new Set(playerIds);
  const attendanceEntries = Object.entries(a.attendance) as [string, string][];
  if (attendanceEntries.some(([playerId]) => !candidateIds.has(playerId)) || attendanceEntries.length !== candidateIds.size || [...candidateIds].some((playerId) => !(playerId in a.attendance))) throw new ApiError(400, "Attendance must include every eligible session signup exactly once");
  const perPlayerAwards = a.per_player_xp_awards ?? [];
  if (perPlayerAwards.some((award: any) => !candidateIds.has(award.playerId) || a.attendance[award.playerId] !== "attended")) throw new ApiError(400, "Per-player XP awards must target attending signups");

  if (operation === "prepare_session_close") {
    const { error } = await admin.rpc("save_session_preclose" as never, {
      p_session_id: a.session_id, p_actor_id: auth.userId, p_attendance: a.attendance,
      p_xp_gained: a.xp_gained, p_per_player_xp_awards: perPlayerAwards,
    } as never);
    if (error) throw new ApiError(503, "Session pre-close draft could not be saved");
    const { data: draft } = await admin.from("sessions").select("id,status,is_pre_closed,pre_closed_xp_gained,pre_closed_xp_awards,updated_at").eq("id", a.session_id).maybeSingle();
    if (!draft?.is_pre_closed) throw new ApiError(503, "Session pre-close draft readback failed");
    const payload = sessionClosePayload(a);
    const proposalToken = makeSessionCloseToken(payload, draft.updated_at);
    return { proposal: { ...payload, proposal_token: proposalToken, proposal_updated_at: draft.updated_at }, draft_persisted: { is_pre_closed: draft.is_pre_closed, xp_gained: draft.pre_closed_xp_gained, per_player_xp_awards: draft.pre_closed_xp_awards }, ready_to_close: true };
  }


  const hours = Math.max(0, Math.floor(a.elapsed_hours));
  let hourPlan: Awaited<ReturnType<typeof buildSessionHourPlan>>;
  try {
    hourPlan = await buildSessionHourPlan(admin, a.campaign_id, a.attendance, hours);
  } catch (error) {
    throw new ApiError(503, error instanceof Error ? error.message : "Session hour plan failed");
  }

  const { error: closeError } = await admin.rpc("close_session_with_xp_and_hours" as never, {
    p_session_id: a.session_id, p_actor_id: auth.userId, p_attendance: a.attendance, p_xp_gained: a.xp_gained,
    p_per_player_xp_awards: perPlayerAwards, p_summary: a.summary.trim(), p_gm_private_notes: a.gm_private_notes?.trim() || null,
    p_elapsed_hours: hours, p_hour_updates: hourPlan.updates,
    p_calendar_config: hourPlan.calendarConfig, p_calendar_base_date: hourPlan.calendarBaseDate,
  } as never);
  if (closeError) throw new ApiError(503, "Session close failed");

  const [sessionRead, awardsRead, hoursRead] = await Promise.all([
    admin.from("sessions").select("id,campaign_id,status,session_summary,gm_private_notes,elapsed_hours,is_pre_closed").eq("id", a.session_id).maybeSingle(),
    admin.from("session_xp_awards").select("campaign_id,player_id,character_id,xp_awarded,xp_after").eq("session_id", a.session_id).order("created_at"),
    admin.from("session_hour_awards").select("character_id,hours_awarded,hours_before,hours_after,calendar_date_after").eq("session_id", a.session_id),
  ]);
  if (sessionRead.error || awardsRead.error || hoursRead.error || sessionRead.data?.campaign_id !== a.campaign_id || sessionRead.data?.status !== "completed" || sessionRead.data?.session_summary !== a.summary.trim() || sessionRead.data?.elapsed_hours !== hours || (sessionRead.data?.gm_private_notes ?? null) !== (a.gm_private_notes?.trim() || null)) throw new ApiError(503, "Session closed, but readback failed");
  const expectedXp = new Map(perPlayerAwards.map((award: any) => [award.playerId, award.xp]));
  const expectedPlayers = attendanceEntries.filter(([, status]) => status === "attended").map(([playerId]) => playerId);
  const ledgerByPlayer = new Map((awardsRead.data ?? []).map((award: any) => [award.player_id, award]));
  const xpLedgerVerified = ledgerByPlayer.size === expectedPlayers.length && expectedPlayers.every((playerId) => {
    const award: any = ledgerByPlayer.get(playerId);
    return !!award && award.campaign_id === a.campaign_id && award.xp_awarded === (expectedXp.has(playerId) ? expectedXp.get(playerId) : a.xp_gained);
  });
  if (!xpLedgerVerified) throw new ApiError(503, "Session closed, but XP ledger does not match the approved awards");
  const hourLedger = (hoursRead.data ?? []) as any[];
  const hourByCharacter = new Map(hourLedger.map((row) => [row.character_id, row]));
  const hoursVerified = hourByCharacter.size === hourPlan.updates.length && hourPlan.updates.every((update) => {
    const row = hourByCharacter.get(update.character_id);
    return row && row.hours_awarded === hours && row.hours_before === update.expected_hours
      && row.hours_after === update.next_hours
      && Number(row.calendar_date_after?.year) === Number((update.calendar_current_date as any).year)
      && Number(row.calendar_date_after?.month) === Number((update.calendar_current_date as any).month)
      && Number(row.calendar_date_after?.day) === Number((update.calendar_current_date as any).day);
  });
  if (!hoursVerified) throw new ApiError(503, "Session closed, but hour ledger does not match the approved plan");
  try { await syncSessionToCampaignMemory(admin, a.session_id, { campaignId: a.campaign_id }); } catch { /* Closure is already persisted; memory indexing is best effort. */ }
  void sendFeedbackRequestEmailsForSession(admin, a.campaign_id, a.session_id);
  try {
    revalidatePath(`/campaigns/${a.campaign_id}`);
    revalidatePath("/dashboard");
  } catch { /* The API can run outside a Next request cache context. */ }
  return { success: true, session: sessionRead.data, xp_ledger: awardsRead.data ?? [], hours: { requested: hours, characters: hourLedger, verified: true }, message: "Session, XP and character hours closed atomically and verified." };
}

async function getEnabledCampaign(db: SupabaseClient, campaignId: string): Promise<{ id: string; type: string }> {
  const campaign = checked(await db.from("campaigns").select("id,type,admin_drafts_enabled").eq("id", campaignId).maybeSingle());
  if (!campaign || campaign.admin_drafts_enabled !== true) throw notFound();
  return campaign;
}

export async function executeContent(
  auth: McpAuthContext,
  raw: unknown,
  deps: { uploadImage?: typeof uploadImageToTelegram; createAdmin?: typeof createSupabaseAdminClient; fetchImage?: import("./images").ImageFetcher } = {}
) {
  const { operation, args: a } = validate(raw);
  if (["list_sessions", "prepare_session_close", "close_session"].includes(operation)) return executeSessionOperation(auth, operation, a, deps.createAdmin ?? createSupabaseAdminClient);
  if (operation === "read_entity_images" || operation === "read_map_image") {
    return readSiteImages(auth, operation, a, (request): Promise<any> => executeContent(auth, request, deps), deps.fetchImage);
  }
  const uploadImage = deps.uploadImage ?? uploadImageToTelegram;
  assertMcpScope(auth, a.campaign_id);
  const campaign = await getEnabledCampaign(auth.db, a.campaign_id);
  const adminOnlyRequested = a.admin_only === true;

  if (isMissionOperation(operation)) return executeMissionOperation(auth.db, operation, a);

  if (operation === "search_lore") {
    const query = a.query.replace(new RegExp("[^\\p{L}\\p{N}\\s-]", "gu"), " ").trim();
    if (!query) throw new ApiError(400, "Search requires letters or numbers");
    const offset = a.offset ?? 0, limit = a.limit ?? 20;
    let request = auth.db.from("wiki_entities").select(columns).eq("campaign_id", a.campaign_id).or(`name.ilike.%${query}%,content->>body.ilike.%${query}%`);
    // Never trust a requested flag: only a verified Admin may opt into protected rows.
    if (!auth.isAdmin || !adminOnlyRequested) request = request.eq("admin_only", false);
    const rows = checked(await request.order("id").range(offset, offset + limit - 1)) ?? [];
    return { entities: rows.map(envelope), offset, limit, admin_only: auth.isAdmin && adminOnlyRequested };
  }

  if (operation === "list_wiki_relationships") {
    const offset = a.offset ?? 0, limit = a.limit ?? 100;
    const relationships = checked(await auth.db.from("wiki_relationships")
      .select("id,campaign_id,source_id,target_id,target_map_id,label,created_at")
      .eq("campaign_id", a.campaign_id).order("created_at").order("id").range(offset, offset + limit - 1)) ?? [];
    const entityIds = [...new Set(relationships.flatMap((relationship: Record<string, any>) => [relationship.source_id, relationship.target_id]).filter(Boolean))];
    const mapIds = [...new Set(relationships.map((relationship: Record<string, any>) => relationship.target_map_id).filter(Boolean))];
    const entities = entityIds.length ? checked(await auth.db.from("wiki_entities").select("id,name,type,admin_only").eq("campaign_id", a.campaign_id).in("id", entityIds)) ?? [] : [];
    const maps = mapIds.length ? checked(await auth.db.from("maps").select("id,name,map_type,admin_only").eq("campaign_id", a.campaign_id).in("id", mapIds)) ?? [] : [];
    const entityById = new Map(entities.map((entity: Record<string, any>) => [entity.id, entity]));
    const mapById = new Map(maps.map((map: Record<string, any>) => [map.id, map]));
    const includeProtected = auth.isAdmin && adminOnlyRequested;
    const visible = relationships.flatMap((relationship: Record<string, any>) => {
      const source = entityById.get(relationship.source_id);
      const target = relationship.target_id ? entityById.get(relationship.target_id) : null;
      const targetMap = relationship.target_map_id ? mapById.get(relationship.target_map_id) : null;
      // Missing endpoints are hidden instead of leaking an otherwise unreadable relationship.
      if (!source || (relationship.target_id && !target) || (relationship.target_map_id && !targetMap)) return [];
      if (!includeProtected && (source.admin_only || target?.admin_only || targetMap?.admin_only)) return [];
      return [{
        id: relationship.id, campaign_id: relationship.campaign_id, source_id: relationship.source_id,
        target_id: relationship.target_id, target_map_id: relationship.target_map_id, label: relationship.label,
        created_at: relationship.created_at,
        source: { id: source.id, name: source.name, type: source.type, admin_only: source.admin_only === true },
        target: target ? { id: target.id, name: target.name, type: target.type, admin_only: target.admin_only === true } : null,
        target_map: targetMap ? { id: targetMap.id, name: targetMap.name, map_type: targetMap.map_type, admin_only: targetMap.admin_only === true } : null,
      }];
    });
    return { relationships: visible, offset, limit, next_offset: relationships.length === limit ? offset + limit : null, admin_only: includeProtected };
  }

  if (operation === "upsert_wiki_relationship") {
    const relationshipColumns = "id,campaign_id,source_id,target_id,target_map_id,label,created_at";
    const source = checked(await auth.db.from("wiki_entities").select("id,name,type,admin_only").eq("id", a.source_id).eq("campaign_id", a.campaign_id).maybeSingle());
    if (!source) throw new ApiError(404, "Source entity not found");
    const target = a.target_id ? checked(await auth.db.from("wiki_entities").select("id,name,type,admin_only").eq("id", a.target_id).eq("campaign_id", a.campaign_id).maybeSingle()) : null;
    const targetMap = a.target_map_id ? checked(await auth.db.from("maps").select("id,name,map_type,admin_only").eq("id", a.target_map_id).eq("campaign_id", a.campaign_id).maybeSingle()) : null;
    if (a.target_id && !target) throw new ApiError(404, "Target entity not found");
    if (a.target_map_id && !targetMap) throw new ApiError(404, "Target map not found");
    if (!adminOnlyRequested && (source.admin_only || target?.admin_only || targetMap?.admin_only)) throw notFound();
    if (!source.admin_only && target?.admin_only) throw new ApiError(400, "Public entities cannot link to Admin-only entities");

    const label = a.label.trim();
    const findExisting = () => {
      let request = auth.db.from("wiki_relationships").select(relationshipColumns)
        .eq("campaign_id", a.campaign_id).eq("source_id", a.source_id);
      request = a.target_id ? request.eq("target_id", a.target_id) : request.eq("target_map_id", a.target_map_id);
      return request.maybeSingle();
    };
    let relationship = checked(await findExisting());
    let created = false;
    if (relationship && relationship.label !== label) {
      relationship = checked(await auth.db.from("wiki_relationships").update({ label }).eq("id", relationship.id).select(relationshipColumns).single());
    } else if (!relationship) {
      const payload = {
        campaign_id: a.campaign_id, source_id: a.source_id,
        target_id: a.target_id ?? null, target_map_id: a.target_map_id ?? null, label,
      };
      const inserted = await auth.db.from("wiki_relationships").insert(payload).select("id").single();
      if (inserted.error && (inserted.error as { code?: string }).code !== "23505") throw new ApiError(503, "Relationship write failed");
      relationship = checked(await findExisting());
      if (!relationship) throw new ApiError(503, "Relationship readback failed");
      created = !inserted.error;
    }
    return {
      relationship: {
        ...relationship,
        source: { id: source.id, name: source.name, type: source.type, admin_only: source.admin_only === true },
        target: target ? { id: target.id, name: target.name, type: target.type, admin_only: target.admin_only === true } : null,
        target_map: targetMap ? { id: targetMap.id, name: targetMap.name, map_type: targetMap.map_type, admin_only: targetMap.admin_only === true } : null,
      },
      created,
    };
  }

  if (operation === "search_maps") {
    const offset = a.offset ?? 0, limit = a.limit ?? 50;
    let request = auth.db.from("maps").select(mapColumns).eq("campaign_id", a.campaign_id);
    if (a.query) {
      const query = a.query.replace(new RegExp("[^\\p{L}\\p{N}\\s-]", "gu"), " ").trim();
      if (!query) throw new ApiError(400, "Search requires letters or numbers");
      request = request.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (a.map_type) request = request.eq("map_type", a.map_type);
    if (!auth.isAdmin || !adminOnlyRequested) request = request.eq("admin_only", false);
    const maps = checked(await request.order("name").range(offset, offset + limit - 1)) ?? [];
    return { maps, offset, limit, admin_only: auth.isAdmin && adminOnlyRequested };
  }

  if (operation === "get_map") {
    let request = auth.db.from("maps").select(mapColumns).eq("id", a.map_id).eq("campaign_id", a.campaign_id);
    if (!auth.isAdmin || !adminOnlyRequested) request = request.eq("admin_only", false);
    const map = checked(await request.maybeSingle());
    if (!map) throw new ApiError(404, "Map not found");
    return { map };
  }

  if (operation.startsWith("create_")) {
    const payload: Record<string, unknown> = {
      campaign_id: a.campaign_id, type: operation.slice(7), name: a.name.trim(), content: { body: a.body },
      attributes: a.attributes ?? {}, admin_only: adminOnlyRequested, is_secret: true, visibility: "secret", mcp_status: "draft",
    };
    if (operation === "create_monster") {
      payload.xp_value = a.xp_value ?? 0;
      if (campaign.type === "long") {
        payload.is_core = a.is_core ?? false;
        payload.global_status = "alive";
      }
    }
    const row = checked(await auth.db.from("wiki_entities").insert(payload).select(columns).single());
    return { entity: envelope(row) };
  }

  if (operation === "upload_asset") {
    const asset = checked(await auth.db.from("mcp_assets").insert({ campaign_id: a.campaign_id, filename: a.filename, mime_type: a.mime_type, data_base64: a.data_base64 }).select("id,campaign_id,filename,mime_type,created_at").single());
    return { asset };
  }

  if (operation === "upload_map") {
    const duplicate = checked(await auth.db.from("maps").select("id,name").eq("campaign_id", a.campaign_id).ilike("name", a.name.trim()).limit(1).maybeSingle());
    if (duplicate) throw new ApiError(409, `Map already exists: ${duplicate.name} (${duplicate.id})`);
    let parent: { id: string; map_type: string } | null = null;
    if (a.parent_map_id) {
      parent = checked(await auth.db.from("maps").select("id,map_type").eq("id", a.parent_map_id).eq("campaign_id", a.campaign_id).maybeSingle());
      if (!parent) throw new ApiError(400, "Parent map not found in this campaign");
      if (campaign.type !== "long") throw new ApiError(400, "Map hierarchy requires a long campaign");
    }
    const mapType = a.map_type ?? "city";
    const requiredParent = mapType === "continent" ? "world" : mapType === "city" ? "continent" : null;
    if (parent && mapType === "world") throw new ApiError(400, "A world map cannot have a parent");
    if (parent && requiredParent && parent.map_type !== requiredParent) throw new ApiError(400, `${mapType} requires a ${requiredParent} parent`);
    let imageUrl = a.image_url;
    if (a.data_base64) {
      const file = new File([Buffer.from(a.data_base64, "base64")], a.filename, { type: a.mime_type });
      try { imageUrl = `/api/tg-image/${await uploadImage(file, `Mappa: ${a.name.trim()}`)}`; }
      catch { throw new ApiError(503, "Map image upload failed"); }
    }
    const payload: Record<string, unknown> = {
      campaign_id: a.campaign_id, name: a.name.trim(), description: a.description?.trim() || null,
      map_type: mapType, image_url: imageUrl, visibility: a.visibility ?? "secret", admin_only: a.admin_only === true,
    };
    if (a.parent_map_id) payload.parent_map_id = a.parent_map_id;
    const result = await auth.db.from("maps").insert(payload).select(mapColumns).single();
    if ((result.error as { code?: string } | null)?.code === "23505") throw new ApiError(409, "This campaign already has a world map");
    return { map: checked(result) };
  }

  let entityQuery = auth.db.from("wiki_entities").select(columns).eq("id", a.entity_id).eq("campaign_id", a.campaign_id);
  // Status/asset writes are already restricted to the verified personal Admin;
  // read-like get/search calls require an explicit opt-in for protected rows.
  const protectedWrite = operation === "set_status" || operation === "attach_asset" || operation === "upload_entity_image";
  if (!auth.isAdmin || (!adminOnlyRequested && !protectedWrite)) entityQuery = entityQuery.eq("admin_only", false);
  const entity = checked(await entityQuery.maybeSingle());
  if (!entity) throw notFound();

  if (operation === "get_entity") {
    const links = checked(await auth.db.from("mcp_entity_assets").select("asset_id").eq("entity_id", a.entity_id).eq("campaign_id", a.campaign_id));
    return { entity: envelope(entity), assets: (links ?? []).map((link: { asset_id: string }) => ({ ...link, download_path: `/api/integrations/content/assets/${link.asset_id}?campaign_id=${a.campaign_id}` })) };
  }
  if (operation === "attach_asset") {
    const asset = checked(await auth.db.from("mcp_assets").select("id").eq("id", a.asset_id).eq("campaign_id", a.campaign_id).maybeSingle());
    if (!asset) throw new ApiError(404, "Asset not found");
    const result = await auth.db.from("mcp_entity_assets").insert({ campaign_id: a.campaign_id, entity_id: a.entity_id, asset_id: a.asset_id }).select("id,entity_id,asset_id").single();
    if ((result.error as { code?: string } | null)?.code === "23505") throw new ApiError(409, "Asset already attached");
    return { attachment: checked(result) };
  }
  if (operation === "upload_entity_image") {
    if (entity.mcp_revision !== a.revision) throw new ApiError(409, "Revision conflict: read entity again");
    const file = new File([Buffer.from(a.data_base64, "base64")], a.filename, { type: a.mime_type });
    let imageUrl: string;
    try { imageUrl = `/api/tg-image/${encodeURIComponent(await uploadImage(file, `Wiki: ${entity.name}`))}`; }
    catch { throw new ApiError(503, "Wiki image upload failed"); }
    const galleryImage = a.mode === "gallery" ? { id: randomUUID(), url: imageUrl, title: a.title?.trim() || a.filename } : null;
    const patch = galleryImage
      ? { attributes: { ...(entity.attributes ?? {}), images: [...(Array.isArray(entity.attributes?.images) ? entity.attributes.images : []), galleryImage] } }
      : { image_url: imageUrl };
    const result = await auth.db.from("wiki_entities").update(patch).eq("id", a.entity_id).eq("campaign_id", a.campaign_id).eq("mcp_revision", a.revision).select(columns).maybeSingle();
    if (result.error) throw new ApiError(503, "Wiki image update failed");
    if (!result.data) throw new ApiError(409, "Revision conflict: read entity again");
    return { entity: envelope(result.data), ...(galleryImage ? { image: galleryImage } : {}) };
  }
  if (operation === "set_status") {
    if (entity.mcp_revision !== a.revision) throw new ApiError(409, "Revision conflict: read entity again");
    const updated = checked(await auth.db.from("wiki_entities").update({ mcp_status: a.status }).eq("id", a.entity_id).eq("campaign_id", a.campaign_id).eq("mcp_revision", a.revision).select(columns).maybeSingle());
    if (!updated) throw new ApiError(409, "Revision conflict: read entity again");
    return { entity: envelope(updated) };
  }

  if (entity.mcp_revision !== a.revision) throw new ApiError(409, "Revision conflict: read entity again");
  const patch: Record<string, unknown> = {};
  if (a.name !== undefined) patch.name = a.name.trim();
  if (a.body !== undefined) patch.content = { ...(entity.content ?? {}), body: a.body };
  if (a.attributes !== undefined) patch.attributes = { ...(entity.attributes ?? {}), ...a.attributes };
  if (a.admin_only !== undefined) patch.admin_only = a.admin_only;
  if (a.admin_only === false && entity.admin_only === true) throw new ApiError(400, "Protected content cannot be downgraded by MCP");
  const updated = checked(await auth.db.from("wiki_entities").update(patch).eq("id", a.entity_id).eq("campaign_id", a.campaign_id).eq("mcp_revision", a.revision).select(columns).maybeSingle());
  if (!updated) throw new ApiError(409, "Revision conflict: read entity again");
  return { entity: envelope(updated) };
}
