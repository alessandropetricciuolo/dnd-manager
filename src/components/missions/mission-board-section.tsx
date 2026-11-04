import { createSupabaseServerClient } from "@/utils/supabase/server";
import { MissionBoard } from "./mission-board";
import { canManageCampaignPersonalMissions } from "@/lib/actions/mission-actions";

export type MissionBoardMission = {
  id: string;
  grade: string;
  title: string;
  committente: string;
  ubicazione: string;
  paga: string;
  urgenza: string;
  description: string;
  status?: string;
  points_reward?: number;
  completed_at?: string | null;
  completed_by_guild_id?: string | null;
  completed_by_guild_name?: string | null;
  treasure_gp?: number;
  treasure_sp?: number;
  treasure_cp?: number;
  mission_kind?: "organization" | "personal";
};

export type PersonalMission = {
  id: string;
  title: string;
  description: string;
  committente?: string | null;
  ubicazione?: string | null;
  urgenza?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LinkedWikiEntity = {
  id: string;
  name: string;
  type: string;
  linked_mission_id: string | null;
};

export type MissionBoardGuild = {
  id: string;
  name: string;
  /** Rango lettera D–S (dopo migration). Fallback legacy: assente. */
  rank?: string;
  score: number;
  auto_rank?: boolean;
};

type MissionBoardSectionProps = {
  campaignId: string;
  isGmOrAdmin: boolean;
  isAdmin: boolean;
  hideHeaderActions?: boolean;
  isProjection?: boolean;
};

export async function MissionBoardSection({
  campaignId,
  isGmOrAdmin,
  isAdmin,
  hideHeaderActions = false,
  isProjection = false,
}: MissionBoardSectionProps) {
  const supabase = await createSupabaseServerClient();

  const canManagePersonal = !isProjection && isGmOrAdmin;

  const [missionsRawResult, guildsRawResult, personalMissionsResult, linkedWikiResult] =
    await Promise.all([
      supabase
        .from("campaign_missions")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("mission_kind", "organization")
        .order("created_at", { ascending: false }),
      supabase
        .from("campaign_guilds")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("score", { ascending: false }),
      canManagePersonal
        ? supabase
            .from("campaign_missions")
            .select("id, title, description, committente, ubicazione, urgenza, status, created_at, updated_at")
            .eq("campaign_id", campaignId)
            .eq("mission_kind", "personal")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      canManagePersonal
        ? supabase
            .from("wiki_entities")
            .select("id, name, type, linked_mission_id")
            .eq("campaign_id", campaignId)
            .not("linked_mission_id", "is", null)
        : Promise.resolve({ data: [] }),
    ]);

  const missionsRaw = missionsRawResult.data ?? [];
  const guildsRaw = guildsRawResult.data ?? [];
  const personalRaw = (personalMissionsResult.data ?? []) as Record<string, unknown>[];
  const linkedWikiRaw = (linkedWikiResult.data ?? []) as Record<string, unknown>[];

  const guilds = guildsRaw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      name: String(r.name ?? ""),
      rank: typeof r.rank === "string" ? r.rank : undefined,
      score: typeof r.score === "number" ? r.score : Number(r.score ?? 0) || 0,
      auto_rank: r.auto_rank !== false,
    };
  }) as MissionBoardGuild[];
  const guildNameById = new Map(guilds.map((g) => [g.id, g.name]));

  const missions = missionsRaw.map((row) => {
    const m = row as Record<string, unknown>;
    const gid = m.completed_by_guild_id != null ? String(m.completed_by_guild_id) : null;
    const pts = m.points_reward;
    const tg = m.treasure_gp;
    const ts = m.treasure_sp;
    const tc = m.treasure_cp;
    return {
      id: String(m.id),
      grade: String(m.grade ?? ""),
      title: String(m.title ?? ""),
      committente: String(m.committente ?? ""),
      ubicazione: String(m.ubicazione ?? ""),
      paga: String(m.paga ?? ""),
      urgenza: String(m.urgenza ?? ""),
      description: String(m.description ?? ""),
      status: typeof m.status === "string" ? m.status : "open",
      points_reward: typeof pts === "number" ? pts : Number(pts ?? 0) || 0,
      completed_at: m.completed_at != null ? String(m.completed_at) : null,
      completed_by_guild_id: gid,
      completed_by_guild_name: gid ? (guildNameById.get(gid) ?? null) : null,
      treasure_gp: typeof tg === "number" ? tg : Number(tg ?? 0) || 0,
      treasure_sp: typeof ts === "number" ? ts : Number(ts ?? 0) || 0,
      treasure_cp: typeof tc === "number" ? tc : Number(tc ?? 0) || 0,
      mission_kind: "organization",
    } satisfies MissionBoardMission;
  });

  const personalMissions: PersonalMission[] = personalRaw.map((m) => ({
    id: String(m.id),
    title: String(m.title ?? ""),
    description: String(m.description ?? ""),
    committente: m.committente != null ? String(m.committente) : null,
    ubicazione: m.ubicazione != null ? String(m.ubicazione) : null,
    urgenza: m.urgenza != null ? String(m.urgenza) : null,
    status: typeof m.status === "string" ? m.status : "open",
    created_at: m.created_at != null ? String(m.created_at) : null,
    updated_at: m.updated_at != null ? String(m.updated_at) : null,
  }));

  const linkedWikiEntities: LinkedWikiEntity[] = linkedWikiRaw.map((w) => ({
    id: String(w.id),
    name: String(w.name ?? ""),
    type: String(w.type ?? ""),
    linked_mission_id: w.linked_mission_id != null ? String(w.linked_mission_id) : null,
  }));

  return (
    <MissionBoard
      campaignId={campaignId}
      missions={missions}
      guilds={guilds}
      isGmOrAdmin={isGmOrAdmin}
      isAdmin={isAdmin}
      hideHeaderActions={hideHeaderActions}
      isProjection={isProjection}
      personalMissions={personalMissions}
      linkedWikiEntities={linkedWikiEntities}
      canManagePersonalMissions={canManagePersonal}
    />
  );
}
