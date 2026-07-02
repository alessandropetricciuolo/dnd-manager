import { createSupabaseServerClient } from "@/utils/supabase/server";

export type CampaignSheetExportAuth =
  | { ok: true; title: string }
  | { ok: false; status: number; message: string };

/** GM/Admin (guild) possono esportare le schede PDF di qualsiasi campagna. */
export async function ensureCampaignSheetExportAccess(
  campaignId: string
): Promise<CampaignSheetExportAuth> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, status: 401, message: "Non autenticato." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) {
    return { ok: false, status: 403, message: "Solo GM e admin possono scaricare le schede." };
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, name")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) {
    console.error("[ensureCampaignSheetExportAccess] campaign lookup:", campaignError.message);
    return { ok: false, status: 500, message: "Errore lettura campagna." };
  }
  if (!campaign) {
    return { ok: false, status: 404, message: "Campagna non trovata." };
  }

  return { ok: true, title: campaign.name?.trim() || "campagna" };
}
