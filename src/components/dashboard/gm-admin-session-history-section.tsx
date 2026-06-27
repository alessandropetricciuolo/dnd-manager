import { getCompletedSessionsDashboardForGmAdmin } from "@/app/campaigns/gm-actions";
import { GmAdminSessionHistoryPanel } from "@/components/dashboard/gm-admin-session-history-panel";

export async function GmAdminSessionHistorySection() {
  const result = await getCompletedSessionsDashboardForGmAdmin();
  if (!result.success) {
    return (
      <p className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-3 text-sm text-red-200">
        {result.error}
      </p>
    );
  }

  const sessions = result.data ?? [];
  if (sessions.length === 0) {
    return (
      <p className="rounded-xl border border-barber-gold/20 bg-barber-dark/50 px-4 py-6 text-center text-sm text-barber-paper/60">
        Nessuna sessione conclusa da mostrare. Le sessioni chiuse dal GM Screen compariranno qui con l&apos;elenco dei
        giocatori.
      </p>
    );
  }

  return <GmAdminSessionHistoryPanel sessions={sessions} />;
}
