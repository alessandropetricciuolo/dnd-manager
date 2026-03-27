"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { sendEmail, wrapInTemplate } from "@/lib/email";

type ActionResult = { success: true; message: string } | { success: false; message: string };

type RecipientRow = {
  id: string;
  player_id: string;
  recipient_email: string | null;
  status: "pending" | "sent" | "failed" | "skipped_no_email";
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

async function ensureAdmin(): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Non autenticato." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, message: "Solo admin." };
  return { ok: true, userId: user.id };
}

async function getPlayersWithEmails() {
  const admin = createSupabaseAdminClient();
  const { data: profilesRaw, error: profilesError } = await admin
    .from("profiles")
    .select("id, display_name, first_name, last_name, role")
    .eq("role", "player");
  if (profilesError) {
    throw new Error(profilesError.message || "Errore caricamento giocatori.");
  }

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

  const profiles = (profilesRaw ?? []) as Array<{
    id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string;
  }>;
  return profiles.map((p) => ({
    player_id: p.id,
    display_name:
      p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Giocatore",
    email: authUsersMap.get(p.id) ?? null,
  }));
}

export async function createAdminCommunicationDraftAction(
  subject: string,
  bodyHtml: string
): Promise<ActionResult & { communicationId?: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const safeSubject = subject.trim();
  const safeBody = bodyHtml.trim();
  if (!safeSubject) return { success: false, message: "Oggetto obbligatorio." };
  if (!safeBody) return { success: false, message: "Corpo HTML obbligatorio." };

  try {
    const admin = createSupabaseAdminClient();
    const { data: communicationRawData, error: insertCommError } = await admin
      .from("admin_communications")
      .insert({
        subject: safeSubject,
        body_html: safeBody,
        created_by: auth.userId,
      } as never)
      .select("id")
      .single();
    const communicationRaw = communicationRawData as { id: string } | null;
    if (insertCommError || !communicationRaw?.id) {
      return { success: false, message: insertCommError?.message || "Errore creazione comunicazione." };
    }

    const players = await getPlayersWithEmails();
    if (players.length > 0) {
      const recipientsPayload = players.map((p) => ({
        communication_id: communicationRaw.id,
        player_id: p.player_id,
        recipient_email: p.email,
        status: (p.email ? "pending" : "skipped_no_email") as
          | "pending"
          | "sent"
          | "failed"
          | "skipped_no_email",
      }));
      const { error: recipientsError } = await admin
        .from("admin_communication_recipients")
        .insert(recipientsPayload as never);
      if (recipientsError) {
        return { success: false, message: recipientsError.message || "Errore creazione destinatari." };
      }
    }

    revalidatePath("/admin/communications");
    return {
      success: true,
      message: "Comunicazione creata in archivio.",
      communicationId: communicationRaw.id,
    };
  } catch (err) {
    console.error("[createAdminCommunicationDraftAction]", err);
    return { success: false, message: "Errore imprevisto durante la creazione." };
  }
}

export async function sendAdminCommunicationAction(
  communicationId: string,
  onlyPending = true
): Promise<ActionResult> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  if (!communicationId) return { success: false, message: "Comunicazione non valida." };

  try {
    const admin = createSupabaseAdminClient();
    const { data: commRawData, error: commErr } = await admin
      .from("admin_communications")
      .select("id, subject, body_html")
      .eq("id", communicationId)
      .single();
    const commRaw = commRawData as { id: string; subject: string; body_html: string } | null;
    if (commErr || !commRaw) return { success: false, message: commErr?.message || "Comunicazione non trovata." };

    const recipientsQuery = admin
      .from("admin_communication_recipients")
      .select("id, player_id, recipient_email, status, sent_at, last_error, created_at, updated_at")
      .eq("communication_id", communicationId);
    const { data: recipientsRaw, error: recipientsError } = onlyPending
      ? await recipientsQuery.in("status", ["pending", "failed"])
      : await recipientsQuery.neq("status", "skipped_no_email");
    if (recipientsError) return { success: false, message: recipientsError.message || "Errore destinatari." };

    const recipients = (recipientsRaw ?? []) as RecipientRow[];
    if (recipients.length === 0) {
      return { success: true, message: "Nessun destinatario da inviare/reinoltrare." };
    }

    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      const email = recipient.recipient_email?.trim();
      if (!email) continue;

      const ok = await sendEmail({
        to: email,
        subject: commRaw.subject,
        html: wrapInTemplate(commRaw.body_html),
      });

      if (ok) {
        sent += 1;
        await admin
          .from("admin_communication_recipients")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            last_error: null,
          } as never)
          .eq("id", recipient.id);
      } else {
        failed += 1;
        await admin
          .from("admin_communication_recipients")
          .update({
            status: "failed",
            last_error: "Invio fallito (controlla configurazione SMTP/Gmail).",
          } as never)
          .eq("id", recipient.id);
      }
    }

    revalidatePath("/admin/communications");
    return {
      success: true,
      message: `Invio completato. Inviate: ${sent}. Fallite: ${failed}.`,
    };
  } catch (err) {
    console.error("[sendAdminCommunicationAction]", err);
    return { success: false, message: "Errore imprevisto durante l'invio." };
  }
}

export async function getAdminCommunicationRecipientsAction(
  communicationId: string
): Promise<{ success: true; data: Array<RecipientRow & { player_name: string }> } | { success: false; message: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  if (!communicationId) return { success: false, message: "Comunicazione non valida." };

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("admin_communication_recipients")
      .select("id, player_id, recipient_email, status, sent_at, last_error, created_at, updated_at")
      .eq("communication_id", communicationId)
      .order("created_at", { ascending: true });
    if (error) return { success: false, message: error.message || "Errore caricamento destinatari." };

    const recipients = (data ?? []) as RecipientRow[];
    const playerIds = Array.from(new Set(recipients.map((r) => r.player_id)));
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, first_name, last_name")
      .in("id", playerIds);
    const nameById = new Map(
      ((profiles ?? []) as Array<{ id: string; display_name: string | null; first_name: string | null; last_name: string | null }>).map((p) => [
        p.id,
        p.display_name || [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || "Giocatore",
      ])
    );

    return {
      success: true,
      data: recipients.map((r) => ({ ...r, player_name: nameById.get(r.player_id) ?? "Giocatore" })),
    };
  } catch (err) {
    console.error("[getAdminCommunicationRecipientsAction]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}
