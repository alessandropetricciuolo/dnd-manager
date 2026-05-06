"use client";

import { Clock3, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LongTimePanelProps = {
  elapsedHours: number;
  onChange: (hours: number) => void;
  /**
   * Versione orizzontale single-row da usare come banda in cima alla colonna durante sessione.
   * Default: false (mostra il pannello full con tutte le scorciatoie).
   */
  compact?: boolean;
};

function clampHours(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function LongTimePanel({ elapsedHours, onChange, compact = false }: LongTimePanelProps) {
  function applyDelta(delta: number) {
    onChange(clampHours(elapsedHours + delta));
  }

  if (compact) {
    return (
      <section
        className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-600/25 bg-zinc-900/70 px-3 py-2 text-zinc-100"
        aria-label="Tempo di gioco trascorso"
      >
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 shrink-0 text-amber-300" />
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-200">
            Tempo
          </span>
        </div>

        <div className="flex h-7 items-center overflow-hidden rounded-md border border-amber-600/35 bg-zinc-950">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-none text-amber-200 hover:bg-amber-600/20 hover:text-amber-100 disabled:opacity-50"
            onClick={() => applyDelta(-1)}
            disabled={elapsedHours <= 0}
            aria-label="Sottrai 1 ora"
            title="-1 h"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[3.25rem] px-2 text-center text-xs font-semibold tabular-nums text-amber-100">
            {elapsedHours} h
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-none text-amber-200 hover:bg-amber-600/20 hover:text-amber-100"
            onClick={() => applyDelta(1)}
            aria-label="Aggiungi 1 ora"
            title="+1 h"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="hidden text-[11px] uppercase tracking-wide text-zinc-400 sm:inline">
          Salti
        </span>
        <div className="flex flex-wrap gap-1">
          {[2, 4, 6].map((hours) => (
            <Button
              key={hours}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 border-amber-600/30 px-2 text-[11px] font-medium text-amber-100 hover:bg-amber-600/15"
              onClick={() => applyDelta(hours)}
              title={`+${hours} h`}
            >
              +{hours}h
            </Button>
          ))}
        </div>

        <span className="ml-auto hidden text-[11px] text-zinc-500 lg:inline">
          Salvato in chiusura sessione
        </span>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-amber-600/20 bg-zinc-900/60 p-4 text-zinc-100">
      <header className="mb-3 flex items-start justify-between gap-3 border-b border-amber-600/20 pb-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-amber-300" />
          <div>
            <h2 className="text-sm font-semibold text-amber-200">Tempo Trascorso</h2>
            <p className="text-xs text-zinc-400">
              Ore di gioco da riportare automaticamente nella chiusura sessione.
            </p>
          </div>
        </div>
        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
          {elapsedHours} h
        </span>
      </header>

      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)]">
        <div className="space-y-2">
          <label htmlFor="gm-long-elapsed-hours" className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Ore
          </label>
          <Input
            id="gm-long-elapsed-hours"
            type="number"
            min={0}
            step={1}
            value={elapsedHours || ""}
            onChange={(event) => onChange(clampHours(Number.parseInt(event.target.value, 10) || 0))}
            className="h-10 border-amber-600/30 bg-zinc-950 text-zinc-100"
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Azioni rapide</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Button
              type="button"
              variant="outline"
              className="justify-start border-amber-600/30 text-amber-100 hover:bg-amber-600/15"
              onClick={() => applyDelta(-1)}
              disabled={elapsedHours <= 0}
            >
              <Minus className="mr-2 h-4 w-4" />
              1h
            </Button>
            {[1, 2, 4].map((hours) => (
              <Button
                key={hours}
                type="button"
                variant="outline"
                className={cn(
                  "justify-start border-amber-600/30 text-amber-100 hover:bg-amber-600/15",
                  hours === 4 && "lg:col-auto"
                )}
                onClick={() => applyDelta(hours)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {hours}h
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
