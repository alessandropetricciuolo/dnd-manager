"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import type { DashboardCompletedSessionRow } from "@/app/campaigns/gm-actions";
import { GmAdminSessionHistoryList } from "@/components/dashboard/gm-admin-session-history-list";
import { cn } from "@/lib/utils";

type Props = {
  sessions: DashboardCompletedSessionRow[];
};

export function GmAdminSessionHistoryPanel({ sessions }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-barber-gold/25 bg-barber-dark/80">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-barber-gold/[0.06]"
      >
        <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
          <span className="flex min-w-0 items-center gap-2 font-serif text-lg font-semibold text-barber-paper sm:text-xl">
            <History className="h-4 w-4 shrink-0 text-barber-gold" />
            <span className="truncate">Storico sessioni giocate ({sessions.length})</span>
          </span>
          <span className="text-xs text-barber-paper/60 sm:ml-1">
            Apri una riga per titolo, riassunto e note GM
          </span>
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-barber-gold/70" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-barber-gold/70" aria-hidden />
        )}
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-barber-gold/20 px-4 pb-4 pt-3">
            <GmAdminSessionHistoryList sessions={sessions} />
          </div>
        </div>
      </div>
    </div>
  );
}
