"use server";

import { revalidatePath } from "next/cache";
import { getRequestAuthContext } from "@/utils/supabase/request-auth-context";

export async function setCampaignDocument(entityId: string, campaignId: string, document: boolean, updatedAt: string) {
  const { supabase, user, profile } = await getRequestAuthContext();
  if (!user || profile?.role !== "admin") return { success: false, message: "Operazione riservata all'Admin." };
  const { data, error } = await supabase.from("wiki_entities")
    .update({ is_campaign_document: document, ...(document ? { admin_only: true } : {}) })
    .eq("id", entityId).eq("campaign_id", campaignId).eq("updated_at", updatedAt)
    .select("id").maybeSingle();
  if (error) return { success: false, message: "Impossibile cambiare la collocazione del documento." };
  if (!data) return { success: false, message: "La voce è cambiata. Ricarica prima di riprovare." };
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/documenti`);
  revalidatePath(`/campaigns/${campaignId}/wiki/${entityId}`);
  return { success: true, message: document ? "Voce spostata nei Documenti di campagna." : "Voce riportata nella Wiki. Resta riservata all'Admin." };
}
