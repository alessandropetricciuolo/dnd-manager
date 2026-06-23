"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applySlotChange,
  slotsToOverrides,
} from "@/lib/sheet-generator/build-choices-client";
import type { BuildChoiceSlot, BuildChoicesPreview } from "@/lib/sheet-generator/build-choices-types";

type Props = {
  preview: BuildChoicesPreview;
  level: number;
  disabled?: boolean;
  onChange: (slots: BuildChoiceSlot[], overrides: ReturnType<typeof slotsToOverrides>) => void;
};

export function SheetBuildChoicesPanel({ preview, level, disabled, onChange }: Props) {
  const [slots, setSlots] = useState<BuildChoiceSlot[]>(preview.slots);

  useEffect(() => {
    setSlots(preview.slots);
  }, [preview]);

  const groups = useMemo(() => {
    const map = new Map<string, BuildChoiceSlot[]>();
    for (const s of slots) {
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return [...map.entries()];
  }, [slots]);

  function updateSlot(slotId: string, value: string) {
    const next = applySlotChange(slots, slotId, value, level);
    setSlots(next);
    onChange(next, slotsToOverrides(next));
  }

  if (!slots.length) return null;

  return (
    <section className="mt-6 space-y-6 rounded-xl border border-barber-gold/30 bg-barber-dark/60 p-5">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-barber-gold">Personalizza le scelte</h2>
        <p className="text-sm text-barber-paper/70">
          Ogni menu è precompilato con la scelta automatica del generatore. Modifica ciò che vuoi
          prima di creare il PDF finale.
        </p>
      </header>

      {groups.map(([group, groupSlots]) => (
        <div key={group} className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-barber-gold/80">
            {group}
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {groupSlots.map((s) => (
              <div key={s.id} className="space-y-1.5">
                <label htmlFor={s.id} className="text-sm text-barber-paper">
                  {s.label}
                </label>
                <select
                  id={s.id}
                  value={s.value}
                  disabled={disabled}
                  onChange={(e) => updateSlot(s.id, e.target.value)}
                  className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold"
                >
                  {s.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.meta ? `${opt.label} (${opt.meta})` : opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
