import { createSupabaseServerClient } from "@/utils/supabase/server";
import type {
  TrophyUnlockedItem,
  TrophyInProgressItem,
  TrophyLockedItem,
} from "@/components/profile/player-trophy-board";

type AchievementRow = {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  points: number;
  is_incremental: boolean;
  max_progress: number;
};

type JoinedRaw = {
  achievement_id: string;
  current_progress: number;
  is_unlocked: boolean;
  unlocked_at: string | null;
  achievements: AchievementRow | AchievementRow[] | null;
};

export async function getTrophyDataForPlayer(playerId: string): Promise<{
  unlocked: TrophyUnlockedItem[];
  inProgress: TrophyInProgressItem[];
  locked: TrophyLockedItem[];
}> {
  const supabase = await createSupabaseServerClient();

  const { data: joinedRows } = await supabase
    .from("player_achievements")
    .select(
      `
      achievement_id,
      current_progress,
      is_unlocked,
      unlocked_at,
      achievements (
        id,
        title,
        description,
        icon_name,
        points,
        is_incremental,
        max_progress
      )
    `
    )
    .eq("player_id", playerId);

  const { data: allAchievementsRows } = await supabase
    .from("achievements")
    .select("id, title, description, icon_name, points, is_incremental, max_progress")
    .order("created_at", { ascending: true });

  const allAchievements = (allAchievementsRows ?? []) as AchievementRow[];
  const joinedRaw = (joinedRows ?? []) as JoinedRaw[];

  const unlocked: TrophyUnlockedItem[] = [];
  const inProgress: TrophyInProgressItem[] = [];
  const locked: TrophyLockedItem[] = [];
  const seenAchIds = new Set<string>();

  for (const row of joinedRaw) {
    const ach = Array.isArray(row.achievements) ? row.achievements[0] ?? null : row.achievements;
    if (!ach) continue;
    seenAchIds.add(ach.id);
    if (row.is_unlocked && row.unlocked_at) {
      unlocked.push({ ...ach, unlocked_at: row.unlocked_at });
    } else if (
      ach.is_incremental &&
      row.current_progress > 0 &&
      !row.is_unlocked
    ) {
      const maxP = ach.max_progress > 0 ? ach.max_progress : 1;
      inProgress.push({ ...ach, current_progress: row.current_progress, max_progress: maxP });
    } else if (!row.is_unlocked && row.current_progress === 0) {
      locked.push(ach);
    }
  }

  for (const ach of allAchievements) {
    if (!seenAchIds.has(ach.id)) locked.push(ach);
  }

  unlocked.sort(
    (a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime()
  );

  return { unlocked, inProgress, locked };
}
