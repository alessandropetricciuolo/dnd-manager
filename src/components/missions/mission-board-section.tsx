import { createSupabaseServerClient } from "@/utils/supabase/server";
import { MissionBoard } from "./mission-board";

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
};

export async function MissionBoardSection({
  campaignId,
  isGmOrAdmin,
}: MissionBoardSectionProps) {
  const supabase = await createSupabaseServerClient();

  const [{ data: missionsRaw }, { data: guildsRaw }] = await Promise.all([
    supabase.from("campaign_missions").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: false }),
    supabase.from("campaign_guilds").select("*").eq("campaign_id", campaignId).order("score", { ascending: false }),
  ]);

  const guilds = (guildsRaw ?? []).map((row) => {
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

  const missions = (missionsRaw ?? []).map((row) => {
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
    } satisfies MissionBoardMission;
  });

  return (
    <MissionBoard
      campaignId={campaignId}
      missions={missions}
      guilds={guilds}
      isGmOrAdmin={isGmOrAdmin}
    />
  );
}
