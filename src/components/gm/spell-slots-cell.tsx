"use client";

import { Button } from "@/components/ui/button";
import type { CombatSpellSlots } from "@/lib/combat-spell-slots";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

type SpellSlotsCellProps = {
  slots: CombatSpellSlots;
  onSpend: (level: number) => void;
  onRestore: (level: number) => void;
  onReset: () => void;
  compact?: boolean;
};

function countForLevel(entries: { level: number; count: number }[], level: number): number {
  return entries.find((e) => e.level === level)?.count ?? 0;
}

export function SpellSlotsCell({
  slots,
  onSpend,
  onRestore,
  onReset,
  compact = false,
}: SpellSlotsCellProps) {
  const spentAny = slots.max.some(
    (m) => countForLevel(slots.remaining, m.level) < m.count
  );

  return (
    <div className={cn("flex flex-col gap-1", compact && "gap-0.5")}>
      {slots.max.map((m) => {
        const remaining = countForLevel(slots.remaining, m.level);
        const empty = remaining <= 0;
        return (
          <div
            key={m.level}
            className="flex items-center gap-0.5"
            title={`Slot ${m.level}° livello`}
          >
            <span className="w-5 shrink-0 text-[10px] font-medium text-violet-400/90">
              {m.level}°
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 w-6 border-violet-600/30 bg-zinc-900/60 px-0 text-[10px] text-violet-200 hover:bg-violet-600/20 disabled:opacity-30"
              disabled={empty}
              onClick={() => onSpend(m.level)}
              title="Spendi uno slot"
            >
              −
            </Button>
            <span
              className={cn(
                "min-w-[2rem] text-center text-[11px] font-semibold tabular-nums",
                empty ? "text-zinc-600" : "text-violet-200"
              )}
            >
              {remaining}/{m.count}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 w-6 border-violet-600/30 bg-zinc-900/60 px-0 text-[10px] text-violet-200 hover:bg-violet-600/20 disabled:opacity-30"
              disabled={remaining >= m.count}
              onClick={() => onRestore(m.level)}
              title="Ripristina uno slot"
            >
              +
            </Button>
          </div>
        );
      })}
      {spentAny ? (
        <button
          type="button"
          className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500 hover:text-violet-300"
          onClick={onReset}
          title="Ripristina tutti gli slot (riposo lungo)"
        >
          <RotateCcw className="h-2.5 w-2.5" />
          Ripristina
        </button>
      ) : null}
    </div>
  );
}
