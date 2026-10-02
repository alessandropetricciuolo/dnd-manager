import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { escapeHtml, sendEmail, wrapInTemplate } from "@/lib/email";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export async function sendFeedbackRequestEmailsForSession(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  campaignId: string,
  sessionId: string
): Promise<void> {
  try {
    const [{ data: campaignRow }, { data: sessionRow }, { data: signupsRows }] = await Promise.all([
      admin.from("campaigns").select("name").eq("id", campaignId).maybeSingle(),
      admin.from("sessions").select("title, scheduled_at").eq("id", sessionId).maybeSingle(),
      admin.from("session_signups").select("player_id").eq("session_id", sessionId).eq("status", "attended"),
    ]);

    const campaignName = ((campaignRow as { name?: string | null } | null)?.name ?? "").trim() || "Campagna";
    const sessionTitle = ((sessionRow as { title?: string | null } | null)?.title ?? "").trim() || "Sessione";
    const sessionDateRaw = (sessionRow as { scheduled_at?: string | null } | null)?.scheduled_at ?? null;
    const sessionDate = sessionDateRaw
      ? formatSessionInRome(sessionDateRaw, "EEEE d MMMM yyyy, HH:mm", { locale: it })
      : "data non disponibile";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://barberanddragons.com").replace(/\/$/, "");
    const feedbackUrl = `${appUrl}/campaigns/${campaignId}?tab=sessioni`;
    const playerIds = [...new Set(((signupsRows ?? []) as { player_id: string }[]).map((signup) => signup.player_id))];
    for (const playerId of playerIds) {
      const { data: authUser } = await admin.auth.admin.getUserById(playerId);
      const toEmail = authUser?.user?.email;
      if (!toEmail) continue;
      void sendEmail({
        to: toEmail,
        subject: `Lascia il tuo feedback: ${campaignName}`,
        html: wrapInTemplate(
          `<p>La sessione <strong>${escapeHtml(sessionTitle)}</strong> (${escapeHtml(sessionDate)}) è stata chiusa.</p>` +
          `<p>Il tuo feedback è prezioso: valuta l'esperienza della sessione e della campagna.</p>` +
          `<p><a href="${escapeHtml(feedbackUrl)}" style="color:#fbbf24;text-decoration:underline;">Apri la pagina campagna e lascia il feedback</a></p>`
        ),
      });
    }
  } catch (error) {
    console.error("[sendFeedbackRequestEmailsForSession]", error);
  }
}
