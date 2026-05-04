import Link from "next/link";
import { it } from "date-fns/locale";
import { formatSessionInRome } from "@/lib/session-datetime";
import { getCompletedSessionsDashboardForGmAdmin } from "@/app/campaigns/gm-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-barber-paper">Storico sessioni giocate</h2>
        <p className="mt-1 text-sm text-barber-paper/70">
          Sessioni concluse (più recenti per prime), con campagna e giocatori che hanno partecipato.
        </p>
      </div>
      <ul className="space-y-3">
        {sessions.map((s) => {
          const dateLabel = formatSessionInRome(s.scheduled_at, "EEEE d MMMM yyyy", { locale: it });
          const party = s.campaign_parties;
          return (
            <li key={s.id}>
              <Card className="border-barber-gold/25 bg-barber-dark/80 text-barber-paper shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-base font-semibold text-barber-paper">
                        {s.title?.trim() || "Sessione senza titolo"}
                      </CardTitle>
                      <p className="text-xs text-barber-paper/60">{dateLabel}</p>
                      <p className="text-sm text-barber-gold/90">
                        <Link
                          href={`/campaigns/${s.campaign_id}?tab=sessioni`}
                          className="underline-offset-2 hover:underline"
                        >
                          {s.campaign_name}
                        </Link>
                      </p>
                      {party?.name && (
                        <Badge
                          className="mt-1 border-barber-gold/40 bg-barber-gold/10 text-barber-gold"
                          style={
                            party.color
                              ? {
                                  borderColor: party.color,
                                  backgroundColor: `${party.color}20`,
                                  color: party.color,
                                }
                              : undefined
                          }
                        >
                          {party.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-barber-paper/60">Giocatori:</span>
                    {s.played_by && s.played_by.length > 0 ? (
                      s.played_by.map((p) => (
                        <Badge
                          key={p.player_id}
                          variant="outline"
                          className="border-barber-gold/30 bg-barber-dark/70 text-barber-paper/90"
                        >
                          {p.player_name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs italic text-barber-paper/50">nessun partecipante registrato</span>
                    )}
                  </div>
                  {s.session_summary?.trim() ? (
                    <p className="line-clamp-2 whitespace-pre-wrap text-xs text-barber-paper/65">{s.session_summary}</p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
