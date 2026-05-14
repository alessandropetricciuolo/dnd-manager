"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { GmSpotifyPlaylistRow } from "@/lib/spotify/types";

export async function listSpotifyPlaylistsForGmAction(): Promise<
  { success: true; data: GmSpotifyPlaylistRow[] } | { success: false; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { success: false, message: "Non autenticato." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { success: false, message: "Solo master o admin." };
  }

  const { data, error } = await supabase
    .from("gm_spotify_playlists")
    .select("id, title, mood, spotify_playlist_id, created_at")
    .order("title", { ascending: true });

  if (error) return { success: false, message: error.message };
  return { success: true, data: (data ?? []) as GmSpotifyPlaylistRow[] };
}
