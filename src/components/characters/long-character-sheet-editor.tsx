"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { saveLongCampaignCharacterSheet, type CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { CLASS_OPTIONS } from "@/lib/character-build-catalog";
import {
  ALL_CHARACTER_SKILLS,
  QUICK_WEAPONS_5E,
  buildCalculatedWeaponRow,
  computeProficiencyBonus,
  deriveCharacterSheetRules,
} from "@/lib/character-rules-calc";
import type {
  CharacterAbilityKey,
  CharacterSheetPersonality,
  CharacterSheetSpell,
  CharacterSheetV1,
  CharacterSkillKey,
} from "@/lib/character-sheet";
import type { GmDefinedFeatureInput } from "@/lib/character-sheet-mutations";
import {
  applyClassDefaultSavingThrows,
  applySheetCheckUpdate,
  buildLongSheetSubmission,
  createInitialLongEditorState,
  parseOptionalFiniteNumber,
  type LongSheetListDrafts,
  type LongSheetListKey,
} from "@/lib/long-sheet-editor-model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ABILITIES: Array<{ key: CharacterAbilityKey; label: string }> = [
  { key: "str", label: "Forza" },
  { key: "dex", label: "Destrezza" },
  { key: "con", label: "Costituzione" },
  { key: "int", label: "Intelligenza" },
  { key: "wis", label: "Saggezza" },
  { key: "cha", label: "Carisma" },
];

type CompendiumSpellItem = CharacterSheetSpell & { sourceBook?: string };

