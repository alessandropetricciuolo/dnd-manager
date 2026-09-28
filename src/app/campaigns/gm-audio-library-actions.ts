"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseGmAudioForgeLibrary } from "@/lib/gm-audio-forge/storage";
import type { GmAudioForgeLibrary } from "@/lib/gm-audio-forge/types";
import { isAllowedAudioUrl } from "@/lib/gm-audio-forge/url-validation";

async function authorized(campaignId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") return null;
  const { data: campaign } = await supabase.from("campaigns").select("id").eq("id", campaignId).maybeSingle();
  return campaign ? { supabase, userId: user.id } : null;
}

export async function loadGmCampaignAudioLibraryAction(campaignId: string): Promise<
  { success: true; library: GmAudioForgeLibrary | null } | { success: false; message: string }
> {
  const auth = await authorized(campaignId);
  if (!auth) return { success: false, message: "Accesso alla libreria audio negato." };
  const { data, error } = await (auth.supabase as unknown as SupabaseClient)
    .from("gm_campaign_audio_libraries")
    .select("library")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) return { success: false, message: error.message };
  const raw = (data as unknown as { library?: unknown } | null)?.library;
  return { success: true, library: raw ? parseGmAudioForgeLibrary(raw) : null };
}

export async function saveGmCampaignAudioLibraryAction(campaignId: string, library: GmAudioForgeLibrary): Promise<
  { success: true } | { success: false; message: string }
> {
  const auth = await authorized(campaignId);
  if (!auth) return { success: false, message: "Accesso alla libreria audio negato." };
  const parsed = parseGmAudioForgeLibrary(library);
  if (!parsed || JSON.stringify(parsed).length > 250_000 || parsed.categories.length > 100 ||
      parsed.categories.some((category) => category.tracks.length > 500 || category.tracks.some((track) => !isAllowedAudioUrl(track.url))) ||
      parsed.sfxPad.slots.some((slot) => slot.trackUrl && !isAllowedAudioUrl(slot.trackUrl))) {
    return { success: false, message: "Libreria audio non valida o troppo grande." };
  }
  const { error } = await (auth.supabase as unknown as SupabaseClient)
    .from("gm_campaign_audio_libraries")
    .upsert({ campaign_id: campaignId, library: parsed, updated_at: new Date().toISOString(), updated_by: auth.userId }, { onConflict: "campaign_id" });
  if (error) return { success: false, message: error.message };
  return { success: true };
}
