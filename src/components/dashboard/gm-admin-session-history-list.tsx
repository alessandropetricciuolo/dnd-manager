"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { it } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { formatSessionInRome } from "@/lib/session-datetime";
import type { DashboardCompletedSessionRow } from "@/app/campaigns/gm-actions";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  sessions: DashboardCompletedSessionRow[];
};

export function GmAdminSessionHistoryList({ sessions }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const selected = useMemo(
    () => (openId ? sessions.find((s) => s.id === openId) ?? null : null),
    [openId, sessions]
  );

  return (
    <>
      <Sheet open={openId !== null} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent
          id="session-history-sheet"
          side="right"
          className="flex w-full flex-col border-barber-gold/30 bg-barber-dark text-barber-paper sm:max-w-md"
        >
          {selected ? (
            <>
              <SheetHeader className="shrink-0 space-y-1 border-b border-barber-gold/20 pb-4 text-left">
                <SheetTitle className="text-lg text-barber-paper">
                  {selected.title?.trim() || "Sessione senza titolo"}
                </SheetTitle>
                <p className="text-xs font-normal text-barber-paper/60">
                  {formatSessionInRome(selected.scheduled_at, "EEEE d MMMM yyyy", { locale: it })}
                </p>
                <p className="text-sm text-barber-gold">
                  <Link
                    href={`/campaigns/${selected.campaign_id}?tab=sessioni`}
                    className="underline-offset-2 hover:underline"
                    onClick={() => setOpenId(null)}
                  >
                    {selected.campaign_name}
                  </Link>
                </p>
                {selected.campaign_parties?.name ? (
                  <Badge
                    className="mt-1 w-fit border-barber-gold/40 bg-barber-gold/10 text-barber-gold"
                    style={
                      selected.campaign_parties.color
                        ? {
                            borderColor: selected.campaign_parties.color,
                            backgroundColor: `${selected.campaign_parties.color}20`,
                            color: selected.campaign_parties.color,
                          }
                        : undefined
                    }
                  >
                    {selected.campaign_parties.name}
                  </Badge>
                ) : null}
              </SheetHeader>
              <div className="scrollbar-barber-y min-h-0 flex-1 space-y-5 overflow-y-auto py-4 pr-1">
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-barber-gold/90">
                    Giocatori
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.played_by && selected.played_by.length > 0 ? (
                      selected.played_by.map((p) => (
                        <Badge
                          key={p.player_id}
                          variant="outline"
                          className="border-barber-gold/30 bg-barber-dark/70 text-barber-paper/90"
                        >
                          {p.player_name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm italic text-barber-paper/50">Nessun partecipante registrato</span>
                    )}
                  </div>
                </section>
                {selected.chapter_title?.trim() ? (
                  <section>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-barber-gold/90">
                      Capitolo
                    </h3>
                    <p className="text-sm text-barber-paper/85">{selected.chapter_title.trim()}</p>
                  </section>
                ) : null}
                {selected.session_summary?.trim() ? (
                  <section>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-barber-gold/90">
                      Riassunto
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/75">
                      {selected.session_summary.trim()}
                    </p>
                  </section>
                ) : (
                  <p className="text-sm italic text-barber-paper/45">Nessun riassunto pubblicato per questa sessione.</p>
                )}
                {selected.gm_private_notes?.trim() ? (
                  <section className="rounded-lg border border-violet-500/25 bg-violet-950/20 p-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-300/90">
                      Note GM (private)
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/80">
                      {selected.gm_private_notes.trim()}
                    </p>
                  </section>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <div className="overflow-hidden rounded-xl border border-barber-gold/25 bg-barber-dark/80">
        <div className="hidden border-b border-barber-gold/15 px-3 pb-2 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-barber-paper/45 sm:grid sm:grid-cols-[auto_1fr] sm:gap-3 sm:items-center">
          <span className="w-4 shrink-0" aria-hidden />
          <div className="grid min-w-0 grid-cols-1 gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-3">
            <span>Data</span>
            <span>Campagna</span>
            <span>Giocatori</span>
          </div>
        </div>
        <ul className="divide-y divide-barber-gold/15">
        {sessions.map((s) => {
          const dateShort = formatSessionInRome(s.scheduled_at, "d MMM yyyy", { locale: it });
          const playersLabel =
            s.played_by && s.played_by.length > 0
              ? s.played_by.map((p) => p.player_name).join(", ")
              : "—";
          const isActive = openId === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-expanded={isActive}
                aria-controls={`session-history-sheet`}
                onClick={() => setOpenId(s.id)}
                className={cn(
                  "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-barber-gold/[0.06]",
                  isActive && "bg-barber-gold/[0.08]"
                )}
              >
                <ChevronRight
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-barber-gold/60 transition-transform",
                    isActive && "rotate-90"
                  )}
                  aria-hidden
                />
                <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-barber-gold">{dateShort}</span>
                  <span className="min-w-0 truncate text-sm font-medium text-barber-paper">{s.campaign_name}</span>
                  <span className="min-w-0 truncate text-xs text-barber-paper/65" title={playersLabel}>
                    {playersLabel}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
        </ul>
      </div>
      <p className="text-xs text-barber-paper/45">
        Tocca una riga per titolo, gruppo, riassunto e note GM.
      </p>
    </>
  );
}
