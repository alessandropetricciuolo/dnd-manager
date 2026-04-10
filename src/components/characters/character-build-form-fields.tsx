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
import {
  matchSupplementSubclass,
  subclassCatalogSourceSuffix,
  supplementSubclassBySlug,
  supplementSubclassesForClass,
} from "@/lib/character-subclass-catalog";

type CharacterBuildFormFieldsProps = {
  disabled?: boolean;
  initialRaceSlug?: string | null;
  initialSubclassSlug?: string | null;
  initialClassSubclass?: string | null;
  initialBackgroundSlug?: string | null;
  initialClassLabel?: string | null;
};

export function CharacterBuildFormFields({
  disabled = false,
  initialRaceSlug = null,
  initialSubclassSlug = null,
  initialClassSubclass = null,
  initialBackgroundSlug = null,
  initialClassLabel = null,
}: CharacterBuildFormFieldsProps) {
  const [race, setRace] = useState<string>(initialRaceSlug ?? "__none__");
  const [sub, setSub] = useState<string>(initialSubclassSlug ?? "__none__");
  const [bg, setBg] = useState<string>(initialBackgroundSlug ?? "__none__");
  const [cls, setCls] = useState<string>(initialClassLabel ?? "__none__");
  const [classSubclass, setClassSubclass] = useState<string>(initialClassSubclass ?? "");
  const customClass =
    initialClassLabel &&
    !CLASS_OPTIONS.some((c) => c.label === initialClassLabel) &&
    initialClassLabel.trim()
      ? initialClassLabel.trim()
      : null;

  const effectiveClassLabel = cls !== "__none__" ? cls : customClass;
  const supplementSubs = useMemo(
    () => supplementSubclassesForClass(effectiveClassLabel ?? null),
    [effectiveClassLabel]
  );

  function deriveSubclassPick(parent: string | null | undefined, subText: string): string {
    if (!subText.trim()) return "__none__";
    if (!parent?.trim()) return "__custom__";
    const m = matchSupplementSubclass(parent, subText);
    return m ? m.slug : "__custom__";
  }

  const [subclassPick, setSubclassPick] = useState<string>(() =>
    deriveSubclassPick(initialClassLabel?.trim() ? initialClassLabel.trim() : null, initialClassSubclass ?? "")
  );

  useEffect(() => {
    setRace(initialRaceSlug ?? "__none__");
    setSub(initialSubclassSlug ?? "__none__");
    setClassSubclass(initialClassSubclass ?? "");
    setBg(initialBackgroundSlug ?? "__none__");
    setCls(initialClassLabel ?? "__none__");
    const parent =
      initialClassLabel && initialClassLabel !== "__none__" ? initialClassLabel.trim() : customClass;
    setSubclassPick(deriveSubclassPick(parent ?? null, initialClassSubclass ?? ""));
  }, [initialRaceSlug, initialSubclassSlug, initialClassSubclass, initialBackgroundSlug, initialClassLabel, customClass]);

  useEffect(() => {
    setSubclassPick(deriveSubclassPick(effectiveClassLabel ?? null, classSubclass));
  }, [effectiveClassLabel, classSubclass]);

  const subOptions = useMemo(() => raceBySlug(race === "__none__" ? null : race)?.subraces ?? [], [race]);

  useEffect(() => {
    if (sub !== "__none__" && !subOptions.some((s) => s.slug === sub)) setSub("__none__");
  }, [subOptions, sub]);

  return (
    <div className="space-y-3 rounded-lg border border-barber-gold/25 bg-barber-dark/50 p-3">
      <p className="text-xs font-medium text-barber-gold">Regole (PHB + supplementi mappati)</p>
      <p className="text-[11px] text-barber-paper/60">
        Sottoclassi PHB, XGE e TCE in elenco; altre fonti o testo libero con &quot;Altro&quot;. Il background narrativo resta nel campo testo sotto.
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
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-barber-paper/90">Sottoclasse (classe)</Label>
          {supplementSubs.length > 0 ? (
            <Select
              value={subclassPick}
              onValueChange={(slug) => {
                setSubclassPick(slug);
                if (slug === "__none__") setClassSubclass("");
                else if (slug === "__custom__") {
                  /* testo sotto */
                } else {
                  const e = supplementSubclassBySlug(slug);
                  setClassSubclass(e?.label ?? "");
                }
              }}
              disabled={disabled}
            >
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
                <SelectValue placeholder="Scegli o altro" />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper max-h-64 overflow-y-auto">
                <SelectItem value="__none__">— Nessuna —</SelectItem>
                {supplementSubs.map((s) => (
                  <SelectItem key={s.slug} value={s.slug}>
                    {s.label} ({subclassCatalogSourceSuffix(s)})
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Altro (PHB o testo libero)…</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          {(subclassPick === "__custom__" || supplementSubs.length === 0) && (
            <input
              value={classSubclass}
              onChange={(e) => {
                const v = e.target.value;
                setClassSubclass(v);
                setSubclassPick(deriveSubclassPick(effectiveClassLabel ?? null, v));
              }}
              placeholder="Es. Cammino del Berserker, Dominio della Vita…"
              className="mt-1.5 h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark/80 px-3 text-sm text-barber-paper placeholder:text-barber-paper/45"
              disabled={disabled}
            />
          )}
          <input type="hidden" name="class_subclass" value={classSubclass} readOnly />
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
