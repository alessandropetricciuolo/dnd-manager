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
    <div className="space-y-4">
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-barber-paper">
          <CalendarDays className="h-4 w-4 text-barber-gold" />
          In programma ({inProgramma.length})
        </h3>
        <SessionCards
          rows={inProgramma}
          emptyMessage="Nessuna sessione in programma."
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-barber-gold/30 bg-barber-dark/80">
        <button
          type="button"
          aria-expanded={storicoOpen}
          onClick={() => setStoricoOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-barber-gold/[0.06]"
        >
          <span className="flex min-w-0 items-center gap-2 font-medium text-barber-paper">
            <History className="h-4 w-4 shrink-0 text-barber-gold" />
            <span className="truncate">Storico sessioni ({storico.length})</span>
          </span>
          {storicoOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-barber-gold/70" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-barber-gold/70" aria-hidden />
          )}
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            storicoOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-barber-gold/20 px-4 pb-4 pt-3">
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
      <p className="rounded-xl border border-barber-gold/20 bg-barber-dark/60 px-4 py-6 text-center text-sm text-barber-paper/70">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <Card key={r.id} className="border-barber-gold/30 bg-barber-dark/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-barber-paper">{r.campaign_name}</CardTitle>
            {r.session_title ? (
              <p className="text-sm text-barber-paper/70">{r.session_title}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-barber-paper/80">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-barber-gold/80" />
              {r.formatted_date}
            </p>
            {r.location ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-barber-gold/80" />
                {r.location}
              </p>
            ) : (
              <p className="flex items-center gap-2 text-barber-paper/50">
                <MapPin className="h-4 w-4 shrink-0" />
                Luogo da definire
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
