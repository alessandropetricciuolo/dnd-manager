"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type DiscoverPortalResult =
  | { success: true }
  | { success: false; message: string };
export type DeletePortalResult =
  | { success: true }
  | { success: false; message: string };

async function isGmOrAdminByRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "gm" || profile?.role === "admin";
}

async function canManageCampaign(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string
): Promise<boolean> {
  if (await isGmOrAdminByRole(supabase)) return true;
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return campaign?.gm_id === user?.id;
}

/**
 * Registra un portale scoperto (fast travel). Richiede sessione GM/Admin o GM della campagna.
 */
export async function discoverPortalAction(
  campaignId: string,
  name: string,
  x: number,
  y: number
): Promise<DiscoverPortalResult> {
  const trimmed = name.trim();
  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }
  if (!trimmed) {
    return { success: false, message: "Inserisci un nome per il portale." };
  }

  const posX = Math.trunc(x);
  const posY = Math.trunc(y);

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await canManageCampaign(supabase, campaignId);
    if (!allowed) {
      return { success: false, message: "Non autorizzato." };
    }

    const { error } = await supabase.from("portals").insert({
      campaign_id: campaignId,
      name: trimmed,
      pos_x_grid: posX,
      pos_y_grid: posY,
    });

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}

/**
 * Elimina un portale esistente dalla campagna.
 */
export async function deletePortalAction(
  campaignId: string,
  portalId: string
): Promise<DeletePortalResult> {
  if (!campaignId || !portalId) {
    return { success: false, message: "Dati portale non validi." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await canManageCampaign(supabase, campaignId);
    if (!allowed) {
      return { success: false, message: "Non autorizzato." };
    }

    const { error } = await supabase
      .from("portals")
      .delete()
      .eq("id", portalId)
      .eq("campaign_id", campaignId);

    if (error) {
      return { success: false, message: error.message };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore sconosciuto.";
    return { success: false, message: msg };
  }
}
