"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { extractSpotifyPlaylistId } from "@/lib/spotify/playlist-id";
import type { GmSpotifyPlaylistRow } from "@/lib/spotify/types";

async function ensureAdmin(): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Non autenticato." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, message: "Solo admin." };
  return { ok: true, userId: user.id };
}

export async function listAdminSpotifyPlaylistsAction(): Promise<
  { success: true; data: GmSpotifyPlaylistRow[] } | { success: false; message: string }
> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gm_spotify_playlists")
    .select("id, title, mood, spotify_playlist_id, created_at")
    .order("created_at", { ascending: false });
  if (error) return { success: false, message: error.message };
  return { success: true, data: (data ?? []) as GmSpotifyPlaylistRow[] };
}

export async function createAdminSpotifyPlaylistAction(payload: {
  title: string;
  mood: string;
  spotifyUrlOrUri: string;
}): Promise<{ success: true; id: string } | { success: false; message: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const title = payload.title.trim();
  if (!title) return { success: false, message: "Titolo obbligatorio." };
  const pid = extractSpotifyPlaylistId(payload.spotifyUrlOrUri);
  if (!pid) {
    return {
      success: false,
      message: "URL o URI Spotify non valido. Incolla un link tipo open.spotify.com/playlist/… o spotify:playlist:…",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gm_spotify_playlists")
    .insert({
      title,
      mood: payload.mood.trim(),
      spotify_playlist_id: pid,
      created_by: auth.userId,
    } as never)
    .select("id")
    .single();

  const row = data as { id: string } | null;
  if (error) {
    if (error.code === "23505") {
      return { success: false, message: "Questa playlist è già in elenco." };
    }
    return { success: false, message: error.message };
  }
  if (!row?.id) return { success: false, message: "Errore salvataggio." };
  return { success: true, id: row.id };
}

export async function deleteAdminSpotifyPlaylistAction(
  id: string
): Promise<{ success: true } | { success: false; message: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("gm_spotify_playlists").delete().eq("id", id);
  if (error) return { success: false, message: error.message };
  return { success: true };
}
