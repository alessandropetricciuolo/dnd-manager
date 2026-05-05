import { getCompletedSessionsDashboardForGmAdmin } from "@/app/campaigns/gm-actions";
import { GmAdminSessionHistoryList } from "@/components/dashboard/gm-admin-session-history-list";

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

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-serif text-xl font-semibold leading-tight text-barber-paper sm:text-2xl">
          Storico sessioni giocate
        </h2>
        <p className="mt-1 text-sm text-barber-paper/70">
          Sessioni concluse (più recenti per prime). Apri una riga per titolo, riassunto e note GM.
        </p>
      </div>
      <GmAdminSessionHistoryList sessions={sessions} />
    </div>
  );
}
