"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

type ActionResult = { success: true; message: string } | { success: false; message: string };

async function ensureAdmin(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Non autenticato." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { ok: false, message: "Solo admin." };
  return { ok: true };
}

export async function addPlayerPlayedCampaignAction(
  playerId: string,
  campaignId: string
): Promise<ActionResult> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  if (!playerId || !campaignId) return { success: false, message: "Player o campagna non validi." };

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("campaign_members")
    .select("id")
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (existing) return { success: true, message: "Già presente tra le campagne giocate." };

  const { error } = await admin.from("campaign_members").insert({
    player_id: playerId,
    campaign_id: campaignId,
  } as never);
  if (error) return { success: false, message: error.message || "Errore durante l'aggiunta." };

  revalidatePath("/admin/player-campaigns");
  revalidatePath("/profile");
  return { success: true, message: "Campagna aggiunta al giocatore." };
}

export async function removePlayerPlayedCampaignAction(
  playerId: string,
  campaignId: string
): Promise<ActionResult> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  if (!playerId || !campaignId) return { success: false, message: "Player o campagna non validi." };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("campaign_members")
    .delete()
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId);
  if (error) return { success: false, message: error.message || "Errore durante la rimozione." };

  revalidatePath("/admin/player-campaigns");
  revalidatePath("/profile");
  return { success: true, message: "Campagna rimossa dal giocatore." };
}
