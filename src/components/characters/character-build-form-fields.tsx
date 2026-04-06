"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BACKGROUND_OPTIONS, CLASS_OPTIONS, RACE_OPTIONS, raceBySlug } from "@/lib/character-build-catalog";

type CharacterBuildFormFieldsProps = {
  disabled?: boolean;
  initialRaceSlug?: string | null;
  initialSubclassSlug?: string | null;
  initialBackgroundSlug?: string | null;
  initialClassLabel?: string | null;
};

export function CharacterBuildFormFields({
  disabled = false,
  initialRaceSlug = null,
  initialSubclassSlug = null,
  initialBackgroundSlug = null,
  initialClassLabel = null,
}: CharacterBuildFormFieldsProps) {
  const [race, setRace] = useState<string>(initialRaceSlug ?? "__none__");
  const [sub, setSub] = useState<string>(initialSubclassSlug ?? "__none__");
  const [bg, setBg] = useState<string>(initialBackgroundSlug ?? "__none__");
  const [cls, setCls] = useState<string>(initialClassLabel ?? "__none__");
  const customClass =
    initialClassLabel &&
    !CLASS_OPTIONS.some((c) => c.label === initialClassLabel) &&
    initialClassLabel.trim()
      ? initialClassLabel.trim()
      : null;

  useEffect(() => {
    setRace(initialRaceSlug ?? "__none__");
    setSub(initialSubclassSlug ?? "__none__");
    setBg(initialBackgroundSlug ?? "__none__");
    setCls(initialClassLabel ?? "__none__");
  }, [initialRaceSlug, initialSubclassSlug, initialBackgroundSlug, initialClassLabel]);

  const subOptions = useMemo(() => raceBySlug(race === "__none__" ? null : race)?.subraces ?? [], [race]);

  useEffect(() => {
    if (sub !== "__none__" && !subOptions.some((s) => s.slug === sub)) setSub("__none__");
  }, [subOptions, sub]);

  return (
    <div className="space-y-3 rounded-lg border border-barber-gold/25 bg-barber-dark/50 p-3">
      <p className="text-xs font-medium text-barber-gold">Regole (Manuale del Giocatore)</p>
      <p className="text-[11px] text-barber-paper/60">
        Selezioni per generare i testi di riferimento in scheda (snapshot). Il background narrativo resta nel campo testo sotto.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-barber-paper/90">Razza</Label>
          <Select
            value={race}
            onValueChange={(v) => {
              setRace(v);
              setSub("__none__");
            }}
            disabled={disabled}
          >
            <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
              <SelectValue placeholder="Scegli" />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
              <SelectItem value="__none__">— Non specificata —</SelectItem>
              {RACE_OPTIONS.map((r) => (
                <SelectItem key={r.slug} value={r.slug}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="race_slug" value={race === "__none__" ? "" : race} readOnly />
        </div>
        <div className="space-y-1.5">
          <Label className="text-barber-paper/90">Sottorazza (se prevista)</Label>
          <Select value={sub} onValueChange={setSub} disabled={disabled || subOptions.length === 0}>
            <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
              <SelectValue placeholder={subOptions.length ? "Scegli" : "N/A"} />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
              <SelectItem value="__none__">— Nessuna —</SelectItem>
              {subOptions.map((s) => (
                <SelectItem key={s.slug} value={s.slug}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="subclass_slug" value={sub === "__none__" ? "" : sub} readOnly />
        </div>
        <div className="space-y-1.5">
          <Label className="text-barber-paper/90">Classe</Label>
          <Select value={cls} onValueChange={setCls} disabled={disabled}>
            <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
              <SelectValue placeholder="Scegli" />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper max-h-64 overflow-y-auto">
              <SelectItem value="__none__">— Non specificata —</SelectItem>
              {customClass ? (
                <SelectItem value={customClass}>{customClass} (testo precedente)</SelectItem>
              ) : null}
              {CLASS_OPTIONS.map((c) => (
                <SelectItem key={c.slug} value={c.label}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="character_class" value={cls === "__none__" ? "" : cls} readOnly />
        </div>
        <div className="space-y-1.5">
          <Label className="text-barber-paper/90">Background (PHB)</Label>
          <Select value={bg} onValueChange={setBg} disabled={disabled}>
            <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
              <SelectValue placeholder="Scegli" />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper max-h-64 overflow-y-auto">
              <SelectItem value="__none__">— Nessuno —</SelectItem>
              {BACKGROUND_OPTIONS.map((b) => (
                <SelectItem key={b.slug} value={b.slug}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="background_slug" value={bg === "__none__" ? "" : bg} readOnly />
        </div>
      </div>
    </div>
  );
}
