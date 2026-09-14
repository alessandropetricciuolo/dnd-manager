import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, type Operation } from "./contracts";
import { rankFromPoints } from "@/lib/missions/guild-ranks";

const columns = "id,campaign_id,grade,title,committente,ubicazione,paga,urgenza,description,status,points_reward,completed_at,completed_by_guild_id,treasure_gp,treasure_sp,treasure_cp,created_at,updated_at";
const missionOperations = new Set<Operation>(["search_missions", "get_mission", "create_mission", "update_mission", "set_mission_status", "complete_mission", "reopen_mission", "delete_mission", "list_mission_encounters", "create_mission_encounter", "update_mission_encounter", "delete_mission_encounter", "replace_encounter_monsters", "link_mission_resource"]);

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
    if (a.status) request = request.eq("status", a.status);
    const term = (a.query ?? "").replace(new RegExp("[^\\p{L}\\p{N}\\s-]", "gu"), " ").trim();
    if (term) request = request.or(`title.ilike.%${term}%,committente.ilike.%${term}%,ubicazione.ilike.%${term}%,description.ilike.%${term}%`);
    return { missions: checked(await request.order("created_at", { ascending: false }).range(offset, offset + limit - 1)) ?? [], offset, limit };
  }
  if (operation === "get_mission") return { mission: await mission(db, a.campaign_id, a.mission_id) };
  if (operation === "create_mission") {
    const title = a.title.trim();
    const duplicate = checked(await db.from("campaign_missions").select("id,title").eq("campaign_id", a.campaign_id).ilike("title", title).limit(1).maybeSingle());
    if (duplicate) throw new ApiError(409, `Mission already exists: ${duplicate.title} (${duplicate.id})`);
    const result = await db.from("campaign_missions").insert({ campaign_id: a.campaign_id, grade: a.grade.trim(), title, committente: a.committente.trim(), ubicazione: a.ubicazione.trim(), paga: a.paga.trim(), urgenza: a.urgenza.trim(), description: a.description.trim(), points_reward: a.points_reward ?? 0, status: "open", updated_at: new Date().toISOString() }).select(columns).single();
    if ((result.error as { code?: string } | null)?.code === "23505") throw new ApiError(409, "A mission with this title already exists");
    return { mission: checked(result) };
  }
  if (operation === "update_mission") {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ["grade", "title", "committente", "ubicazione", "paga", "urgenza", "description"]) if (a[key] !== undefined) patch[key] = a[key].trim();
    if (a.points_reward !== undefined) patch.points_reward = a.points_reward;
    const updated = checked(await db.from("campaign_missions").update(patch).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
    if (!updated) throw new ApiError(409, "Mission changed: read it again"); return { mission: updated };
  }
  if (["set_mission_status", "complete_mission", "reopen_mission", "delete_mission"].includes(operation)) {
    const current = await mission(db, a.campaign_id, a.mission_id);
    if (current.updated_at !== a.expected_updated_at) throw new ApiError(409, "Mission changed: read it again");
    if (operation === "delete_mission") {
      const deleted = checked(await db.from("campaign_missions").delete().eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select("id").maybeSingle());
      if (!deleted) throw new ApiError(409, "Mission changed: read it again");
      if (current.status === "completed" && current.completed_by_guild_id && current.points_reward > 0) await adjustGuildScore(db, a.campaign_id, current.completed_by_guild_id, -current.points_reward);
      return { deleted_mission_id: a.mission_id };
    }
    if (operation === "set_mission_status") {
      if (current.status === "completed") throw new ApiError(409, "Reopen the completed mission first");
      const updated = checked(await db.from("campaign_missions").update({ status: a.status, completed_at: null, completed_by_guild_id: null, updated_at: new Date().toISOString() }).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
      if (!updated) throw new ApiError(409, "Mission changed: read it again"); return { mission: updated };
    }
    if (operation === "complete_mission") {
      if (a.guild_id) { const guild = checked(await db.from("campaign_guilds").select("id").eq("id", a.guild_id).eq("campaign_id", a.campaign_id).maybeSingle()); if (!guild) throw new ApiError(404, "Guild not found"); }
      const updated = checked(await db.from("campaign_missions").update({ status: "completed", completed_at: new Date().toISOString(), completed_by_guild_id: a.guild_id ?? null, treasure_gp: a.treasure_gp ?? 0, treasure_sp: a.treasure_sp ?? 0, treasure_cp: a.treasure_cp ?? 0, updated_at: new Date().toISOString() }).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
      if (!updated) throw new ApiError(409, "Mission changed: read it again");
      if (a.guild_id && current.status !== "completed" && current.points_reward > 0) await adjustGuildScore(db, a.campaign_id, a.guild_id, current.points_reward);
      return { mission: updated };
    }
    if (current.status !== "completed") throw new ApiError(409, "Mission is not completed");
    const updated = checked(await db.from("campaign_missions").update({ status: "open", completed_at: null, completed_by_guild_id: null, treasure_gp: 0, treasure_sp: 0, treasure_cp: 0, updated_at: new Date().toISOString() }).eq("id", a.mission_id).eq("campaign_id", a.campaign_id).eq("updated_at", a.expected_updated_at).select(columns).maybeSingle());
    if (!updated) throw new ApiError(409, "Mission changed: read it again");
    if (current.completed_by_guild_id && current.points_reward > 0) await adjustGuildScore(db, a.campaign_id, current.completed_by_guild_id, -current.points_reward);
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
  const current = await mission(db, a.campaign_id, a.mission_id);
  const table = a.resource_type === "wiki" ? "wiki_entities" : a.resource_type === "exploration_map" ? "campaign_exploration_maps" : "campaign_scene_documents";
  const linked = checked(await db.from(table).update({ linked_mission_id: current.id }).eq("id", a.resource_id).eq("campaign_id", a.campaign_id).select("id,campaign_id,linked_mission_id").maybeSingle());
  if (!linked) throw new ApiError(404, "Resource not found"); return { resource_type: a.resource_type, resource: linked };
}
