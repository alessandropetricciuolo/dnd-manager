import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { getAccountSafetyAdmin } from "@/lib/admin-account-safety";
import { ADMIN_PAGE_SHELL } from "@/lib/layout/shell-classes";
import { isSafeTelegramProxyPath } from "@/lib/security/url";
import { SafetyAction } from "./controls";

const dateFormat = new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Rome" });
const sectionClass = "space-y-3 rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4 sm:p-5";

export default async function AccountSafetyPage() {
  const caller = await getAccountSafetyAdmin();
  if (!caller) redirect("/dashboard");
  const { admin } = caller;

  const [requests, confirmations, revocations, reports, reviewedReports] = await Promise.all([
    admin.from("account_deletion_requests").select("id, user_id, created_at")
      .in("status", ["pending", "in_progress"]).not("user_id", "is", null)
      .order("created_at", { ascending: true }).limit(100),
    admin.from("account_deletion_requests").select("id, handled_at")
      .eq("status", "completed").not("confirmation_email", "is", null)
      .is("confirmation_sent_at", null).order("handled_at", { ascending: true }).limit(100),
    admin.from("account_deletion_requests").select("id")
      .eq("status", "completed").not("apple_revocation_token", "is", null)
      .order("handled_at", { ascending: true }).limit(100),
    admin.from("whisper_reports").select("id, reporter_id, reported_user_id, whisper_id, campaign_id, reason, details, created_at")
      .is("reviewed_at", null).order("created_at", { ascending: true }).limit(100),
    admin.from("whisper_reports").select("id, reason, review_outcome, reviewed_at")
      .not("reviewed_at", "is", null).order("reviewed_at", { ascending: false }).limit(20),
  ]);

  const userIds = [...new Set([
    ...(requests.data ?? []).flatMap((request) => request.user_id ? [request.user_id] : []),
    ...(reports.data ?? []).flatMap((report) => [report.reporter_id, report.reported_user_id]),
  ])];
  const whisperIds = (reports.data ?? []).flatMap((report) => report.whisper_id ? [report.whisper_id] : []);
  const campaignIds = [...new Set((reports.data ?? []).map((report) => report.campaign_id))];
  const [profiles, whispers, campaigns] = await Promise.all([
    userIds.length ? admin.from("profiles").select("id, display_name, first_name, last_name").in("id", userIds) : { data: [], error: null },
    whisperIds.length ? admin.from("secret_whispers").select("id, message, image_url").in("id", whisperIds) : { data: [], error: null },
    campaignIds.length ? admin.from("campaigns").select("id, name").in("id", campaignIds) : { data: [], error: null },
  ]);
  const names = new Map((profiles.data ?? []).map((profile) => [
    profile.id, [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.display_name || profile.id,
  ]));
  const messages = new Map((whispers.data ?? []).map((whisper) => [whisper.id, whisper]));
  const campaignNames = new Map((campaigns.data ?? []).map((campaign) => [campaign.id, campaign.name]));

  return (
    <main className={ADMIN_PAGE_SHELL}>
      <div className="w-full space-y-6 text-barber-paper">
        <h1 className="text-xl font-semibold sm:text-2xl">Account e Whisper</h1>
        <section className={sectionClass} aria-labelledby="deletions-heading">
          <h2 id="deletions-heading" className="font-semibold text-barber-gold">Richieste di cancellazione</h2>
          {requests.error || profiles.error ? <p role="alert">Impossibile caricare le richieste.</p> : null}
          {!requests.error && !requests.data?.length ? <p className="text-sm text-barber-paper/70">Nessuna richiesta aperta.</p> : null}
          {requests.data?.map(({ id, user_id, created_at }) => {
            if (!user_id) return null;
            const label = names.get(user_id) ?? user_id;
            const due = new Date(new Date(created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
            return (
              <div key={id} className="flex flex-wrap items-center justify-between gap-3 border-t border-barber-gold/20 pt-3">
                <div className="min-w-0 break-words">
                  <Link className="underline underline-offset-4" href={`/admin/users/${user_id}`}>{label}</Link>
                  <p className="text-sm text-barber-paper/70">Richiesta il {dateFormat.format(new Date(created_at))} · Scadenza {dateFormat.format(due)}</p>
                </div>
                {user_id !== caller.userId ? <DeleteUserButton userId={user_id} userLabel={label} /> : (
                  <span className="text-sm text-barber-paper/70">Serve un altro admin per gestire questa richiesta.</span>
                )}
              </div>
            );
          })}
        </section>

        {confirmations.error || confirmations.data?.length ? (
          <section className={sectionClass} aria-labelledby="confirmations-heading">
            <h2 id="confirmations-heading" className="font-semibold text-barber-gold">Email di conferma in sospeso</h2>
            {confirmations.error ? <p role="alert">Impossibile caricare gli invii in sospeso.</p> : null}
            {confirmations.data?.map(({ id, handled_at }) => (
              <div key={id} className="flex flex-wrap items-center justify-between gap-3 border-t border-barber-gold/20 pt-3">
                <p className="text-sm text-barber-paper/80">
                  Richiesta {id.slice(0, 8)} · {handled_at ? dateFormat.format(new Date(handled_at)) : "Account eliminato"}
                </p>
                <SafetyAction id={id} action="resend" />
              </div>
            ))}
          </section>
        ) : null}

        {revocations.error || revocations.data?.length ? (
          <section className={sectionClass} aria-labelledby="revocations-heading">
            <h2 id="revocations-heading" className="font-semibold text-barber-gold">Revoche Apple in sospeso</h2>
            {revocations.error ? <p role="alert">Impossibile caricare le revoche in sospeso.</p> : null}
            {revocations.data?.map(({ id }) => (
              <div key={id} className="flex flex-wrap items-center justify-between gap-3 border-t border-barber-gold/20 pt-3">
                <p className="text-sm text-barber-paper/80">Richiesta {id.slice(0, 8)}</p>
                <SafetyAction id={id} action="revoke-apple" />
              </div>
            ))}
          </section>
        ) : null}

        <section className={sectionClass} aria-labelledby="reports-heading">
          <h2 id="reports-heading" className="font-semibold text-barber-gold">Segnalazioni Whisper</h2>
          {reports.error || whispers.error || campaigns.error || profiles.error ? <p role="alert">Impossibile caricare tutte le segnalazioni.</p> : null}
          {!reports.error && !reports.data?.length ? <p className="text-sm text-barber-paper/70">Nessuna segnalazione aperta.</p> : null}
          {reports.data?.map((report) => {
            const whisper = report.whisper_id ? messages.get(report.whisper_id) : undefined;
            return (
              <article key={report.id} className="space-y-2 break-words border-t border-barber-gold/20 pt-3">
                <h3 className="font-medium">{report.reason}</h3>
                <p className="text-sm text-barber-paper/70">{campaignNames.get(report.campaign_id) ?? report.campaign_id} · {dateFormat.format(new Date(report.created_at))}</p>
                <p className="text-sm text-barber-paper/80">
                  Da {names.get(report.reporter_id) ?? report.reporter_id} · Utente segnalato {names.get(report.reported_user_id) ?? report.reported_user_id}
                </p>
                {report.details ? <p className="whitespace-pre-wrap text-sm">{report.details}</p> : null}
                {whisper?.message ? <blockquote className="whitespace-pre-wrap border-l-2 border-barber-gold/40 pl-3 text-sm">{whisper.message}</blockquote> : null}
                {whisper?.image_url && isSafeTelegramProxyPath(whisper.image_url) ? (
                  <a href={whisper.image_url} target="_blank" rel="noreferrer" className="text-sm underline">Apri immagine segnalata</a>
                ) : null}
                {!whisper && !whispers.error ? <p className="text-sm text-barber-paper/70">Sussurro non più disponibile.</p> : null}
                <div className="flex flex-wrap gap-2">
                  <SafetyAction id={report.id} action="archive" />
                  {whisper ? <SafetyAction id={report.id} action="remove" /> : null}
                </div>
              </article>
            );
          })}
          {reviewedReports.error ? <p role="alert">Impossibile caricare lo storico delle segnalazioni.</p> : null}
          {reviewedReports.data?.length ? (
            <details className="border-t border-barber-gold/20 pt-3 text-sm">
              <summary className="cursor-pointer font-medium">Ultime segnalazioni chiuse</summary>
              <ul className="mt-2 space-y-1 text-barber-paper/80">
                {reviewedReports.data.map((report) => (
                  <li key={report.id}>{report.reason} · {report.review_outcome === "removed" ? "Sussurro rimosso" : "Archiviata"} · {report.reviewed_at && dateFormat.format(new Date(report.reviewed_at))}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      </div>
    </main>
  );
}
