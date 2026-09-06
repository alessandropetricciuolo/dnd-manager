"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COMBAT_CONDITIONS, normalizeCombatConditions, type CombatConditionId } from "@/lib/combat-conditions";

function ConditionDescription({ condition }: { condition: (typeof COMBAT_CONDITIONS)[number] }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const cancelClose = () => clearTimeout(timer.current);
  const close = () => { cancelClose(); timer.current = setTimeout(() => setOpen(false), 180); };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="rounded px-2 py-1 text-left text-xs text-amber-200 hover:bg-zinc-700 focus-visible:outline focus-visible:outline-amber-400"
          onMouseEnter={() => { cancelClose(); setOpen(true); }} onMouseLeave={close}
          aria-label={`Descrizione: ${condition.label}`}>
          {condition.label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-[min(70vh,32rem)] w-96 max-w-[calc(100vw-2rem)] overflow-y-auto border-amber-600/30 bg-zinc-900 text-zinc-100"
        onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()}
        onMouseEnter={cancelClose} onMouseLeave={close}>
        <p className="font-semibold">{condition.label}</p>
        <p className="mb-3 mt-1 text-xs text-zinc-400">Manuale del Giocatore · Appendice A · p. {condition.page}{condition.id === "pietrificato" ? "–292" : ""}</p>
        <div className="space-y-2 text-sm leading-relaxed">
          {condition.paragraphs.map((paragraph) => <p className="whitespace-pre-line" key={paragraph}>{paragraph}</p>)}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ConditionsCell({ name, value, onChange }: {
  name: string;
  value?: CombatConditionId[];
  onChange: (conditions: CombatConditionId[]) => void;
}) {
  const selected = normalizeCombatConditions(value);
  return (
    <div className="flex min-w-[140px] max-w-[220px] flex-col gap-1">
      <Select value="" onValueChange={(id) => onChange(normalizeCombatConditions([...selected, id]))} disabled={selected.length === COMBAT_CONDITIONS.length}>
        <SelectTrigger aria-label={`Aggiungi stato a ${name}`} className="h-8 border-amber-600/30 bg-zinc-900 text-xs text-zinc-200"><SelectValue placeholder="Aggiungi stato…" /></SelectTrigger>
        <SelectContent>
          {COMBAT_CONDITIONS.filter((condition) => !selected.includes(condition.id)).map((condition) => <SelectItem key={condition.id} value={condition.id}>{condition.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-1">
        {COMBAT_CONDITIONS.filter((condition) => selected.includes(condition.id)).map((condition) => (
          <div key={condition.id} className="inline-flex items-center rounded border border-amber-600/30 bg-zinc-800">
            <ConditionDescription condition={condition} />
            <button type="button" aria-label={`Rimuovi ${condition.label} da ${name}`} className="rounded p-1.5 text-zinc-400 hover:text-zinc-100 focus-visible:outline focus-visible:outline-amber-400" onClick={() => onChange(selected.filter((id) => id !== condition.id))}><X className="h-3 w-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
