"use client";

import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { isCharacterSheetV1, type CharacterSheetV1, type CharacterAbilityKey, type CharacterSheetCheck } from "@/lib/character-sheet";
import { CharacterSheetResources } from "./character-sheet-resources";

const ABILITIES: Array<{ key: CharacterAbilityKey; label: string }> = [
  { key: "str", label: "Forza" }, { key: "dex", label: "Destrezza" },
  { key: "con", label: "Costituzione" }, { key: "int", label: "Intelligenza" },
  { key: "wis", label: "Saggezza" }, { key: "cha", label: "Carisma" },
];
const SKILL_LABELS: Record<string, string> = {
  acrobatics: "Acrobazia", animal_handling: "Addestrare Animali", arcana: "Arcano", athletics: "Atletica",
  deception: "Inganno", history: "Storia", insight: "Intuizione", intimidation: "Intimidire",
  investigation: "Indagare", medicine: "Medicina", nature: "Natura", perception: "Percezione",
  performance: "Intrattenere", persuasion: "Persuasione", religion: "Religione", sleight_of_hand: "Rapidità di mano",
  stealth: "Furtività", survival: "Sopravvivenza",
};

function readSheet(character: CampaignCharacterRow): CharacterSheetV1 | null {
  const raw = character.rules_snapshot;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const candidate = (raw as Record<string, unknown>).character_sheet;
  return isCharacterSheetV1(candidate) ? candidate : null;
}

function Missing() {
  return <span className="text-barber-paper/45 italic">Non compilato</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-barber-gold/20 pt-4">
      <h3 className="font-cinzel text-base font-semibold text-barber-gold">{title}</h3>
      {children}
    </section>
  );
}

function TextList({ values }: { values?: string[] }) {
  if (!values?.length) return <Missing />;
  return <ul className="list-inside list-disc space-y-1 text-sm text-barber-paper/90">{values.map((value, i) => <li key={`${i}-${value}`}>{value}</li>)}</ul>;
}

type CharacterSheetPanelSection = "all" | "sheet" | "spells" | "equipment" | "story";

