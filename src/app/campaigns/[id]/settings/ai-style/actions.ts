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

export async function saveImageStylePromptAction(
  campaignId: string,
  _prevState: SaveImageStylePromptResult | null,
  formData: FormData
): Promise<SaveImageStylePromptResult> {
  const value = (formData.get("image_style_prompt") as string | null)?.trim() || null;
  if (!campaignId) return { success: false, message: "Campagna non valida." };

  const allowed = await canManageCampaign(campaignId);
  if (!allowed) return { success: false, message: "Non autorizzato." };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("campaigns")
      .update({ image_style_prompt: value, updated_at: new Date().toISOString() })
      .eq("id", campaignId);

    if (error) {
      return { success: false, message: error.message || "Errore salvataggio." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/settings/ai-style`);
    return { success: true, message: "Template stile visivo salvato." };
  } catch (err) {
    console.error("[saveImageStylePromptAction]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}
