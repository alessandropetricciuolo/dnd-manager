"use client";

import { Clock3, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LongTimePanelProps = {
  elapsedHours: number;
  onChange: (hours: number) => void;
};

function clampHours(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

export function LongTimePanel({ elapsedHours, onChange }: LongTimePanelProps) {
  function applyDelta(delta: number) {
    onChange(clampHours(elapsedHours + delta));
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