/** Complete readable view shared by player and GM. Blank values remain explicitly unknown. */
export function CharacterSheetPanel({
  character,
  section = "all",
}: {
  character: CampaignCharacterRow;
  section?: CharacterSheetPanelSection;
}) {
  const sheet = readSheet(character);
  if (!sheet) {
    return (
      <div className="rounded-lg border border-barber-gold/20 bg-black/20 p-4 text-sm text-barber-paper/75">
        <h3 className="font-cinzel text-base font-semibold text-barber-gold">Scheda tecnica</h3>
        <p className="mt-2">La scheda completa non è stata ancora compilata. I valori non disponibili restano vuoti.</p>
      </div>
    );
  }

  const mods = sheet.abilityMods;
  const checks = sheet.savingThrows;
  const skills = sheet.skills;
  const numberOrMissing = (value: number | null | undefined) => value == null ? <Missing /> : value;
  const trait = (value?: string | null) => value?.trim() ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">{value}</p> : <Missing />;
  const checkLabel = (item?: CharacterSheetCheck) => item
    ? <span className="tabular-nums">{item.value >= 0 ? `+${item.value}` : item.value}{item.expertise ? " · Maestria" : item.proficient ? " · Competenza" : ""}</span>
    : <Missing />;
  const showAll = section === "all";
  const showSheet = showAll || section === "sheet";
  const showSpells = showAll || section === "spells";
  const showEquipment = showAll || section === "equipment";
  const showStory = showAll || section === "story";

  return (
    <div className="space-y-5 rounded-lg border border-barber-gold/25 bg-[#12100e]/80 p-4 sm:p-5">
      {showSheet && sheet.source === "recovered" && sheet.level != null && character.level != null && sheet.level !== character.level ? (
        <div role="note" className="border-l-2 border-amber-400 px-3 py-2 text-sm text-amber-100">
          La scheda recuperata riporta livello {sheet.level}; il registro campagna riporta livello {character.level}. Verifica la discrepanza con il Master.
        </div>
      ) : null}
      {showSheet && showAll ? <div className="flex flex-wrap items-start justify-between gap-3 border-b border-barber-gold/20 pb-3">
        <div>
          <h2 className="font-cinzel text-xl font-bold text-gold-relief">Scheda tecnica</h2>
          <p className="mt-1 text-sm text-barber-paper/75">
            {[sheet.raceLabel, sheet.subraceLabel, character.character_class, character.class_subclass, `Livello ${character.level ?? sheet.level ?? "—"}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className="rounded border border-barber-gold/25 px-2 py-1 text-xs text-barber-paper/65">
          {sheet.source === "generator" ? "Generata" : sheet.source === "recovered" ? "Recuperata" : "Compilata dal Master"}
        </span>
      </div> : null}

      {showSheet ? <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["CA", character.armor_class ?? sheet.armorClass], ["PF massimi", sheet.hpMax],
          ["Velocità", sheet.speed], ["Iniziativa", sheet.initiative],
          ["Bonus competenza", sheet.proficiencyBonus], ["Percezione passiva", sheet.passivePerception],
          ["Allineamento", sheet.alignment], ["Età", sheet.age], ["Altezza", sheet.height],
          ["Peso", sheet.weight], ["Sesso", sheet.sex], ["Dado vita", sheet.hitDie],
        ].map(([label, value]) => (
          <div key={String(label)} className="border-l border-barber-gold/25 pl-2">
            <dt className="text-xs text-barber-paper/55">{label}</dt>
            <dd className="mt-0.5 font-medium text-barber-paper">{value === null || value === undefined || value === "" ? <Missing /> : value}</dd>
          </div>
        ))}
      </dl> : null}

      {showSheet ? <CharacterSheetResources character={character} sheet={sheet} /> : null}

      {showSheet ? <Section title="Caratteristiche">
        {sheet.abilities ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {ABILITIES.map(({ key, label }) => (
              <div key={key} className="rounded border border-barber-gold/30 bg-black/25 p-2.5 text-center">
                <p className="text-xs font-medium text-barber-paper/65">{label}</p>
                <p className="mt-1 font-cinzel text-2xl font-semibold tabular-nums text-gold-relief">{numberOrMissing(sheet.abilities?.[key])}</p>
                <p className="text-xs tabular-nums text-barber-gold">Mod. {numberOrMissing(mods?.[key])}</p>
              </div>
            ))}
          </div>
        ) : <Missing />}
      </Section> : null}

      {showSheet ? <Section title="Tiri salvezza e abilità">
        <div className="grid gap-4 md:grid-cols-2">
          <div><h4 className="mb-2 text-sm font-medium text-barber-paper/80">Tiri salvezza</h4><dl className="grid grid-cols-2 gap-1 text-sm">{ABILITIES.map(({ key, label }) => <div key={key} className="flex justify-between gap-2 border-b border-barber-gold/10 py-1"><dt>{label}</dt><dd>{checkLabel(checks?.[key])}</dd></div>)}</dl></div>
          <div><h4 className="mb-2 text-sm font-medium text-barber-paper/80">Abilità</h4>{skills ? <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">{Object.entries(skills).map(([key, value]) => <div key={key} className="flex justify-between gap-2 border-b border-barber-gold/10 py-1"><dt>{SKILL_LABELS[key] ?? key}</dt><dd>{checkLabel(value)}</dd></div>)}</dl> : <Missing />}</div>
        </div>
      </Section> : null}

      {showSheet ? <Section title="Attacchi">
        {sheet.weaponRows?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs text-barber-paper/55"><tr><th className="pb-2 pr-3">Arma</th><th className="pb-2 pr-3">Attacco</th><th className="pb-2 pr-3">Danno</th><th className="pb-2">Tipo</th></tr></thead><tbody>{sheet.weaponRows.map((weapon, index) => <tr key={`${weapon.name}-${index}`} className="border-t border-barber-gold/15"><td className="py-2 pr-3">{weapon.name}</td><td className="py-2 pr-3 tabular-nums">{weapon.toHit}</td><td className="py-2 pr-3 tabular-nums">{weapon.damage}</td><td className="py-2">{weapon.type}</td></tr>)}</tbody></table></div> : <Missing />}
      </Section> : null}

      {showSheet ? <Section title="Competenze e lingue"><div className="grid gap-4 sm:grid-cols-2"><div><h4 className="mb-1 text-sm text-barber-paper/70">Competenze</h4><TextList values={[...(sheet.proficiencies ?? []), ...(sheet.armorProficiencies ?? []).map((x) => `Armature: ${x}`), ...(sheet.weaponProficiencies ?? []).map((x) => `Armi: ${x}`), ...(sheet.toolProficiencies ?? []).map((x) => `Strumenti: ${x}`)]} /></div><div><h4 className="mb-1 text-sm text-barber-paper/70">Lingue</h4><TextList values={sheet.languages} /></div></div></Section> : null}

      {showStory ? <Section title="Capacità e tratti"><div className="grid gap-4 md:grid-cols-2"><div><h4 className="mb-1 text-sm text-barber-paper/70">Razza</h4>{trait(sheet.raceTraitsMd)}<h4 className="mb-1 mt-3 text-sm text-barber-paper/70">Sottorazza</h4>{trait(sheet.subraceTraitsMd)}</div><div><h4 className="mb-1 text-sm text-barber-paper/70">Classe</h4>{trait(sheet.classFeaturesMd)}<h4 className="mb-1 mt-3 text-sm text-barber-paper/70">Sottoclasse</h4>{trait(sheet.subclassFeaturesMd)}</div><div className="md:col-span-2"><h4 className="mb-1 text-sm text-barber-paper/70">Background</h4>{trait(sheet.backgroundMd)}</div></div></Section> : null}

      {showSpells ? <Section title="Incantesimi"><div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><p>Classe: {sheet.spellcastingClass || <Missing />}</p><p>Caratteristica: {sheet.spellcastingAbility?.toUpperCase() || <Missing />}</p><p>CD: {numberOrMissing(sheet.spellSaveDc)}</p><p>Attacco: {numberOrMissing(sheet.spellAttackBonus)}</p><p>Trucchetti: {numberOrMissing(sheet.cantripsKnown)}</p><p>Preparati: {numberOrMissing(sheet.spellsPrepared)}</p></div><div className="mb-3 flex flex-wrap gap-2">{Object.entries(sheet.spellSlots ?? {}).filter(([, count]) => count !== undefined).map(([level, count]) => <span key={level} className="rounded border border-barber-gold/20 px-2 py-1 text-xs">Liv. {level}: {count} slot</span>)}{!Object.values(sheet.spellSlots ?? {}).some((count) => count !== undefined) ? <Missing /> : null}</div>{sheet.spells?.length ? <div className="space-y-2">{sheet.spells.map((spell, index) => { const spellFlags = [["Rituale", spell.ritual], ["Concentrazione", spell.concentration], ["Componente verbale", spell.verbal], ["Componente somatica", spell.somatic], ["Componente materiale", spell.material]] as const; const knownFlags = spellFlags.filter(([, value]) => value !== undefined); return <details key={`${spell.level}-${spell.name}-${index}`} className="rounded border border-barber-gold/15 px-3 py-2"><summary className="cursor-pointer text-sm font-medium">{spell.name} <span className="text-barber-paper/55">· {spell.level === 0 ? "Trucchetto" : `Livello ${spell.level}`}</span></summary><p className="mt-2 whitespace-pre-wrap text-sm text-barber-paper/80">{spell.summary}</p>{knownFlags.length ? <p className="mt-1 text-xs text-barber-gold">{knownFlags.map(([label, value]) => `${label}: ${value ? "sì" : "no"}`).join(" · ")}</p> : null}{spell.fullTextMd ? <p className="mt-2 whitespace-pre-wrap text-xs text-barber-paper/60">{spell.fullTextMd}</p> : null}</details>; })}</div> : <Missing />}</Section> : null}

      {showEquipment ? <Section title="Equipaggiamento"><TextList values={sheet.inventory} /></Section> : null}
    </div>
  );
}
