import { createSupabaseServerClient } from "@/utils/supabase/server";

export type AvatarWithAchievement = {
  id: string;
  name: string;
  image_url: string;
  is_default: boolean;
  required_achievement_id: string | null;
  required_achievement_title: string | null;
};

export type AvatarGalleryData = {
  avatars: AvatarWithAchievement[];
  unlockedAchievementIds: string[];
};

/**
 * Per il selettore avatar in impostazioni giocatore: avatars con nome achievement richiesto
 * e lista id achievement sbloccati dall'utente.
 */
export async function getAvatarGalleryData(userId: string): Promise<AvatarGalleryData> {
  const supabase = await createSupabaseServerClient();

  const [avatarsRes, unlockedRes] = await Promise.all([
    supabase
      .from("avatars")
      .select("id, name, image_url, is_default, required_achievement_id, achievements ( title )")
      .order("created_at", { ascending: true }),
    supabase
      .from("player_achievements")
      .select("achievement_id")
      .eq("player_id", userId)
      .eq("is_unlocked", true),
  ]);

  const avatars: AvatarWithAchievement[] = (avatarsRes.data ?? []).map((row: Record<string, unknown>) => {
    const ach = row.achievements as { title?: string } | null;
    return {
      id: row.id as string,
      name: row.name as string,
      image_url: row.image_url as string,
      is_default: row.is_default as boolean,
      required_achievement_id: row.required_achievement_id as string | null,
      required_achievement_title: ach?.title ?? null,
    };
  });

  const unlockedAchievementIds: string[] = (unlockedRes.data ?? []).map(
    (r: { achievement_id: string }) => r.achievement_id
  );

  return { avatars, unlockedAchievementIds };
}