export function LongCharacterSheetEditor({
  character,
  open,
  onOpenChange,
}: {
  character: CampaignCharacterRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [initial] = useState(() => createInitialLongEditorState(character));
  const [sheet, setSheet] = useState<CharacterSheetV1>(initial.sheet);
  const [name, setName] = useState(initial.name);
  const [classLabel, setClassLabel] = useState(initial.classLabel);
  const [classSubclass, setClassSubclass] = useState(initial.classSubclass);
  const [level, setLevel] = useState(initial.level);
  const [armorClass, setArmorClass] = useState(initial.armorClass);
  const [hpMax, setHpMax] = useState(initial.hpMax);
  const [background, setBackground] = useState(initial.background);
  const [listDrafts, setListDrafts] = useState<LongSheetListDrafts>(initial.listDrafts);
  const [trackedFeatures, setTrackedFeatures] = useState<GmDefinedFeatureInput[]>(initial.trackedFeatures);

  // Quick weapon builder state
  const [quickWeaponId, setQuickWeaponId] = useState<string>(QUICK_WEAPONS_5E[4]!.id);
  const [quickWeaponProf, setQuickWeaponProf] = useState(true);
  const [quickWeaponMagic, setQuickWeaponMagic] = useState("0");

  // Compendium spell search state
  const [spellQuery, setSpellQuery] = useState("");
  const [spellResults, setSpellResults] = useState<CompendiumSpellItem[]>([]);
  const [searchingSpells, setSearchingSpells] = useState(false);

  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!open) return;
    const next = createInitialLongEditorState(character);
    setSheet(next.sheet);
    setName(next.name);
    setClassLabel(next.classLabel);
    setClassSubclass(next.classSubclass);
    setLevel(next.level);
    setArmorClass(next.armorClass);
    setHpMax(next.hpMax);
    setBackground(next.background);
    setListDrafts(next.listDrafts);
    setTrackedFeatures(next.trackedFeatures);
    setSpellQuery("");
    setSpellResults([]);
  }, [character, open]);

  const parsedLevelNum = Math.max(1, Math.min(20, Math.trunc(parseOptionalFiniteNumber(level) ?? 1)));
  const currentPb = sheet.proficiencyBonus ?? computeProficiencyBonus(parsedLevelNum);

  function recomputeIfManual(
    candidate: CharacterSheetV1,
    overrides?: { cls?: string; sub?: string; lvl?: number },
  ): CharacterSheetV1 {
    if (candidate.source === "recovered") return candidate;
    return deriveCharacterSheetRules(candidate, {
      characterClass: (overrides?.cls ?? classLabel).trim() || null,
      classSubclass: (overrides?.sub ?? classSubclass).trim() || null,
      level: overrides?.lvl ?? parsedLevelNum,
    });
  }

  function update<K extends keyof CharacterSheetV1>(key: K, value: CharacterSheetV1[K] | undefined) {
    setSheet((current) => {
      const next = { ...current };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return recomputeIfManual(next);
    });
  }

  function onClassChange(nextClass: string) {
    setClassLabel(nextClass);
    setSheet((current) =>
      current.source === "recovered"
        ? current
        : applyClassDefaultSavingThrows(current, nextClass, parsedLevelNum),
    );
  }

  function onSubclassChange(nextSub: string) {
    setClassSubclass(nextSub);
    setSheet((current) => recomputeIfManual(current, { sub: nextSub }));
  }

  function onLevelChange(nextLvlRaw: string) {
    setLevel(nextLvlRaw);
    const num = parseOptionalFiniteNumber(nextLvlRaw);
    if (num !== undefined && num >= 1 && num <= 20) {
      setSheet((current) => recomputeIfManual(current, { lvl: Math.trunc(num) }));
    }
  }

  function updateAbilityScore(key: CharacterAbilityKey, raw: string) {
    setSheet((current) => {
      const abilities = { ...(current.abilities ?? {}) };
      const value = parseOptionalFiniteNumber(raw);
      if (value === undefined) delete abilities[key];
      else abilities[key] = Math.trunc(value);
      const next = { ...current };
      if (Object.keys(abilities).length > 0) next.abilities = abilities;
      else delete next.abilities;
      return recomputeIfManual(next);
    });
  }

  function updateSavingThrow(
    key: CharacterAbilityKey,
    field: "value" | "proficient" | "expertise" | "bonusExtra",
    raw: string | boolean,
  ) {
    setSheet((current) => {
      const baseMod = current.abilityMods?.[key] ?? 0;
      const updated = applySheetCheckUpdate(current.savingThrows, key, field, raw, baseMod, currentPb);
      const next = { ...current };
      if (updated) next.savingThrows = updated;
      else delete next.savingThrows;
      return field === "value" ? next : recomputeIfManual(next);
    });
  }

  function updateSkill(
    key: CharacterSkillKey,
    ability: CharacterAbilityKey,
    field: "value" | "proficient" | "expertise" | "bonusExtra",
    raw: string | boolean,
  ) {
    setSheet((current) => {
      const baseMod = current.abilityMods?.[ability] ?? 0;
      const updated = applySheetCheckUpdate(current.skills, key, field, raw, baseMod, currentPb);
      const next = { ...current };
      if (updated) next.skills = updated;
      else delete next.skills;
      return field === "value" ? next : recomputeIfManual(next);
    });
  }

  function updatePersonality(field: keyof CharacterSheetPersonality, value: string) {
    setSheet((current) => {
      const nextP: CharacterSheetPersonality = { ...(current.personality ?? {}) };
      if (value) nextP[field] = value;
      else delete nextP[field];
      return { ...current, ...(Object.keys(nextP).length > 0 ? { personality: nextP } : { personality: undefined }) };
    });
  }

  function addPresetWeapon() {
    const preset = QUICK_WEAPONS_5E.find((w) => w.id === quickWeaponId);
    if (!preset) return;
    const row = buildCalculatedWeaponRow({
      name: preset.name,
      damageDie: preset.damageDie,
      versatileDie: preset.versatileDie,
      damageType: preset.damageType,
      mode: preset.mode,
      proficient: quickWeaponProf,
      magicBonus: parseOptionalFiniteNumber(quickWeaponMagic) ?? 0,
      abilityMods: sheet.abilityMods,
      proficiencyBonus: currentPb,
    });
    update("weaponRows", [...(sheet.weaponRows ?? []), row]);
  }

  function updateWeapon(index: number, field: "name" | "toHit" | "damage" | "type", value: string) {
    update(
      "weaponRows",
      (sheet.weaponRows ?? []).map((weapon, i) => (i === index ? { ...weapon, [field]: value } : weapon)),
    );
  }

  function updateSpell(index: number, field: keyof CharacterSheetSpell, value: string | number | boolean) {
    update(
      "spells",
      (sheet.spells ?? []).map((spell, i) => (i === index ? { ...spell, [field]: value } : spell)),
    );
  }

  function removeListItem(key: "weaponRows" | "spells", index: number) {
    const values = sheet[key] ?? [];
    update(key, values.filter((_, i) => i !== index) as CharacterSheetV1[typeof key]);
  }

  async function runCompendiumSearch() {
    if (!spellQuery.trim()) return;
    setSearchingSpells(true);
    try {
      const res = await fetch(`/api/mobile/compendium/spells?q=${encodeURIComponent(spellQuery.trim())}`);
      const data = (await res.json().catch(() => ({}))) as { spells?: CompendiumSpellItem[] };
      setSpellResults(Array.isArray(data.spells) ? data.spells : []);
    } catch {
      toast.error("Errore nella ricerca dal compendio.");
    } finally {
      setSearchingSpells(false);
    }
  }

  function addSpellFromCompendium(item: CompendiumSpellItem) {
    const { sourceBook: _sb, ...clean } = item;
    const next = [...(sheet.spells ?? []), { ...clean, prepared: true }].sort(
      (a, b) => a.level - b.level || a.name.localeCompare(b.name, "it"),
    );
    update("spells", next);
    toast.success(`Aggiunto «${item.name}».`);
  }

  const show = (raw: string | undefined, setter: (value: string) => void, label: string, hint?: string, rows = 3) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        value={raw ?? ""}
        onChange={(event) => setter(event.target.value)}
        rows={rows}
        placeholder={hint}
        disabled={saving}
        className="resize-y border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
      />
    </div>
  );

  const showList = (key: LongSheetListKey, label: string, hint?: string, rows = 3) =>
    show(
      listDrafts[key],
      (value) => setListDrafts((prev) => ({ ...prev, [key]: value })),
      label,
      hint,
      rows,
    );

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const built = buildLongSheetSubmission({
      expectedUpdatedAt: character.updated_at,
      sheet,
      name,
      classLabel,
      classSubclass,
      level,
      armorClass,
      hpMax,
      background,
      listDrafts,
      trackedFeatures,
    });
    if (!built.ok) {
      toast.error(built.error);
      return;
    }
    startSaving(async () => {
      const result = await saveLongCampaignCharacterSheet(character.id, character.campaign_id, built.payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Scheda salvata e calcoli D&D 5e aggiornati.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-5xl overflow-y-auto border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-xl text-gold-relief">
            Scheda cartacea Long · {character.name}
          </DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Modificatori, Bonus Competenza (+{currentPb}), Tiri Salvezza, tutte le 18 Abilità, Percezione Passiva, Dadi Vita, Slot e CD Incantesimi si calcolano automaticamente da Classe, Livello e Caratteristiche. Puoi aggiungere bonus extra o override dove previsto dal cartaceo.
          </DialogDescription>
        </DialogHeader>

        {sheet.source === "recovered" && sheet.level != null && character.level != null && sheet.level !== character.level ? (
          <div role="note" className="border-l-2 border-amber-400 px-3 py-2 text-sm text-amber-100">
            Il PDF recuperato indica livello {sheet.level}, mentre il registro campagna indica {character.level}. Il salvataggio conserva entrambi i valori finché non sono verificati.
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-6">
          {/* 1. IDENTITÀ E VALORI COMBATTIMENTO */}
          <section className="space-y-3">
            <h3 className="border-b border-barber-gold/20 pb-2 font-cinzel text-base text-barber-gold">
              1. Identità, Classe e Difese (Solo GM/Admin)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Nome personaggio</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
              </div>
              <div className="space-y-1.5">
                <Label>Classe D&D 5e</Label>
                <select
                  value={CLASS_OPTIONS.some((c) => c.label === classLabel) ? classLabel : "__custom__"}
                  onChange={(e) => {
                    if (e.target.value !== "__custom__") onClassChange(e.target.value);
                  }}
                  disabled={saving}
                  className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 text-sm text-barber-paper"
                >
                  <option value="__custom__">{classLabel ? `${classLabel} (personalizzata)` : "— Scegli classe —"}</option>
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c.slug} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Sottoclasse</Label>
                <Input value={classSubclass} onChange={(e) => onSubclassChange(e.target.value)} placeholder="Es. Cavaliere Mistico, Dominio Vita…" disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
              </div>
              <div className="space-y-1.5">
                <Label>{sheet.source === "recovered" ? "Livello registro campagna" : "Livello (1–20)"}</Label>
                <Input type="number" min={1} max={20} value={level} onChange={(e) => onLevelChange(e.target.value)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
              </div>

              {[
                ["Razza", sheet.raceLabel ?? "", (v: string) => update("raceLabel", v || undefined)],
                ["Sottorazza", sheet.subraceLabel ?? "", (v: string) => update("subraceLabel", v || undefined)],
                ["Background", sheet.backgroundLabel ?? "", (v: string) => update("backgroundLabel", v || undefined)],
                ["Allineamento", sheet.alignment ?? "", (v: string) => update("alignment", v || null)],
                ["Classe Armatura (CA)", armorClass, setArmorClass],
                ["PF Massimi", hpMax, setHpMax],
                ["Velocità", sheet.speed ?? "", (v: string) => update("speed", v || undefined)],
                ["Bonus extra Iniziativa (es. +5 Allerta)", String(sheet.initiativeBonus ?? ""), (v: string) => update("initiativeBonus", parseOptionalFiniteNumber(v))],
                ["Sensi (es. Scurovisione 18 m)", sheet.senses ?? "", (v: string) => update("senses", v || null)],
                ["Resistenze / Immunità", sheet.resistances ?? "", (v: string) => update("resistances", v || null)],
                ["Età", sheet.age ?? "", (v: string) => update("age", v || null)],
                ["Altezza / Peso / Sesso", [sheet.height, sheet.weight, sheet.sex].filter(Boolean).join(" · "), (v: string) => update("height", v || null)],
              ].map(([label, value, setter]) => (
                <div key={String(label)} className="space-y-1.5">
                  <Label className="text-xs">{String(label)}</Label>
                  <Input value={String(value)} onChange={(e) => (setter as (v: string) => void)(e.target.value)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
                </div>
              ))}
            </div>

            {/* Riepilogo calcoli automatici + Dadi Vita */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-barber-gold/25 bg-black/25 px-3 py-2 text-xs text-barber-paper/85">
              <div className="flex flex-wrap gap-4">
                <span>Bonus Competenza: <strong className="text-barber-gold">+{currentPb}</strong></span>
                <span>Iniziativa calcolata: <strong className="text-barber-gold">{sheet.initiative !== undefined ? (sheet.initiative >= 0 ? `+${sheet.initiative}` : sheet.initiative) : "—"}</strong></span>
                <span>Percezione Passiva: <strong className="text-barber-gold">{sheet.passivePerception ?? "—"}</strong></span>
                <span>Dadi Vita: <strong className="text-barber-gold">{sheet.hitDiceTotal ?? parsedLevelNum}{sheet.hitDie ?? ""}</strong></span>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(sheet.manualHitDiceOverride)}
                  onChange={(e) => update("manualHitDiceOverride", e.target.checked || undefined)}
                  disabled={saving}
                />
                Personalizza Dadi Vita manualmente (multiclasse)
              </label>
            </div>
            {sheet.manualHitDiceOverride ? (
              <div className="grid grid-cols-2 gap-3 sm:w-80">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo Dado Vita (es. d8)</Label>
                  <Input value={sheet.hitDie ?? ""} onChange={(e) => update("hitDie", e.target.value || undefined)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Totale Dadi Vita</Label>
                  <Input type="number" min={1} max={20} value={sheet.hitDiceTotal ?? ""} onChange={(e) => update("hitDiceTotal", parseOptionalFiniteNumber(e.target.value))} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
                </div>
              </div>
            ) : null}
          </section>

          {/* 2. CARATTERISTICHE E TIRI SALVEZZA */}
          <section className="space-y-3">
            <h3 className="border-b border-barber-gold/20 pb-2 font-cinzel text-base text-barber-gold">
              2. Punteggi Caratteristica e Tiri Salvezza (Calcolo automatico)
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {ABILITIES.map(({ key, label }) => {
                const mod = sheet.abilityMods?.[key];
                const check = sheet.savingThrows?.[key];
                return (
                  <div key={key} className="space-y-2 rounded border border-barber-gold/25 bg-black/20 p-2.5">
                    <div className="flex items-baseline justify-between">
                      <Label className="font-semibold text-barber-gold">{label}</Label>
                      <span className="text-xs font-semibold tabular-nums text-barber-paper/80">
                        Mod {mod === undefined ? "—" : mod >= 0 ? `+${mod}` : mod}
                      </span>
                    </div>
                    <Input
                      aria-label={`${label}, punteggio`}
                      type="number"
                      min={1}
                      max={30}
                      value={sheet.abilities?.[key] ?? ""}
                      onChange={(e) => updateAbilityScore(key, e.target.value)}
                      placeholder="Es. 16"
                      disabled={saving}
                      className="border-barber-gold/30 bg-barber-dark/80 text-center text-base font-bold text-barber-paper"
                    />
                    <div className="border-t border-barber-gold/15 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Tiro Salvezza</span>
                        <strong className="tabular-nums text-barber-gold">
                          {check?.value === undefined ? "—" : check.value >= 0 ? `+${check.value}` : check.value}
                        </strong>
                      </div>
                      <label className="mt-1.5 flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={check?.proficient ?? false}
                          disabled={saving}
                          onChange={(e) => updateSavingThrow(key, "proficient", e.target.checked)}
                        />
                        Competente
                      </label>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[11px] text-barber-paper/60">Extra:</span>
                        <Input
                          aria-label={`${label}, bonus extra tiro salvezza`}
                          type="number"
                          value={check?.bonusExtra ?? ""}
                          onChange={(e) => updateSavingThrow(key, "bonusExtra", e.target.value)}
                          placeholder="+0"
                          disabled={saving}
                          className="h-7 border-barber-gold/25 bg-barber-dark/80 px-2 text-xs text-barber-paper"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 3. TUTTE LE 18 ABILITÀ */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-barber-gold/20 pb-2">
              <h3 className="font-cinzel text-base text-barber-gold">3. Tutte le 18 Abilità (Solo GM/Admin)</h3>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(sheet.jackOfAllTrades)}
                    disabled={saving}
                    onChange={(e) => update("jackOfAllTrades", e.target.checked)}
                  />
                  Factotum (Bardo +⌊BC/2⌋)
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-barber-paper/65">Extra Percezione Passiva:</span>
                  <Input
                    type="number"
                    value={sheet.passivePerceptionBonus ?? ""}
                    onChange={(e) => update("passivePerceptionBonus", parseOptionalFiniteNumber(e.target.value))}
                    placeholder="+0"
                    disabled={saving}
                    className="h-7 w-16 border-barber-gold/30 bg-barber-dark/80 px-2 text-xs text-barber-paper"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-barber-paper/60">
                    <th className="py-2 pr-3">Abilità</th>
                    <th className="py-2 pr-3">Stat</th>
                    <th className="py-2 pr-3">Totale</th>
                    <th className="py-2 pr-3">Competente</th>
                    <th className="py-2 pr-3">Maestria (×2)</th>
                    <th className="py-2">Bonus Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_CHARACTER_SKILLS.map(({ key, label, ability, abilityLabel }) => {
                    const check = sheet.skills?.[key];
                    return (
                      <tr key={key} className="border-t border-barber-gold/10">
                        <th className="py-1.5 pr-3 text-left font-normal">{label}</th>
                        <td className="py-1.5 pr-3 text-xs text-barber-paper/55">{abilityLabel}</td>
                        <td className="py-1.5 pr-3 font-semibold tabular-nums text-barber-gold">
                          {check?.value === undefined ? "—" : check.value >= 0 ? `+${check.value}` : check.value}
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            aria-label={`${label}, competenza`}
                            type="checkbox"
                            checked={check?.proficient ?? false}
                            disabled={saving}
                            onChange={(e) => updateSkill(key, ability, "proficient", e.target.checked)}
                          />
                        </td>
                        <td className="py-1.5 pr-3">
                          <input
                            aria-label={`${label}, maestria`}
                            type="checkbox"
                            checked={check?.expertise ?? false}
                            disabled={saving}
                            onChange={(e) => updateSkill(key, ability, "expertise", e.target.checked)}
                          />
                        </td>
                        <td className="py-1.5">
                          <Input
                            aria-label={`${label}, bonus extra`}
                            type="number"
                            value={check?.bonusExtra ?? ""}
                            onChange={(e) => updateSkill(key, ability, "bonusExtra", e.target.value)}
                            placeholder="+0"
                            disabled={saving}
                            className="h-7 w-20 border-barber-gold/25 bg-barber-dark/80 px-2 text-xs text-barber-paper"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* 4. CAPACITÀ A USI LIMITATI */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-barber-gold/20 pb-2">
              <div>
                <h3 className="font-cinzel text-base text-barber-gold">
                  4. Capacità e Risorse a Usi Limitati (Ira, Ki, Secondo Fiato, Incanalare Divinità…)
                </h3>
                <p className="text-xs text-barber-paper/60">
                  Definite dal Master; il giocatore può consumarne gli usi e i Riposi le ricaricano automaticamente.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() =>
                  setTrackedFeatures((prev) => [
                    ...prev,
                    {
                      id: `feat-${Date.now()}-${prev.length + 1}`,
                      name: "",
                      source: "class",
                      description: "",
                      usesMax: 1,
                      resetOn: "longRest",
                    },
                  ])
                }
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Aggiungi capacità
              </Button>
            </div>
            {trackedFeatures.length > 0 ? (
              <div className="space-y-2">
                {trackedFeatures.map((feat, idx) => (
                  <div key={feat.id} className="space-y-2 rounded border border-barber-gold/20 bg-black/20 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1.4fr_0.8fr_0.6fr_0.9fr_auto]">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome capacità</Label>
                        <Input
                          value={feat.name}
                          onChange={(e) =>
                            setTrackedFeatures((prev) => prev.map((f, i) => (i === idx ? { ...f, name: e.target.value } : f)))
                          }
                          placeholder="Es. Ira, Punti Ki, Secondo Fiato"
                          disabled={saving}
                          className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Origine</Label>
                        <select
                          value={feat.source}
                          onChange={(e) =>
                            setTrackedFeatures((prev) =>
                              prev.map((f, i) => (i === idx ? { ...f, source: e.target.value as GmDefinedFeatureInput["source"] } : f)),
                            )
                          }
                          disabled={saving}
                          className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-xs text-barber-paper"
                        >
                          <option value="class">Classe</option>
                          <option value="subclass">Sottoclasse</option>
                          <option value="race">Razza</option>
                          <option value="feat">Talento / Oggetto</option>
                          <option value="background">Background</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Usi Max</Label>
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={feat.usesMax}
                          onChange={(e) =>
                            setTrackedFeatures((prev) =>
                              prev.map((f, i) => (i === idx ? { ...f, usesMax: Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1) } : f)),
                            )
                          }
                          disabled={saving}
                          className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ricarica</Label>
                        <select
                          value={feat.resetOn}
                          onChange={(e) =>
                            setTrackedFeatures((prev) =>
                              prev.map((f, i) => (i === idx ? { ...f, resetOn: e.target.value as "shortRest" | "longRest" } : f)),
                            )
                          }
                          disabled={saving}
                          className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-xs text-barber-paper"
                        >
                          <option value="shortRest">Riposo Breve</option>
                          <option value="longRest">Riposo Lungo</option>
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={saving}
                        onClick={() => setTrackedFeatures((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Input
                      value={feat.description}
                      onChange={(e) =>
                        setTrackedFeatures((prev) => prev.map((f, i) => (i === idx ? { ...f, description: e.target.value } : f)))
                      }
                      placeholder="Effetto sintetico (opzionale)"
                      disabled={saving}
                      className="border-barber-gold/25 bg-barber-dark/80 text-xs text-barber-paper"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-barber-paper/55">Nessuna capacità a usi inserita.</p>
            )}
          </section>

          {/* 5. ATTACCHI, ARMI ED EQUIPAGGIAMENTO */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-barber-gold/20 pb-2">
              <h3 className="font-cinzel text-base text-barber-gold">
                5. Armi, Zaino e Competenze (Armi e Zaino modificabili anche dal Giocatore)
              </h3>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => update("weaponRows", [...(sheet.weaponRows ?? []), { name: "", toHit: "", damage: "", type: "" }])}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Riga vuota
              </Button>
            </div>

            {/* Selettore rapido arma con calcolo automatico */}
            <div className="flex flex-wrap items-end gap-2 rounded border border-barber-gold/20 bg-black/20 p-2.5">
              <div className="min-w-[180px] flex-1 space-y-1">
                <Label className="text-xs">Aggiungi arma D&D 5e (calcola TxC e Danno)</Label>
                <select
                  value={quickWeaponId}
                  onChange={(e) => setQuickWeaponId(e.target.value)}
                  disabled={saving}
                  className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-xs text-barber-paper"
                >
                  {QUICK_WEAPONS_5E.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.damageDie} {w.damageType})
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex h-9 items-center gap-1.5 px-2 text-xs">
                <input type="checkbox" checked={quickWeaponProf} onChange={(e) => setQuickWeaponProf(e.target.checked)} />
                Competente
              </label>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Magia</Label>
                <select
                  value={quickWeaponMagic}
                  onChange={(e) => setQuickWeaponMagic(e.target.value)}
                  className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-xs text-barber-paper"
                >
                  <option value="0">+0</option>
                  <option value="1">+1</option>
                  <option value="2">+2</option>
                  <option value="3">+3</option>
                </select>
              </div>
              <Button type="button" size="sm" onClick={addPresetWeapon} disabled={saving} className="h-9 bg-barber-gold/20 text-barber-gold hover:bg-barber-gold/30">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Calcola e aggiungi
              </Button>
            </div>

            {(sheet.weaponRows ?? []).length ? (
              <div className="space-y-2">
                {sheet.weaponRows?.map((weapon, index) => (
                  <div
                    key={`weapon-${index}`}
                    className="grid gap-2 rounded border border-barber-gold/15 p-3 sm:grid-cols-[1.2fr_0.7fr_1fr_0.8fr_auto]"
                  >
                    {(
                      [
                        ["Arma", "name"],
                        ["Bonus attacco", "toHit"],
                        ["Danno", "damage"],
                        ["Tipo", "type"],
                      ] as const
                    ).map(([label, key]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Input
                          value={weapon[key]}
                          onChange={(e) => updateWeapon(index, key, e.target.value)}
                          disabled={saving}
                          className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Rimuovi ${weapon.name || "attacco"}`}
                      disabled={saving}
                      onClick={() => removeListItem("weaponRows", index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {showList("inventory", "Zaino / Inventario", "Un oggetto per riga", 5)}
              {showList("attunements", "Oggetti Magici in Sintonizzazione (max 3)", "Un oggetto per riga", 3)}
              {showList("languages", "Lingue", "Una lingua per riga")}
              {showList("armorProficiencies", "Competenze armature", "Una per riga")}
              {showList("weaponProficiencies", "Competenze armi", "Una per riga")}
              {showList("toolProficiencies", "Competenze strumenti", "Una per riga")}
              {showList("proficiencies", "Altre competenze", "Una per riga")}
            </div>
          </section>

          {/* 6. SLOT INCANTESIMI E LISTA INCANTESIMI */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-barber-gold/20 pb-2">
              <div>
                <h3 className="font-cinzel text-base text-barber-gold">
                  6. Slot Massimi (Solo GM) e Incantesimi del PG (GM + Giocatore)
                </h3>
                <p className="text-xs text-barber-paper/60">
                  CD calcolata: <strong>{sheet.spellSaveDc ?? "—"}</strong> · Attacco magico: <strong>{sheet.spellAttackBonus != null ? (sheet.spellAttackBonus >= 0 ? `+${sheet.spellAttackBonus}` : sheet.spellAttackBonus) : "—"}</strong> · Trucchetti: <strong>{sheet.cantripsKnown ?? "—"}</strong> · Preparabili: <strong>{sheet.spellsPrepared ?? "—"}</strong>
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(sheet.manualSpellSlotsOverride)}
                  disabled={saving}
                  onChange={(e) => update("manualSpellSlotsOverride", e.target.checked || undefined)}
                />
                Personalizza numero di slot manualmente (multiclasse)
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Caratteristica da incantatore</Label>
                <select
                  value={sheet.spellcastingAbility ?? ""}
                  onChange={(e) => update("spellcastingAbility", (e.target.value || null) as CharacterSheetV1["spellcastingAbility"])}
                  className="h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-xs text-barber-paper"
                >
                  <option value="">Automatica da classe / Nessuna</option>
                  {ABILITIES.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bonus extra CD Incantesimi (es. Focus +1)</Label>
                <Input type="number" value={sheet.spellDcBonus ?? ""} onChange={(e) => update("spellDcBonus", parseOptionalFiniteNumber(e.target.value))} placeholder="+0" disabled={saving} className="h-9 border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Bonus extra Attacco Magico</Label>
                <Input type="number" value={sheet.spellAttackBonusExtra ?? ""} onChange={(e) => update("spellAttackBonusExtra", parseOptionalFiniteNumber(e.target.value))} placeholder="+0" disabled={saving} className="h-9 border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
              {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((levelValue) => (
                <div key={levelValue} className="space-y-1">
                  <Label className="text-xs">Slot {levelValue}°</Label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={sheet.spellSlots?.[levelValue] ?? ""}
                    disabled={saving || !sheet.manualSpellSlotsOverride}
                    onChange={(e) => {
                      const slots = { ...(sheet.spellSlots ?? {}) };
                      const rawVal = parseOptionalFiniteNumber(e.target.value);
                      if (rawVal === undefined || rawVal <= 0) delete slots[levelValue];
                      else slots[levelValue] = Math.max(0, Math.min(99, Math.trunc(rawVal)));
                      update("spellSlots", Object.keys(slots).length > 0 ? slots : undefined);
                    }}
                    className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper disabled:opacity-65"
                  />
                </div>
              ))}
            </div>

            {/* Ricerca dal compendio */}
            <div className="space-y-2 rounded border border-barber-gold/25 bg-black/25 p-3">
              <Label className="text-xs text-barber-gold">Cerca incantesimo nei manuali (PHB, Xanathar, Tasha)</Label>
              <div className="flex gap-2">
                <Input
                  value={spellQuery}
                  onChange={(e) => setSpellQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void runCompendiumSearch();
                    }
                  }}
                  placeholder="Es. Palla di Fuoco, Scudo, Cura Ferite…"
                  className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                />
                <Button type="button" variant="outline" disabled={searchingSpells} onClick={() => void runCompendiumSearch()}>
                  <Search className="mr-1.5 h-4 w-4" />
                  {searchingSpells ? "Cerco…" : "Cerca"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => update("spells", [...(sheet.spells ?? []), { level: 0, name: "", summary: "", prepared: true }])}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Manuale
                </Button>
              </div>
              {spellResults.length > 0 ? (
                <div className="max-h-44 space-y-1 overflow-y-auto pt-1">
                  {spellResults.map((res, idx) => (
                    <div key={`${res.name}-${idx}`} className="flex items-center justify-between gap-2 rounded border border-barber-gold/15 bg-barber-dark/80 px-2.5 py-1.5 text-xs">
                      <div className="min-w-0">
                        <strong className="text-barber-paper">{res.name}</strong>{" "}
                        <span className="text-barber-gold">({res.level === 0 ? "Trucchetto" : `${res.level}° liv.`})</span>
                        <p className="truncate text-barber-paper/60">{res.summary}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={() => addSpellFromCompendium(res)}>
                        Aggiungi
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {(sheet.spells ?? []).length ? (
              <div className="space-y-2">
                {sheet.spells?.map((spell, index) => (
                  <div key={`spell-${index}`} className="space-y-2 rounded border border-barber-gold/15 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
                      <Input
                        value={spell.name}
                        onChange={(e) => updateSpell(index, "name", e.target.value)}
                        placeholder="Nome incantesimo"
                        disabled={saving}
                        className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                      />
                      <Input
                        type="number"
                        min={0}
                        max={9}
                        value={spell.level}
                        onChange={(e) => {
                          const parsed = parseOptionalFiniteNumber(e.target.value);
                          updateSpell(index, "level", parsed === undefined ? 0 : Math.max(0, Math.min(9, Math.trunc(parsed))));
                        }}
                        disabled={saving}
                        className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                      />
                      <Button type="button" variant="ghost" size="icon" disabled={saving} onClick={() => removeListItem("spells", index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={spell.summary}
                      onChange={(e) => updateSpell(index, "summary", e.target.value)}
                      rows={2}
                      placeholder="Note / sintesi effetto"
                      disabled={saving}
                      className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper"
                    />
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {(
                        [
                          ["Preparato", "prepared"],
                          ["Rituale", "ritual"],
                          ["Concentrazione", "concentration"],
                          ["V", "verbal"],
                          ["S", "somatic"],
                          ["M", "material"],
                        ] as const
                      ).map(([label, key]) => (
                        <label key={key} className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            checked={spell[key] ?? false}
                            disabled={saving}
                            onChange={(e) => updateSpell(index, key, e.target.checked)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* 7. PERSONALITÀ CARTACEA, PRIVILEGI TESTUALI E STORIA */}
          <section className="space-y-3">
            <h3 className="border-b border-barber-gold/20 pb-2 font-cinzel text-base text-barber-gold">
              7. Personalità Cartacea, Appunti e Privilegi Descrittivi
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {show(sheet.personality?.traits ?? "", (v) => updatePersonality("traits", v), "Tratti caratteriali", undefined, 2)}
              {show(sheet.personality?.ideals ?? "", (v) => updatePersonality("ideals", v), "Ideali", undefined, 2)}
              {show(sheet.personality?.bonds ?? "", (v) => updatePersonality("bonds", v), "Legami", undefined, 2)}
              {show(sheet.personality?.flaws ?? "", (v) => updatePersonality("flaws", v), "Difetti", undefined, 2)}
              {show(sheet.playerNotes ?? "", (v) => update("playerNotes", v || null), "Appunti di sessione del PG", undefined, 3)}
              {show(background, setBackground, "Storia / Background narrativo", undefined, 3)}
              {show(sheet.raceTraitsMd, (v) => update("raceTraitsMd", v || undefined), "Tratti di razza (testo scheda)", undefined, 4)}
              {show(sheet.classFeaturesMd, (v) => update("classFeaturesMd", v || undefined), "Privilegi di classe (testo scheda)", undefined, 4)}
              {show(sheet.subclassFeaturesMd ?? "", (v) => update("subclassFeaturesMd", v || null), "Privilegi di sottoclasse", undefined, 4)}
              {show(sheet.backgroundMd ?? "", (v) => update("backgroundMd", v || null), "Privilegio background", undefined, 4)}
            </div>
          </section>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annulla
            </Button>
            <Button type="submit" disabled={saving} className="bg-barber-red text-barber-paper hover:bg-barber-red/90">
              {saving ? "Salvataggio…" : "Salva scheda Long"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
