import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { sendEmail, wrapInParchmentTemplate } from "@/lib/email";

type JoinSettingsRow = {
  join_enabled: boolean;
  join_subject: string;
  join_body_html: string;
};

async function getAuthEmailMap(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const authUsersMap = new Map<string, string>();
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message || "Errore lettura utenti auth.");
    const users = data?.users ?? [];
    for (const u of users) {
      const email = u.email?.trim();
      if (u.id && email) authUsersMap.set(u.id, email);
    }
    if (users.length < 1000) break;
    page += 1;
  }
  return authUsersMap;
}

export async function sendJoinCampaignEmailIfEnabled(
  campaignId: string,
  playerId: string
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: rowRaw } = await admin
    .from("campaign_email_settings")
    .select("join_enabled, join_subject, join_body_html")
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const row = rowRaw as JoinSettingsRow | null;
  if (!row || !row.join_enabled) return;

  const emails = await getAuthEmailMap(admin);
  const email = emails.get(playerId);
  if (!email) return;

  await sendEmail({
    to: email,
    subject: row.join_subject,
    html: wrapInParchmentTemplate(row.join_body_html, row.join_subject),
  });
}

export async function sendBulkTemplateToCampaignMembers(
  campaignId: string,
  templateId: string
): Promise<{ sent: number; skippedNoEmail: number; failed: number }> {
  const admin = createSupabaseAdminClient();

  const { data: tplRaw, error: tplError } = await admin
    .from("campaign_bulk_email_templates")
    .select("subject, body_html")
    .eq("id", templateId)
    .eq("campaign_id", campaignId)
    .single();
  if (tplError || !tplRaw) throw new Error(tplError?.message || "Template non trovato.");

  const template = tplRaw as { subject: string; body_html: string };
  const { data: membersRaw, error: membersError } = await admin
    .from("campaign_members")
    .select("player_id")
    .eq("campaign_id", campaignId);
  if (membersError) throw new Error(membersError.message || "Errore lettura membri campagna.");

  const memberIds = Array.from(
    new Set(((membersRaw ?? []) as Array<{ player_id: string }>).map((m) => m.player_id))
  );
  if (memberIds.length === 0) return { sent: 0, skippedNoEmail: 0, failed: 0 };

  const emails = await getAuthEmailMap(admin);

  let sent = 0;
  let skippedNoEmail = 0;
  let failed = 0;
  for (const playerId of memberIds) {
    const email = emails.get(playerId);
    if (!email) {
      skippedNoEmail += 1;
      continue;
    }
    const ok = await sendEmail({
      to: email,
      subject: template.subject,
      html: wrapInParchmentTemplate(template.body_html, template.subject),
    });
    if (ok) sent += 1;
    else failed += 1;
  }

  return { sent, skippedNoEmail, failed };
}

