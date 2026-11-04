import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, type Operation } from "./contracts";
import { rankFromPoints } from "@/lib/missions/guild-ranks";

const columns = "id,campaign_id,mission_kind,grade,title,committente,ubicazione,paga,urgenza,description,status,points_reward,completed_at,completed_by_guild_id,treasure_gp,treasure_sp,treasure_cp,created_at,updated_at";
const missionOperations = new Set<Operation>([
  "search_missions", "get_mission", "create_mission", "update_mission",
  "set_mission_status", "complete_mission", "reopen_mission", "delete_mission",
  "list_mission_encounters", "create_mission_encounter", "update_mission_encounter",
  "delete_mission_encounter", "replace_encounter_monsters", "link_mission_resource",
  "list_mission_resources"
]);

export function isMissionOperation(operation: Operation): boolean { return missionOperations.has(operation); }
function checked<T>(result: { data: T; error: unknown }): T { if (result.error) throw new ApiError(503, "Mission backend operation failed"); return result.data; }
async function mission(db: SupabaseClient, campaignId: string, missionId: string) {
  const row = checked(await db.from("campaign_missions").select(columns).eq("id", missionId).eq("campaign_id", campaignId).maybeSingle());
  if (!row) throw new ApiError(404, "Mission not found"); return row;
}
async function adjustGuildScore(db: SupabaseClient, campaignId: string, guildId: string, delta: number) {
  const guild = checked(await db.from("campaign_guilds").select("id,score,auto_rank").eq("id", guildId).eq("campaign_id", campaignId).maybeSingle());
  if (!guild) throw new ApiError(404, "Guild not found");
  const score = Math.max(0, Number(guild.score ?? 0) + delta);
  checked(await db.from("campaign_guilds").update({ score, ...(guild.auto_rank !== false ? { rank: rankFromPoints(score) } : {}), updated_at: new Date().toISOString() }).eq("id", guildId).eq("campaign_id", campaignId));
}

