"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { saveLongCampaignCharacterSheet, type CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { isCharacterSheetV1, type CharacterSheetV1, type CharacterAbilityKey, type CharacterSkillKey, type CharacterSheetSpell, type CharacterSheetCheck } from "@/lib/character-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ABILITIES: Array<{ key: CharacterAbilityKey; label: string }> = [
  { key: "str", label: "Forza" }, { key: "dex", label: "Destrezza" },
  { key: "con", label: "Costituzione" }, { key: "int", label: "Intelligenza" },
  { key: "wis", label: "Saggezza" }, { key: "cha", label: "Carisma" },
];
const SKILLS: Array<{ key: CharacterSkillKey; label: string }> = [
  { key: "acrobatics", label: "Acrobazia" }, { key: "animal_handling", label: "Addestrare Animali" },
  { key: "arcana", label: "Arcano" }, { key: "athletics", label: "Atletica" },
  { key: "deception", label: "Inganno" }, { key: "history", label: "Storia" },
  { key: "insight", label: "Intuizione" }, { key: "intimidation", label: "Intimidire" },
  { key: "investigation", label: "Indagare" }, { key: "medicine", label: "Medicina" },
  { key: "nature", label: "Natura" }, { key: "perception", label: "Percezione" },
  { key: "performance", label: "Intrattenere" }, { key: "persuasion", label: "Persuasione" },
  { key: "religion", label: "Religione" }, { key: "sleight_of_hand", label: "Rapidità di mano" },
  { key: "stealth", label: "Furtività" }, { key: "survival", label: "Sopravvivenza" },
];

function initialSheet(character: CampaignCharacterRow): CharacterSheetV1 {
  const snapshot = character.rules_snapshot;
  const stored = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? (snapshot as Record<string, unknown>).character_sheet
    : null;
  const previous = isCharacterSheetV1(stored) ? stored : null;
  return {
    ...(previous ?? {}),
    version: 1,
    source: previous?.source === "recovered" ? "recovered" : "manual",
    characterName: character.name,
    classLabel: character.character_class ?? undefined,
    classSubclass: character.class_subclass ?? undefined,
    level: previous?.source === "recovered" ? previous.level : character.level ?? undefined,
    armorClass: character.armor_class ?? previous?.armorClass,
  };
}

function lines(value: string | undefined) { return value ?? ""; }
function splitLines(value: string) { return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean); }
function numeric(value: string): number | undefined { if (!value.trim()) return undefined; const result = Number(value); return Number.isFinite(result) ? result : undefined; }

