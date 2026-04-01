"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { sendBulkTemplateToCampaignMembers } from "@/lib/campaign-long-emails";

export type CampaignEmailActionResult =
  | { success: true; message: string }
  | { success: false; message: string };

async function ensureGmOrAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false as const, message: "Non autenticato." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { ok: false as const, message: "Solo GM/Admin." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

export async function saveJoinEmailTemplateAction(
  campaignId: string,
  joinEnabled: boolean,
  subject: string,
  bodyHtml: string
): Promise<CampaignEmailActionResult> {
  const auth = await ensureGmOrAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const safeSubject = subject.trim();
  const safeBody = bodyHtml.trim();
  if (!campaignId) return { success: false, message: "Campagna non valida." };
  if (!safeSubject) return { success: false, message: "Oggetto obbligatorio." };
  if (!safeBody) return { success: false, message: "Corpo HTML obbligatorio." };

  const { error } = await auth.supabase.from("campaign_email_settings").upsert(
    {
      campaign_id: campaignId,
      join_enabled: joinEnabled,
      join_subject: safeSubject,
      join_body_html: safeBody,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "campaign_id" }
  );
  if (error) return { success: false, message: error.message || "Errore salvataggio template." };

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, message: "Template iscrizione salvato." };
}

export async function createBulkEmailTemplateAction(
  campaignId: string,
  subject: string,
  bodyHtml: string
): Promise<CampaignEmailActionResult & { templateId?: string }> {
  const auth = await ensureGmOrAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const safeSubject = subject.trim();
  const safeBody = bodyHtml.trim();
  if (!campaignId) return { success: false, message: "Campagna non valida." };
  if (!safeSubject) return { success: false, message: "Oggetto obbligatorio." };
  if (!safeBody) return { success: false, message: "Corpo HTML obbligatorio." };

  const { data, error } = await auth.supabase
    .from("campaign_bulk_email_templates")
    .insert({
      campaign_id: campaignId,
      subject: safeSubject,
      body_html: safeBody,
      created_by: auth.userId,
    })
    .select("id")
    .single();
  if (error || !data) return { success: false, message: error?.message || "Errore creazione template." };

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, message: "Template massivo salvato.", templateId: data.id };
}

export async function sendBulkEmailTemplateAction(
  campaignId: string,
  templateId: string
): Promise<CampaignEmailActionResult> {
  const auth = await ensureGmOrAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  if (!campaignId || !templateId) return { success: false, message: "Template non valido." };

  try {
    const stats = await sendBulkTemplateToCampaignMembers(campaignId, templateId);
    return {
      success: true,
      message: `Invio completato. Inviate: ${stats.sent}, senza email: ${stats.skippedNoEmail}, fallite: ${stats.failed}.`,
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Errore invio massivo." };
  }
}

