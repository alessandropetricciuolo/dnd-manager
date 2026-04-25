"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatFantasyDate, normalizeFantasyCalendarDate, type FantasyCalendarConfig, type FantasyCalendarDate } from "@/lib/long-calendar";

type LongCalendarPanelProps = {
  baseDate: FantasyCalendarDate;
  config: FantasyCalendarConfig;
  elapsedHours: number;
  onBaseDateChange: (date: FantasyCalendarDate) => void;
  onConfigChange: (config: FantasyCalendarConfig) => void;
  onSave: () => Promise<{ success: boolean; error?: string; message?: string }>;
};

function toValidInt(raw: string, fallback: number) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.trunc(n));
}

export function LongCalendarPanel({
  baseDate,
  config,
  elapsedHours,
  onBaseDateChange,
  onConfigChange,
  onSave,
}: LongCalendarPanelProps) {
  const [saving, setSaving] = useState(false);
  const baseDateLabel = useMemo(() => formatFantasyDate(baseDate, config), [baseDate, config]);
  const extraDays = Math.floor(Math.max(0, elapsedHours) / 24);

  async function persist() {
    setSaving(true);
    try {
      const res = await onSave();
      if (res.success) toast.success(res.message ?? "Calendario salvato.");
      else toast.error(res.error ?? "Errore nel salvataggio calendario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-amber-600/20 bg-zinc-900/60 p-4 text-zinc-100">
      <header className="mb-3 flex items-start justify-between gap-3 border-b border-amber-600/20 pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-amber-300" />
          <div>
            <h2 className="text-sm font-semibold text-amber-200">Calendario Campagna</h2>
            <p className="text-xs text-zinc-400">Data fantasy base usata per derivare la data corrente dei personaggi.</p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
          disabled={saving}
          onClick={() => void persist()}
        >
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? "Salvataggio…" : "Salva"}
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Giorno</label>
          <Input
            type="number"
            min={1}
            value={baseDate.day}
            onChange={(event) => {
              const next = normalizeFantasyCalendarDate(
                { ...baseDate, day: toValidInt(event.target.value, baseDate.day) } as never,
                config
              );
              onBaseDateChange(next);
            }}
            className="h-9 border-amber-600/30 bg-zinc-950 text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Mese</label>
          <Input
            type="number"
            min={1}
            max={config.months.length}
            value={baseDate.month}
            onChange={(event) => {
              const next = normalizeFantasyCalendarDate(
                { ...baseDate, month: toValidInt(event.target.value, baseDate.month) } as never,
                config
              );
              onBaseDateChange(next);
            }}
            className="h-9 border-amber-600/30 bg-zinc-950 text-zinc-100"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Anno</label>
          <Input
            type="number"
            min={1}
            value={baseDate.year}
            onChange={(event) => {
              const next = normalizeFantasyCalendarDate(
                { ...baseDate, year: toValidInt(event.target.value, baseDate.year) } as never,
                config
              );
              onBaseDateChange(next);
            }}
            className="h-9 border-amber-600/30 bg-zinc-950 text-zinc-100"
          />
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Data base attuale: <span className="text-amber-200">{baseDateLabel}</span> • Ore sessione correnti:{" "}
        <span className="text-amber-200">{elapsedHours}h</span> (~{extraDays} giorni).
      </p>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {config.months.map((month, index) => (
          <div key={`${month.name}-${index}`} className="rounded-lg border border-amber-600/20 bg-zinc-950/40 p-2">
            <p className="text-xs font-medium text-amber-100">Mese {index + 1}</p>
            <div className="mt-1 grid grid-cols-[1fr_88px] gap-2">
              <Input
                value={month.name}
                onChange={(event) => {
                  const nextMonths = config.months.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, name: event.target.value } : item
                  );
                  onConfigChange({ months: nextMonths });
                }}
                className="h-8 border-amber-600/30 bg-zinc-950 text-xs text-zinc-100"
              />
              <Input
                type="number"
                min={1}
                value={month.days}
                onChange={(event) => {
                  const nextMonths = config.months.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, days: Math.max(1, Number.parseInt(event.target.value, 10) || item.days) }
                      : item
                  );
                  onConfigChange({ months: nextMonths });
                }}
                className="h-8 border-amber-600/30 bg-zinc-950 text-xs text-zinc-100"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