export function LongCharacterSheetEditor({ character, open, onOpenChange }: {
  character: CampaignCharacterRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<CharacterSheetV1>(() => initialSheet(character));
  const [name, setName] = useState(character.name);
  const [classLabel, setClassLabel] = useState(character.character_class ?? "");
  const [classSubclass, setClassSubclass] = useState(character.class_subclass ?? "");
  const [level, setLevel] = useState(String(character.level ?? ""));
  const [armorClass, setArmorClass] = useState(String(character.armor_class ?? ""));
  const [hpMax, setHpMax] = useState("");
  const [background, setBackground] = useState(character.background ?? "");
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!open) return;
    const next = initialSheet(character);
    setSheet(next);
    setName(character.name);
    setClassLabel(character.character_class ?? "");
    setClassSubclass(character.class_subclass ?? "");
    setLevel(String(character.level ?? ""));
    setArmorClass(String(character.armor_class ?? next.armorClass ?? ""));
    setHpMax(String(next.hpMax ?? ""));
    setBackground(character.background ?? "");
  }, [character, open]);

  function update<K extends keyof CharacterSheetV1>(key: K, value: CharacterSheetV1[K] | undefined) {
    setSheet((current) => {
      const next = { ...current };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }
  function updateAbility(field: "abilities" | "abilityMods", key: CharacterAbilityKey, raw: string) {
    const next = { ...(sheet[field] ?? {}) };
    const value = numeric(raw);
    if (value === undefined) delete next[key]; else next[key] = value;
    update(field, Object.keys(next).length ? next : undefined);
  }
  function updateCheck(group: "savingThrows" | "skills", key: CharacterAbilityKey | CharacterSkillKey, field: "value" | "proficient" | "expertise", raw: string | boolean) {
    const current = (sheet[group] ?? {}) as Partial<Record<CharacterAbilityKey | CharacterSkillKey, CharacterSheetCheck>>;
    const existing = current[key];
    const value = field === "value" ? numeric(String(raw)) : existing?.value;
    if (value === undefined) return;
    const proficient = field === "proficient" ? Boolean(raw) : existing?.proficient;
    const expertise = field === "expertise" ? Boolean(raw) : existing?.expertise;
    const next = { ...current, [key]: {
      value,
      ...(proficient === undefined ? {} : { proficient }),
      ...(expertise === undefined ? {} : { expertise }),
    } };
    update(group, next as CharacterSheetV1[typeof group]);
  }

  function updateWeapon(index: number, field: "name" | "toHit" | "damage" | "type", value: string) {
    update("weaponRows", (sheet.weaponRows ?? []).map((weapon, i) => i === index ? { ...weapon, [field]: value } : weapon));
  }
  function updateSpell(index: number, field: keyof CharacterSheetSpell, value: string | number | boolean) {
    update("spells", (sheet.spells ?? []).map((spell, i) => i === index ? { ...spell, [field]: value } : spell));
  }
  function removeListItem(key: "weaponRows" | "spells", index: number) {
    const values = sheet[key] ?? [];
    update(key, values.filter((_, i) => i !== index) as CharacterSheetV1[typeof key]);
  }

  const show = (raw: string | undefined, setter: (value: string) => void, label: string, hint?: string, rows = 3) => (
    <div className="space-y-1.5"><Label>{label}</Label><Textarea value={raw ?? ""} onChange={(event) => setter(event.target.value)} rows={rows} placeholder={hint} disabled={saving} className="resize-y border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div>
  );
  const setList = (key: "inventory" | "languages" | "proficiencies" | "armorProficiencies" | "weaponProficiencies" | "toolProficiencies", raw: string) => update(key, splitLines(raw));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedLevel = numeric(level);
    if (!name.trim()) { toast.error("Il nome è obbligatorio."); return; }
    if (level && (!parsedLevel || parsedLevel < 1 || parsedLevel > 20 || !Number.isInteger(parsedLevel))) { toast.error("Inserisci un livello intero da 1 a 20."); return; }
    const nextSheet: CharacterSheetV1 = {
      ...sheet,
      version: 1,
      source: sheet.source === "recovered" ? "recovered" : "manual",
      characterName: name.trim(),
      classLabel: classLabel.trim() || undefined,
      classSubclass: classSubclass.trim() || undefined,
      ...(sheet.source === "recovered" ? { level: sheet.level } : parsedLevel ? { level: parsedLevel } : { level: undefined }),
      ...(numeric(armorClass) !== undefined ? { armorClass: numeric(armorClass) } : { armorClass: undefined }),
      ...(numeric(hpMax) !== undefined ? { hpMax: numeric(hpMax) } : { hpMax: undefined }),
    };
    startSaving(async () => {
      const result = await saveLongCampaignCharacterSheet(character.id, character.campaign_id, {
        expectedUpdatedAt: character.updated_at,
        character_sheet: nextSheet,
        identity: {
          name: name.trim(),
          character_class: classLabel.trim() || null,
          class_subclass: classSubclass.trim() || null,
          ...(parsedLevel ? { level: parsedLevel } : {}),
          armor_class: numeric(armorClass) ?? null,
          max_hp: numeric(hpMax) ?? null,
          background: background.trim() || null,
        },
      });
      if (!result.success) { toast.error(result.error); return; }
      toast.success("Scheda salvata.");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-xl text-gold-relief">Scheda manuale · {character.name}</DialogTitle>
          <DialogDescription className="text-barber-paper/70">Compila i dati verificati. I campi lasciati vuoti restano sconosciuti e non modificano i PF correnti o le risorse già consumate.</DialogDescription>
        </DialogHeader>
        {sheet.source === "recovered" && sheet.level != null && character.level != null && sheet.level !== character.level ? <div role="note" className="border-l-2 border-amber-400 px-3 py-2 text-sm text-amber-100">Il PDF recuperato indica livello {sheet.level}, mentre il registro campagna indica {character.level}. Il salvataggio conserva entrambi i valori perché il livello del PDF non è ancora stato verificato.</div> : null}
        <form onSubmit={submit} className="space-y-6">
          <section className="space-y-3">
            <h3 className="border-b border-barber-gold/20 pb-2 font-cinzel text-base text-barber-gold">Identità e combattimento</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[["Nome", name, setName], ["Razza", sheet.raceLabel ?? "", (v: string) => update("raceLabel", v || undefined)], ["Sottorazza", sheet.subraceLabel ?? "", (v: string) => update("subraceLabel", v || undefined)], ["Classe", classLabel, setClassLabel], ["Sottoclasse", classSubclass, setClassSubclass], ["Background", sheet.backgroundLabel ?? "", (v: string) => update("backgroundLabel", v || undefined)], [sheet.source === "recovered" ? "Livello registro campagna" : "Livello", level, setLevel], ["Classe incantatrice", sheet.spellcastingClass ?? "", (v: string) => update("spellcastingClass", v || null)], ["Allineamento", sheet.alignment ?? "", (v: string) => update("alignment", v || null)], ["Età", sheet.age ?? "", (v: string) => update("age", v || null)], ["Altezza", sheet.height ?? "", (v: string) => update("height", v || null)], ["Peso", sheet.weight ?? "", (v: string) => update("weight", v || null)], ["Sesso", sheet.sex ?? "", (v: string) => update("sex", v || null)], ["Classe armatura", armorClass, setArmorClass], ["PF massimi", hpMax, setHpMax], ["PF per livello (es. d8)", sheet.hitDie ?? "", (v: string) => update("hitDie", v || undefined)], ["Dadi vita totali", String(sheet.hitDiceTotal ?? ""), (v: string) => update("hitDiceTotal", numeric(v))], ["Velocità", sheet.speed ?? "", (v: string) => update("speed", v || undefined)], ["Iniziativa", String(sheet.initiative ?? ""), (v: string) => update("initiative", numeric(v))]].map(([label, value, setter]) => (
                <div key={String(label)} className="space-y-1.5"><Label>{String(label)}</Label><Input value={String(value)} onChange={(event) => (setter as (v: string) => void)(event.target.value)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div>
              ))}
              <div className="space-y-1.5"><Label>Storia / background narrativo</Label><Textarea value={background} onChange={(e) => setBackground(e.target.value)} rows={3} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-barber-gold/20 pb-2 font-cinzel text-base text-barber-gold">Caratteristiche e tiri salvezza</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {ABILITIES.map(({ key, label }) => {
                const check = sheet.savingThrows?.[key];
                return <div key={key} className="space-y-2 rounded border border-barber-gold/20 p-2">
                  <Label>{label}</Label>
                  <Input aria-label={`${label}, punteggio`} type="number" value={sheet.abilities?.[key] ?? ""} onChange={(e) => updateAbility("abilities", key, e.target.value)} placeholder="Punteggio" disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
                  <Input aria-label={`${label}, modificatore`} type="number" value={sheet.abilityMods?.[key] ?? ""} onChange={(e) => updateAbility("abilityMods", key, e.target.value)} placeholder="Modificatore" disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" />
                  <div><Label className="text-xs">Tiro salvezza</Label><Input aria-label={`${label}, bonus tiro salvezza`} type="number" value={check?.value ?? ""} onChange={(e) => updateCheck("savingThrows", key, "value", e.target.value)} placeholder="Bonus" disabled={saving} className="mt-1 border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={check?.proficient ?? false} disabled={saving || check === undefined} onChange={(e) => updateCheck("savingThrows", key, "proficient", e.target.checked)} />Competenza</label>
                  <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={check?.expertise ?? false} disabled={saving || check === undefined} onChange={(e) => updateCheck("savingThrows", key, "expertise", e.target.checked)} />Maestria</label>
                </div>;
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {([["Bonus competenza", "proficiencyBonus"], ["Percezione passiva", "passivePerception"], ["CD incantesimi", "spellSaveDc"], ["Bonus attacco incantesimi", "spellAttackBonus"], ["Trucchetti conosciuti", "cantripsKnown"], ["Incantesimi preparati", "spellsPrepared"]] as const).map(([label, key]) => <div key={key} className="space-y-1.5"><Label>{label}</Label><Input type="number" value={sheet[key] ?? ""} onChange={(e) => update(key, numeric(e.target.value) as never)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div>)}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-barber-gold/20 pb-2 font-cinzel text-base text-barber-gold">Abilità e competenze</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-xs text-barber-paper/60"><th className="py-2 pr-3">Abilità</th><th className="py-2 pr-3">Bonus</th><th className="py-2 pr-3">Competenza</th><th className="py-2">Maestria</th></tr></thead>
                <tbody>{SKILLS.map(({ key, label }) => { const check = sheet.skills?.[key]; return <tr key={key} className="border-t border-barber-gold/10"><th className="py-1.5 pr-3 text-left font-normal">{label}</th><td className="py-1.5 pr-3"><Input aria-label={`${label}, bonus`} type="number" value={check?.value ?? ""} onChange={(e) => updateCheck("skills", key, "value", e.target.value)} disabled={saving} className="h-8 w-24 border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></td><td className="py-1.5 pr-3"><input aria-label={`${label}, competenza`} type="checkbox" checked={check?.proficient ?? false} disabled={saving || check === undefined} onChange={(e) => updateCheck("skills", key, "proficient", e.target.checked)} /></td><td className="py-1.5"><input aria-label={`${label}, maestria`} type="checkbox" checked={check?.expertise ?? false} disabled={saving || check === undefined} onChange={(e) => updateCheck("skills", key, "expertise", e.target.checked)} /></td></tr>; })}</tbody>
              </table>
            </div>
            {show(lines(sheet.proficiencies?.join("\n")), (v) => setList("proficiencies", v), "Altre competenze", "Una per riga")}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-barber-gold/20 pb-2"><h3 className="font-cinzel text-base text-barber-gold">Attacchi ed equipaggiamento</h3><Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => update("weaponRows", [...(sheet.weaponRows ?? []), { name: "", toHit: "", damage: "", type: "" }])}><Plus className="mr-1.5 h-4 w-4" />Aggiungi attacco</Button></div>
            {(sheet.weaponRows ?? []).length ? <div className="space-y-2">{sheet.weaponRows?.map((weapon, index) => <div key={`weapon-${index}`} className="grid gap-2 rounded border border-barber-gold/15 p-3 sm:grid-cols-[1.2fr_0.7fr_1fr_0.8fr_auto]">{([["Arma", "name"], ["Bonus attacco", "toHit"], ["Danno", "damage"], ["Tipo", "type"]] as const).map(([label, key]) => <div key={key} className="space-y-1"><Label className="text-xs">{label}</Label><Input value={weapon[key]} onChange={(e) => updateWeapon(index, key, e.target.value)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div>)}<Button type="button" variant="ghost" size="icon" aria-label={`Rimuovi ${weapon.name || "attacco"}`} disabled={saving} onClick={() => removeListItem("weaponRows", index)}><Trash2 className="h-4 w-4" /></Button></div>)}</div> : <p className="text-sm text-barber-paper/55">Nessun attacco inserito.</p>}
            <div className="grid gap-3 sm:grid-cols-2">{show(lines(sheet.inventory?.join("\n")), (v) => setList("inventory", v), "Inventario", "Un oggetto per riga", 6)}{show(lines(sheet.languages?.join("\n")), (v) => setList("languages", v), "Lingue", "Una lingua per riga")}{show(lines(sheet.armorProficiencies?.join("\n")), (v) => setList("armorProficiencies", v), "Competenze armature", "Una per riga")}{show(lines(sheet.weaponProficiencies?.join("\n")), (v) => setList("weaponProficiencies", v), "Competenze armi", "Una per riga")}{show(lines(sheet.toolProficiencies?.join("\n")), (v) => setList("toolProficiencies", v), "Competenze strumenti", "Una per riga")}</div>
          </section>

          <section className="space-y-3">
            <h3 className="border-b border-barber-gold/20 pb-2 font-cinzel text-base text-barber-gold">Capacità e incantesimi</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {show(sheet.raceTraitsMd, (v) => update("raceTraitsMd", v || undefined), "Tratti di razza", undefined, 5)}
              {show(sheet.subraceTraitsMd ?? "", (v) => update("subraceTraitsMd", v || null), "Tratti di sottorazza", undefined, 5)}
              {show(sheet.classFeaturesMd, (v) => update("classFeaturesMd", v || undefined), "Capacità di classe", undefined, 5)}
              {show(sheet.subclassFeaturesMd ?? "", (v) => update("subclassFeaturesMd", v || null), "Capacità di sottoclasse", undefined, 5)}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
              {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((levelValue) => <div key={levelValue} className="space-y-1"><Label className="text-xs">Slot livello {levelValue}</Label><Input type="number" min={0} max={99} value={sheet.spellSlots?.[levelValue] ?? ""} onChange={(e) => { const slots = { ...(sheet.spellSlots ?? {}) }; const count = numeric(e.target.value); if (count === undefined) delete slots[levelValue]; else slots[levelValue] = count; update("spellSlots", slots); }} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div>)}
            </div>
            <div className="flex items-center justify-between"><h4 className="font-medium text-barber-paper/85">Incantesimi conosciuti</h4><Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => update("spells", [...(sheet.spells ?? []), { level: 0, name: "", summary: "" }])}><Plus className="mr-1.5 h-4 w-4" />Aggiungi incantesimo</Button></div>
            {(sheet.spells ?? []).length ? <div className="space-y-3">{sheet.spells?.map((spell, index) => <div key={`spell-${index}`} className="space-y-3 rounded border border-barber-gold/15 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto]"><div className="space-y-1"><Label>Nome incantesimo</Label><Input value={spell.name} onChange={(e) => updateSpell(index, "name", e.target.value)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div><div className="space-y-1"><Label>Livello</Label><Input type="number" min={0} max={9} value={spell.level} onChange={(e) => updateSpell(index, "level", numeric(e.target.value) ?? 0)} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div><Button type="button" variant="ghost" size="icon" aria-label={`Rimuovi ${spell.name || "incantesimo"}`} disabled={saving} onClick={() => removeListItem("spells", index)}><Trash2 className="h-4 w-4" /></Button></div>
              <div className="space-y-1"><Label>Descrizione o note</Label><Textarea value={spell.summary} onChange={(e) => updateSpell(index, "summary", e.target.value)} rows={2} disabled={saving} className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper" /></div>
              <div className="flex flex-wrap gap-x-5 gap-y-2">{([["Rituale", "ritual"], ["Concentrazione", "concentration"], ["Componente verbale", "verbal"], ["Componente somatica", "somatic"], ["Componente materiale", "material"]] as const).map(([label, key]) => <label key={key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={spell[key] ?? false} disabled={saving} onChange={(e) => updateSpell(index, key, e.target.checked)} />{label}</label>)}</div>
            </div>)}</div> : <p className="text-sm text-barber-paper/55">Nessun incantesimo inserito.</p>}
            <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label>Caratteristica da incantatore</Label><select value={sheet.spellcastingAbility ?? ""} onChange={(e) => update("spellcastingAbility", (e.target.value || null) as CharacterSheetV1["spellcastingAbility"])} className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 text-sm text-barber-paper"><option value="">Non specificata</option>{ABILITIES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}</select></div>{show(sheet.backgroundMd ?? "", (v) => update("backgroundMd", v || null), "Regole background", undefined, 4)}</div>
          </section>

          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annulla</Button><Button type="submit" disabled={saving} className="bg-barber-red text-barber-paper hover:bg-barber-red/90">{saving ? "Salvataggio…" : "Salva scheda"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
