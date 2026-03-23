'use server';

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type SaveImageStylePromptResult =
  | { success: true; message: string }
  | { success: false; message: string };

async function canManageCampaign(campaignId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
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

  if (profile?.role === "admin") return true;

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("gm_id")
    .eq("id", campaignId)
    .single();

  return profile?.role === "gm" && campaign?.gm_id === user.id;
}

export async function saveCampaignImageStyleAction(
  campaignId: string,
  _prevState: SaveImageStylePromptResult | null,
  formData: FormData
): Promise<SaveImageStylePromptResult> {
  const value = (formData.get("ai_image_style_key") as string | null)?.trim() || null;
  if (!campaignId) return { success: false, message: "Campagna non valida." };

  const allowed = await canManageCampaign(campaignId);
  if (!allowed) return { success: false, message: "Non autorizzato." };

  try {
    const supabase = await createSupabaseServerClient();
    let { error } = await supabase
      .from("campaigns")
      .update({ ai_image_style_key: value, updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    if (error?.message?.toLowerCase().includes("ai_image_style_key")) {
      return {
        success: false,
        message:
          "La colonna ai_image_style_key non è ancora disponibile su questo database. Esegui la nuova migration SQL e riprova.",
      };
    }

    if (error) {
      return { success: false, message: error.message || "Errore salvataggio." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/settings/ai-style`);
    return { success: true, message: "Stile immagini globale associato alla campagna." };
  } catch (err) {
    console.error("[saveCampaignImageStyleAction]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}
