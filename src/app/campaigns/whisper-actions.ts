"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

type WhisperResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type WhisperPlayer = {
  id: string;
  label: string;
  avatar_url: string | null;
};

/** Lista giocatori della campagna (per Sussurri: GM vede giocatori con cui chattare). Stessa logica di eligible players + avatar. */
export async function getCampaignPlayersForWhispers(
  campaignId: string
): Promise<WhisperResult<WhisperPlayer[]>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { success: false, error: "Non autenticato." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) return { success: false, error: "Solo il GM può aprire i Sussurri." };

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("campaign_id", campaignId);
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const playerIds = new Set<string>();
  if (sessionIds.length > 0) {
    const { data: signups } = await supabase
      .from("session_signups")
      .select("player_id")
      .in("session_id", sessionIds)
      .in("status", ["approved", "attended"]);
    (signups ?? []).forEach((s) => playerIds.add(s.player_id));
  }
  const { data: members } = await supabase
    .from("campaign_members")
    .select("player_id")
    .eq("campaign_id", campaignId);
  (members ?? []).forEach((m) => playerIds.add(m.player_id));

  const ids = Array.from(playerIds);
  if (ids.length === 0) return { success: true, data: [] };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, display_name, avatar_url")
    .in("id", ids);

  const list: WhisperPlayer[] = (profiles ?? []).map(
    (p: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      display_name: string | null;
      avatar_url: string | null;
    }) => {
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      const label = full || p.display_name?.trim() || `Utente ${p.id.slice(0, 8)}`;
      return { id: p.id, label, avatar_url: p.avatar_url ?? null };
    }
  );
  list.sort((a, b) => a.label.localeCompare(b.label));
  return { success: true, data: list };
}

export type SecretWhisperRow = {
  id: string;
  campaign_id: string;
  sender_id: string;
  receiver_id: string;
  message: string | null;
  image_url: string | null;
  created_at: string;
};

/** Messaggi tra due utenti nella campagna (GM ↔ player). */
export async function getSecretWhispers(
  campaignId: string,
  currentUserId: string,
  otherUserId: string
): Promise<WhisperResult<SecretWhisperRow[]>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user || user.id !== currentUserId) {
    return { success: false, error: "Non autenticato." };
  }

  const { data, error } = await supabase
    .from("secret_whispers")
    .select("id, campaign_id, sender_id, receiver_id, message, image_url, created_at")
    .eq("campaign_id", campaignId)
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getSecretWhispers]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento." };
  }
  return { success: true, data: (data ?? []) as SecretWhisperRow[] };
}

/** Invia un sussurro (messaggio e/o immagine). image_url: stesso formato Wiki (es. /api/tg-image/xxx). */
export async function insertSecretWhisper(
  campaignId: string,
  receiverId: string,
  payload: { message?: string | null; image_url?: string | null }
): Promise<WhisperResult<SecretWhisperRow>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { success: false, error: "Non autenticato." };

  const hasMessage = payload.message != null && payload.message.trim() !== "";
  const hasImage = payload.image_url != null && payload.image_url.trim() !== "";
  if (!hasMessage && !hasImage) {
    return { success: false, error: "Inserisci un messaggio o un'immagine." };
  }

  const { data, error } = await supabase
    .from("secret_whispers")
    .insert({
      campaign_id: campaignId,
      sender_id: user.id,
      receiver_id: receiverId,
      message: hasMessage ? payload.message!.trim() : null,
      image_url: hasImage ? payload.image_url!.trim() : null,
    })
    .select("id, campaign_id, sender_id, receiver_id, message, image_url, created_at")
    .single();

  if (error) {
    console.error("[insertSecretWhisper]", error);
    return { success: false, error: error.message ?? "Errore nell'invio." };
  }
  return { success: true, data: data as SecretWhisperRow };
}
