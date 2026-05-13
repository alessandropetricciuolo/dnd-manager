"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { GmGlobalAudioRow } from "@/lib/gm-global-audio/types";

export async function listGlobalAudioLibraryForGmAction(): Promise<
  { success: true; data: GmGlobalAudioRow[] } | { success: false; message: string }
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
    .from("gm_global_audio_tracks")
    .select("id, title, audio_type, mood, storage_key, public_url, mime_type, file_size_bytes, created_at")
    .order("audio_type", { ascending: true })
    .order("title", { ascending: true });

  if (error) return { success: false, message: error.message };
  return { success: true, data: (data ?? []) as GmGlobalAudioRow[] };
}