export async function executeMissionOperation(db: SupabaseClient, operation: Operation, a: Record<string, any>) {
  if (operation === "search_missions") {
    const offset = a.offset ?? 0, limit = a.limit ?? 20;
    let request = db.from("campaign_missions").select(columns).eq("campaign_id", a.campaign_id);
    const kind = a.mission_kind ?? "organization";
    if (kind !== "all") request = request.eq("mission_kind", kind);
    if (a.status) request = request.eq("status", a.status);
    const term = (a.query ?? "").replace(new RegExp("[^\\p{L}\\p{N}\\s-]", "gu"), " ").trim();
    if (term) request = request.or(`title.ilike.%${term}%,committente.ilike.%${term}%,ubicazione.ilike.%${term}%,description.ilike.%${term}%`);
    return { missions: checked(await request.order("created_at", { ascending: false }).range(offset, offset + limit - 1)) ?? [], offset, limit, mission_kind: kind };
  }
  if (operation === "get_mission") return { mission: await mission(db, a.campaign_id, a.mission_id) };
  if (operation === "create_mission") {
    const title = a.title.trim();
    const duplicate = checked(await db.from("campaign_missions").select("id,title").eq("campaign_id", a.campaign_id).ilike("title", title).limit(1).maybeSingle());
    if (duplicate) throw new ApiError(409, `Mission already exists: ${duplicate.title} (${duplicate.id})`);
    const kind = a.mission_kind === "personal" ? "personal" : "organization";
    const insertRow: Record<string, unknown> = {
      campaign_id: a.campaign_id,
      mission_kind: kind,
      title,
      description: a.description.trim(),
      grade: a.grade?.trim() || "",
      committente: a.committente?.trim() || "",
      ubicazione: a.ubicazione?.trim() || "",
      paga: a.paga?.trim() || "",
      urgenza: a.urgenza?.trim() || "",
      points_reward: kind === "personal" ? 0 : (a.points_reward ?? 0),
      status: "open",
      updated_at: new Date().toISOString(),
    };
    const result = await db.from("campaign_missions").insert(insertRow).select(columns).single();
    if ((result.error as { code?: string } | null)?.code === "23505") throw new ApiError(409, "A mission with this title already exists");
    return { mission: checked(result) };
  }
  if (operation === "update_mission") {
    const current = await mission(db, a.campaign_id, a.mission_id);
    if (current.mission_kind === "personal" && a.points_reward && a.points_reward > 0) {
      throw new ApiError(400, "Personal missions cannot have guild points reward");
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ["grade", "title", "committente", "ubicazione", "paga", "urgenza", "description"]) if (a[key] !== undefined) patch[key] = a[key].trim();
    if (a.points_reward !== undefined) patch.points_reward = current.mission_kind === "personal" ? 0 : a.points_reward;
    const updated = checked(await db.from("campaign_missions").update(patch).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
    if (!updated) throw new ApiError(409, "Mission changed: read it again"); return { mission: updated };
  }
  if (["set_mission_status", "complete_mission", "reopen_mission", "delete_mission"].includes(operation)) {
    const current = await mission(db, a.campaign_id, a.mission_id);
    if (current.updated_at !== a.expected_updated_at) throw new ApiError(409, "Mission changed: read it again");
    if (operation === "delete_mission") {
      const deleted = checked(await db.from("campaign_missions").delete().eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select("id").maybeSingle());
      if (!deleted) throw new ApiError(409, "Mission changed: read it again");
      if (current.mission_kind !== "personal" && current.status === "completed" && current.completed_by_guild_id && current.points_reward > 0) {
        await adjustGuildScore(db, a.campaign_id, current.completed_by_guild_id, -current.points_reward);
      }
      return { deleted_mission_id: a.mission_id };
    }
    if (operation === "set_mission_status") {
      if (current.status === "completed") throw new ApiError(409, "Reopen the completed mission first");
      const updated = checked(await db.from("campaign_missions").update({ status: a.status, completed_at: null, completed_by_guild_id: null, updated_at: new Date().toISOString() }).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
      if (!updated) throw new ApiError(409, "Mission changed: read it again"); return { mission: updated };
    }
    if (operation === "complete_mission") {
      if (current.mission_kind === "personal") {
        if (a.guild_id) throw new ApiError(400, "Personal missions cannot be assigned to a guild");
        if ((a.treasure_gp && a.treasure_gp > 0) || (a.treasure_sp && a.treasure_sp > 0) || (a.treasure_cp && a.treasure_cp > 0)) {
          throw new ApiError(400, "Personal missions cannot have treasure awards");
        }
        const updated = checked(await db.from("campaign_missions").update({ status: "completed", completed_at: new Date().toISOString(), completed_by_guild_id: null, treasure_gp: 0, treasure_sp: 0, treasure_cp: 0, updated_at: new Date().toISOString() }).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
        if (!updated) throw new ApiError(409, "Mission changed: read it again");
        return { mission: updated };
      }
      if (a.guild_id) { const guild = checked(await db.from("campaign_guilds").select("id").eq("id", a.guild_id).eq("campaign_id", a.campaign_id).maybeSingle()); if (!guild) throw new ApiError(404, "Guild not found"); }
      const updated = checked(await db.from("campaign_missions").update({ status: "completed", completed_at: new Date().toISOString(), completed_by_guild_id: a.guild_id ?? null, treasure_gp: a.treasure_gp ?? 0, treasure_sp: a.treasure_sp ?? 0, treasure_cp: a.treasure_cp ?? 0, updated_at: new Date().toISOString() }).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
      if (!updated) throw new ApiError(409, "Mission changed: read it again");
      if (a.guild_id && current.status !== "completed" && current.points_reward > 0) await adjustGuildScore(db, a.campaign_id, a.guild_id, current.points_reward);
      return { mission: updated };
    }
    if (current.status !== "completed") throw new ApiError(409, "Mission is not completed");
    const updated = checked(await db.from("campaign_missions").update({ status: "open", completed_at: null, completed_by_guild_id: null, treasure_gp: 0, treasure_sp: 0, treasure_cp: 0, updated_at: new Date().toISOString() }).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
    if (!updated) throw new ApiError(409, "Mission changed: read it again");
    if (current.mission_kind !== "personal" && current.completed_by_guild_id && current.points_reward > 0) {
      await adjustGuildScore(db, a.campaign_id, current.completed_by_guild_id, -current.points_reward);
    }
    return { mission: updated };
  }
  if (operation === "list_mission_encounters") {
    let request = db.from("mission_encounters").select("id,campaign_id,mission_id,name,notes,sort_order,created_at,updated_at").eq("campaign_id", a.campaign_id);
    if (a.mission_id) request = request.eq("mission_id", a.mission_id);
    return { encounters: checked(await request.order("sort_order", { ascending: true })) ?? [] };
  }
  if (operation === "create_mission_encounter") {
    await mission(db, a.campaign_id, a.mission_id);
    const encounter = checked(await db.from("mission_encounters").insert({ campaign_id: a.campaign_id, mission_id: a.mission_id, name: a.name.trim(), notes: a.notes?.trim() || null, sort_order: 0, updated_at: new Date().toISOString() }).select("*").single()); return { encounter };
  }
  if (["update_mission_encounter", "delete_mission_encounter", "replace_encounter_monsters"].includes(operation)) {
    const encounter = checked(await db.from("mission_encounters").select("id").eq("id", a.encounter_id).eq("campaign_id", a.campaign_id).maybeSingle()); if (!encounter) throw new ApiError(404, "Encounter not found");
    if (operation === "delete_mission_encounter") { checked(await db.from("mission_encounters").delete().eq("id", a.encounter_id).eq("campaign_id", a.campaign_id)); return { deleted_encounter_id: a.encounter_id }; }
    if (operation === "update_mission_encounter") return { encounter: checked(await db.from("mission_encounters").update({ name: a.name.trim(), notes: a.notes?.trim() || null, updated_at: new Date().toISOString() }).eq("id", a.encounter_id).eq("campaign_id", a.campaign_id).select("*").single()) };
    const ids = [...new Set(a.monsters.map((item: { wiki_entity_id: string }) => item.wiki_entity_id))];
    if (ids.length) { const valid = checked(await db.from("wiki_entities").select("id").eq("campaign_id", a.campaign_id).eq("type", "monster").in("id", ids)); if ((valid ?? []).length !== ids.length) throw new ApiError(400, "One or more monsters do not belong to this campaign"); }
    checked(await db.from("mission_encounter_monsters").delete().eq("encounter_id", a.encounter_id));
    if (a.monsters.length) checked(await db.from("mission_encounter_monsters").insert(a.monsters.map((item: { wiki_entity_id: string; quantity: number }, index: number) => ({ encounter_id: a.encounter_id, wiki_entity_id: item.wiki_entity_id, quantity: item.quantity, sort_order: index }))));
    return { encounter_id: a.encounter_id, monsters: a.monsters };
  }
  if (operation === "link_mission_resource") {
    const current = await mission(db, a.campaign_id, a.mission_id);
    const table = a.resource_type === "wiki" ? "wiki_entities" : a.resource_type === "exploration_map" ? "campaign_exploration_maps" : "campaign_scene_documents";
    const isUnlink = a.unlink === true || a.action === "unlink";
    const targetMissionId = isUnlink ? null : current.id;
    let query = db.from(table).update({ linked_mission_id: targetMissionId }).eq("id", a.resource_id).eq("campaign_id", a.campaign_id);
    if (isUnlink) {
      query = query.eq("linked_mission_id", current.id);
    }
    const linked = checked(await query.select("id,campaign_id,linked_mission_id").maybeSingle());
    if (!linked) throw new ApiError(404, "Resource not found");
    return { resource_type: a.resource_type, resource: linked, action: isUnlink ? "unlink" : "link" };
  }
  if (operation === "list_mission_resources") {
    const current = await mission(db, a.campaign_id, a.mission_id);
    const limit = a.limit ?? 50;
    const offset = a.offset ?? 0;
    const types = a.resource_type ? [a.resource_type] : ["wiki", "exploration_map", "scene"];
    const results: Array<{ resource_type: string; id: string; name: string; linked_mission_id: string }> = [];

    if (types.includes("wiki")) {
      const wikiRows = checked(await db.from("wiki_entities").select("id,name,linked_mission_id").eq("campaign_id", a.campaign_id).eq("linked_mission_id", current.id)) ?? [];
      for (const w of wikiRows) results.push({ resource_type: "wiki", id: w.id, name: w.name, linked_mission_id: w.linked_mission_id });
    }
    if (types.includes("exploration_map")) {
      const mapRows = checked(await db.from("campaign_exploration_maps").select("id,floor_label,linked_mission_id").eq("campaign_id", a.campaign_id).eq("linked_mission_id", current.id)) ?? [];
      for (const m of mapRows) results.push({ resource_type: "exploration_map", id: m.id, name: m.floor_label ?? "Mappa esplorazione", linked_mission_id: m.linked_mission_id });
    }
    if (types.includes("scene")) {
      const sceneRows = checked(await db.from("campaign_scene_documents").select("id,name,linked_mission_id").eq("campaign_id", a.campaign_id).eq("linked_mission_id", current.id)) ?? [];
      for (const s of sceneRows) results.push({ resource_type: "scene", id: s.id, name: s.name, linked_mission_id: s.linked_mission_id });
    }

    results.sort((left, right) => left.id.localeCompare(right.id));
    const paged = results.slice(offset, offset + limit);
    return {
      mission_id: current.id,
      campaign_id: a.campaign_id,
      mission_kind: current.mission_kind,
      resources: paged,
      total: results.length,
      offset,
      limit,
    };
  }
}
