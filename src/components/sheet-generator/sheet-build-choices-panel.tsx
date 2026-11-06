"use client";

import { useMemo, useState } from "react";
import {
  applySlotChange,
  slotsToOverrides,
} from "@/lib/sheet-generator/build-choices-client";
import type {
  BuildChoiceSlot,
  BuildChoicesPreview,
  CharacterBuildOverrides,
} from "@/lib/sheet-generator/build-choices-types";
import {
  WEAPON_CATALOG,
  findWeaponDefinition,
  type SelectedWeaponChoice,
} from "@/lib/sheet-generator/weapon-catalog";

type Props = {
  preview: BuildChoicesPreview;
  level: number;
  disabled?: boolean;
  onChange: (slots: BuildChoiceSlot[], overrides: CharacterBuildOverrides) => void;
};

const PROPERTY_LABELS_IT: Record<string, string> = {
  finesse: "Accurata",
  thrown: "Da lancio",
  versatile: "Versatile",
  "two-handed": "A due mani",
  light: "Leggera",
  heavy: "Pesante",
  reach: "Portata",
  ammunition: "Munizioni",
  loading: "Ricarica",
  special: "Speciale",
};

export function SheetBuildChoicesPanel({ preview, level, disabled, onChange }: Props) {
  const [slots, setSlots] = useState<BuildChoiceSlot[]>(preview.slots);
  const [weapons, setWeapons] = useState<SelectedWeaponChoice[]>(() => {
    return preview.overrides?.weapons ? [...preview.overrides.weapons] : [];
  });
  const [weaponToAdd, setWeaponToAdd] = useState<string>("pugnale");

  const catalogGroups = useMemo(() => {
    const map = new Map<string, typeof WEAPON_CATALOG>();
    for (const w of WEAPON_CATALOG) {
      if (w.id === "colpo-senz-armi") continue;
      const list = map.get(w.categoryLabel) ?? [];
      list.push(w);
      map.set(w.categoryLabel, list);
    }
    return [...map.entries()];
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, BuildChoiceSlot[]>();
    for (const s of slots) {
      const activeId = s.id.replace(/^artificer-(?:state|resistance)-/, "artificer-active-");
      const assignment = slots.find((v) => v.id === activeId)?.value;
      if (s.id.startsWith("artificer-state-") && !assignment) continue;
      if (s.id.startsWith("artificer-resistance-") && !assignment?.startsWith("resistant::")) continue;
      const list = map.get(s.group) ?? [];
      list.push(s);
      map.set(s.group, list);
    }
    return [...map.entries()];
  }, [slots]);

  function notifyChange(newSlots: BuildChoiceSlot[], newWeapons: SelectedWeaponChoice[]) {
    const baseOverrides = slotsToOverrides(newSlots);
    onChange(newSlots, {
      ...baseOverrides,
      weapons: newWeapons,
    });
  }

  function updateSlot(slotId: string, value: string) {
    const next = applySlotChange(slots, slotId, value, level);
    setSlots(next);
    notifyChange(next, weapons);
  }

  function handleAddWeapon() {
    const def = findWeaponDefinition(weaponToAdd);
    if (!def) return;
    const next = [
      ...weapons,
      { id: `wpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, weaponId: def.id, twoHanded: false },
    ];
    setWeapons(next);
    notifyChange(slots, next);
  }

  function handleRemoveWeapon(index: number) {
    const next = weapons.filter((_, i) => i !== index);
    setWeapons(next);
    notifyChange(slots, next);
  }

  function handleToggleGrip(index: number, twoHanded: boolean) {
    const next = weapons.map((w, i) => (i === index ? { ...w, twoHanded } : w));
    setWeapons(next);
    notifyChange(slots, next);
  }

  function handleReplaceWeapon(index: number, newId: string) {
    const def = findWeaponDefinition(newId);
    if (!def) return;
    const next = weapons.map((w, i) =>
      i === index
        ? { id: `wpn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, weaponId: def.id, twoHanded: false }
        : w
    );
    setWeapons(next);
    notifyChange(slots, next);
  }

  if (!slots.length && !weapons.length) return null;

  return (
    <section className="mt-6 space-y-6 rounded-xl border border-barber-gold/30 bg-barber-dark/60 p-5">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-barber-gold">Personalizza le scelte</h2>
        <p className="text-sm text-barber-paper/70">
          Ogni opzione è precompilata con la selezione calcolata del generatore. Modifica
          competenze, incantesimi, stile e armi prima della generazione finale.
        </p>
      </header>

      {/* Sezione Armi ed Equipaggiamento d'Attacco */}
      <div className="space-y-4 rounded-lg border border-barber-gold/25 bg-barber-dark/40 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-barber-gold">
            Armi in dotazione
          </h3>
          <p className="text-xs text-barber-paper/70">
            Le armi scelte saranno incluse nell&apos;inventario e nella tabella attacchi del PDF con bonus e
            danni calcolati automaticamente. Le capacit&agrave; speciali (come le Lame Psichiche) vengono
            aggiunte automaticamente.
          </p>
        </div>

        {weapons.length === 0 ? (
          <p className="rounded border border-dashed border-barber-gold/20 p-3 text-xs italic text-barber-paper/60">
            Nessuna arma fisica selezionata (elenco intenzionalmente vuoto). Verranno mostrati solo
            attacchi senz&apos;armi o capacit&agrave; di classe.
          </p>
        ) : (
          <div className="space-y-2">
            {weapons.map((w, idx) => {
              const def = findWeaponDefinition(w.weaponId);
              if (!def) return null;
              const isVersatile = def.properties.includes("versatile");

              return (
                <div
                  key={`${w.weaponId}-${idx}`}
                  className="flex flex-col gap-2 rounded-md border border-barber-gold/20 bg-barber-dark/70 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-barber-gold">{def.name}</span>
                      <span className="text-barber-paper/60">•</span>
                      <span className="text-barber-paper/80">
                        {isVersatile && w.twoHanded && def.versatileDamage
                          ? `${def.versatileDamage} ${def.damageType} (a due mani)`
                          : `${def.damage} ${def.damageType}`}
                      </span>
                      {def.range && (
                        <span className="rounded bg-barber-gold/10 px-1.5 py-0.5 text-[10px] text-barber-gold">
                          Gittata {def.range.normal}/{def.range.long ?? def.range.normal * 4} m
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {def.properties.map((p) => (
                        <span
                          key={p}
                          className="rounded border border-barber-gold/15 bg-barber-dark px-1.5 py-0.5 text-[10px] text-barber-paper/70"
                        >
                          {PROPERTY_LABELS_IT[p] ?? p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                    {isVersatile && (
                      <select
                        aria-label={`Impugnatura per ${def.name}`}
                        value={w.twoHanded ? "2h" : "1h"}
                        disabled={disabled}
                        onChange={(e) => handleToggleGrip(idx, e.target.value === "2h")}
                        className="h-8 rounded border border-barber-gold/30 bg-barber-dark px-2 text-xs text-barber-paper focus:outline-none focus:ring-1 focus:ring-barber-gold"
                      >
                        <option value="1h">1 mano ({def.damage})</option>
                        <option value="2h">2 mani ({def.versatileDamage})</option>
                      </select>
                    )}

                    <select
                      aria-label={`Sostituisci ${def.name}`}
                      value={def.id}
                      disabled={disabled}
                      onChange={(e) => handleReplaceWeapon(idx, e.target.value)}
                      className="h-8 max-w-[130px] rounded border border-barber-gold/20 bg-barber-dark px-2 text-xs text-barber-paper/80 focus:outline-none"
                    >
                      {catalogGroups.map(([cat, list]) => (
                        <optgroup key={cat} label={cat}>
                          {list.map((cw) => (
                            <option key={cw.id} value={cw.id}>
                              {cw.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleRemoveWeapon(idx)}
                      className="rounded border border-red-500/30 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Aggiungi arma dal catalogo */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select
            id="add-weapon-select"
            aria-label="Scegli arma da aggiungere"
            value={weaponToAdd}
            disabled={disabled}
            onChange={(e) => setWeaponToAdd(e.target.value)}
            className="h-9 min-w-[200px] flex-1 rounded border border-barber-gold/30 bg-barber-dark px-3 text-xs text-barber-paper focus:outline-none focus:ring-1 focus:ring-barber-gold"
          >
            {catalogGroups.map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((cw) => (
                  <option key={cw.id} value={cw.id}>
                    {cw.name} ({cw.damage} {cw.damageType})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddWeapon}
            className="inline-flex h-9 items-center justify-center rounded border border-barber-gold/50 bg-barber-gold/15 px-3 text-xs font-medium text-barber-gold hover:bg-barber-gold/25 disabled:opacity-50"
          >
            + Aggiungi arma
          </button>
        </div>
      </div>

      {/* Altri gruppi di scelte */}
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
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
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
