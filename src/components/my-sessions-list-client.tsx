"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CalendarDays, ChevronDown, ChevronUp, History, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type SessionRowWithDate = {
  id: string;
  campaign_name: string;
  scheduled_at: string;
  location: string | null;
  session_title: string | null;
  formatted_date: string;
};

export function MySessionsListClient({
  inProgramma,
  storico,
}: {
  inProgramma: SessionRowWithDate[];
  storico: SessionRowWithDate[];
}) {
  const [storicoOpen, setStoricoOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 flex items-center gap-2 font-serif text-sm font-bold uppercase tracking-wider text-brass-light">
          <CalendarDays className="h-4 w-4 text-brass-base" />
          <span>In programma ({inProgramma.length})</span>
        </h3>
        <SessionCards
          rows={inProgramma}
          emptyMessage="Nessuna sessione in programma al momento."
        />
      </div>

      <div className="card-guild-stone overflow-hidden rounded-2xl border border-brass-base/30 shadow-md">
        <button
          type="button"
          aria-expanded={storicoOpen}
          onClick={() => setStoricoOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-brass-base/10"
        >
          <span className="flex min-w-0 items-center gap-2.5 font-serif text-xs font-bold uppercase tracking-wider text-parchment-200">
            <History className="h-4 w-4 shrink-0 text-brass-base" />
            <span className="truncate">Storico sessioni ({storico.length})</span>
          </span>
          {storicoOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-brass-light" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-brass-light" aria-hidden />
          )}
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            storicoOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-guild-border/80 px-5 pb-5 pt-4">
              <SessionCards
                rows={storico}
                emptyMessage="Nessuna sessione nello storico."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCards({
  rows,
  emptyMessage,
}: {
  rows: SessionRowWithDate[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="card-guild-stone rounded-xl border border-guild-border/80 p-6 text-center text-xs text-parchment-400">
        {emptyMessage}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <article key={r.id} className="card-guild-stone relative rounded-xl border border-brass-base/30 p-4 shadow-md transition-transform hover:-translate-y-0.5">
          <div className="corner-ornament-tl" />
          <div className="corner-ornament-tr" />
          <div className="corner-ornament-bl" />
          <div className="corner-ornament-br" />

          <div>
            <span className="text-[10px] font-serif uppercase tracking-widest text-brass-base">
              Sessione di Gioco
            </span>
            <h4 className="mt-1 font-serif text-base font-bold text-parchment-100">
              {r.campaign_name}
            </h4>
            {r.session_title ? (
              <p className="mt-0.5 text-xs italic text-brass-light/90">{r.session_title}</p>
            ) : null}
          </div>

          <div className="mt-3 space-y-1.5 border-t border-guild-border/70 pt-2.5 text-xs text-parchment-300">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-brass-base" />
              <span className="font-mono">{r.formatted_date}</span>
            </p>
            {r.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brass-base" />
                <span>{r.location}</span>
              </p>
            ) : (
              <p className="flex items-center gap-2 text-parchment-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Locanda Barber &amp; Dragons</span>
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
