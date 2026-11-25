"use client";

import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { raceBySlug } from "@/lib/character-build-catalog";
import { ALL_CHARACTER_SKILLS } from "@/lib/character-rules-calc";
import { parseRulesSnapshot } from "@/lib/character-rules-snapshot";
import {
  readCharacterSheetSnapshot,
  resolveCharacterSpellSlots,
  resolveEffectiveCharacterFields,
  type CharacterAbilityKey,
  type CharacterSheetCheck,
  type CharacterSheetPersonality,
} from "@/lib/character-sheet";
import { CharacterSheetResources } from "./character-sheet-resources";
import {
  LongBioNotesEditorSection,
  LongInventoryEditorSection,
  LongSpellsListSection,
  LongWeaponsSection,
} from "./long-player-sheet-editors";

const ABILITIES: Array<{ key: CharacterAbilityKey; label: string }> = [
  { key: "str", label: "Forza" },
  { key: "dex", label: "Destrezza" },
  { key: "con", label: "Costituzione" },
  { key: "int", label: "Intelligenza" },
  { key: "wis", label: "Saggezza" },
  { key: "cha", label: "Carisma" },
];

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
  return (
    <ul className="list-inside list-disc space-y-1 text-sm text-barber-paper/90">
      {values.map((value, i) => (
        <li key={`${i}-${value}`}>{value}</li>
      ))}
    </ul>
  );
}

type CharacterSheetPanelSection = "all" | "sheet" | "spells" | "equipment" | "story";

function finiteNum(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Complete readable view shared by player and GM. Blank values remain explicitly unknown. */
export function CharacterSheetPanel({
  character,
  section = "all",
  isLongCampaign = false,
}: {
  character: CampaignCharacterRow;
  section?: CharacterSheetPanelSection;
  isLongCampaign?: boolean;
}) {
  const effective = resolveEffectiveCharacterFields(character);
  const sheet = effective.sheet;
  const rawSnapshot = readCharacterSheetSnapshot(character.rules_snapshot);
  const derivedSnap = parseRulesSnapshot(character.rules_snapshot ?? null);
  const raceDef = raceBySlug(character.race_slug ?? null);
  const derivedSubraceLabel =
    raceDef?.subraces?.find((s) => s.slug === character.subclass_slug)?.label ?? null;

  const legacyAbilities =
    rawSnapshot.abilities && typeof rawSnapshot.abilities === "object" && !Array.isArray(rawSnapshot.abilities)
      ? (rawSnapshot.abilities as Partial<Record<CharacterAbilityKey, number>>)
      : undefined;
  const abilities = sheet?.abilities ?? legacyAbilities;

  const computedModFor = (key: CharacterAbilityKey): number | undefined => {
    const explicit = sheet?.abilityMods?.[key];
    if (explicit !== undefined) return explicit;
    const score = abilities?.[key];
    return typeof score === "number" ? Math.floor((score - 10) / 2) : undefined;
  };

  const checks = sheet?.savingThrows;
  const skills = sheet?.skills;
  const slots = resolveCharacterSpellSlots(character.rules_snapshot);
  const legacySpellcasting =
    rawSnapshot.spellcasting && typeof rawSnapshot.spellcasting === "object" && !Array.isArray(rawSnapshot.spellcasting)
      ? (rawSnapshot.spellcasting as Record<string, unknown>)
      : undefined;

  const speed = sheet?.speed ?? (typeof rawSnapshot.speed === "string" ? rawSnapshot.speed : undefined);
  const initiative = sheet?.initiative ?? finiteNum(rawSnapshot.initiative);
  const proficiencyBonus = sheet?.proficiencyBonus ?? finiteNum(rawSnapshot.proficiency_bonus);
  const passivePerception = sheet?.passivePerception ?? finiteNum(rawSnapshot.passive_perception);
  const hitDie =
    sheet?.hitDie ??
    (rawSnapshot.hit_dice && typeof rawSnapshot.hit_dice === "object" && typeof (rawSnapshot.hit_dice as Record<string, unknown>).die === "string"
      ? String((rawSnapshot.hit_dice as Record<string, unknown>).die)
      : undefined);

  const spellcastingClass = sheet?.spellcastingClass ?? undefined;
  const spellcastingAbility =
    sheet?.spellcastingAbility ??
    derivedSnap?.spellcastingAbility ??
    (typeof legacySpellcasting?.ability === "string" ? legacySpellcasting.ability : undefined);
  const spellSaveDc = sheet?.spellSaveDc ?? finiteNum(legacySpellcasting?.saveDc);
  const spellAttackBonus = sheet?.spellAttackBonus ?? finiteNum(legacySpellcasting?.attackBonus);
  const cantripsKnown = sheet?.cantripsKnown ?? derivedSnap?.cantripsKnown;

  const numberOrMissing = (value: number | null | undefined) => (value == null ? <Missing /> : value);
  const trait = (value?: string | null) =>
    value?.trim() ? (
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/90">{value}</p>
    ) : (
      <Missing />
    );
  const formatCheck = (item: CharacterSheetCheck | undefined, fallbackMod: number | undefined) => {
    if (item) {
      return (
        <span className="tabular-nums">
          {item.value >= 0 ? `+${item.value}` : item.value}
          {item.expertise ? " · Maestria" : item.proficient ? " · Competenza" : ""}
        </span>
      );
    }
    if (fallbackMod !== undefined) {
      return <span className="tabular-nums text-barber-paper/80">{fallbackMod >= 0 ? `+${fallbackMod}` : fallbackMod}</span>;
    }
    return <Missing />;
  };

  const showAll = section === "all";
  const showSheet = showAll || section === "sheet";
  const showSpells = showAll || section === "spells";
  const showEquipment = showAll || section === "equipment";
  const showStory = showAll || section === "story";

  const legacyProficiencies =
    rawSnapshot.proficiencies && typeof rawSnapshot.proficiencies === "object" && !Array.isArray(rawSnapshot.proficiencies)
      ? (rawSnapshot.proficiencies as Record<string, unknown>)
      : undefined;
  const asStringList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];

  const armorProfs = sheet?.armorProficiencies ?? asStringList(legacyProficiencies?.armor);
  const weaponProfs = sheet?.weaponProficiencies ?? asStringList(legacyProficiencies?.weapons);
  const toolProfs = sheet?.toolProficiencies ?? asStringList(legacyProficiencies?.tools);
  const languages = sheet?.languages ?? asStringList(legacyProficiencies?.languages);

  const personality =
    sheet?.personality ??
    (rawSnapshot.personality && typeof rawSnapshot.personality === "object" && !Array.isArray(rawSnapshot.personality)
      ? (rawSnapshot.personality as CharacterSheetPersonality)
      : undefined);

  return (
    <div className="space-y-5 rounded-lg border border-barber-gold/25 bg-[#12100e]/80 p-4 sm:p-5">
      {!sheet ? (
        <div role="note" className="border-l-2 border-barber-gold/45 px-3 py-2 text-xs text-barber-paper/75">
          La scheda tecnica strutturata non è stata ancora compilata per intero: sono mostrati i dati presenti a registro e nelle regole derivate, mentre i campi assenti restano vuoti.
        </div>
      ) : null}

      {showSheet && effective.hasRecoveredLevelMismatch ? (
        <div role="note" className="border-l-2 border-amber-400 px-3 py-2 text-sm text-amber-100">
          La scheda recuperata riporta livello {effective.recoveredPdfLevel}; il registro campagna riporta livello {character.level}. Verifica la discrepanza con il Master.
        </div>
      ) : null}

      {showSheet && showAll ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-barber-gold/20 pb-3">
          <div>
            <h2 className="font-cinzel text-xl font-bold text-gold-relief">Scheda tecnica</h2>
            <p className="mt-1 text-sm text-barber-paper/75">
              {[
                sheet?.raceLabel ?? raceDef?.label,
                sheet?.subraceLabel ?? derivedSubraceLabel,
                effective.characterClass,
                effective.classSubclass,
                `Livello ${effective.level ?? "—"}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <span className="rounded border border-barber-gold/25 px-2 py-1 text-xs text-barber-paper/65">
            {!sheet
              ? "Dati di registro"
              : sheet.source === "generator"
                ? "Generata"
                : sheet.source === "recovered"
                  ? "Recuperata"
                  : "Compilata dal Master"}
          </span>
        </div>
      ) : null}

      {showSheet ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["CA", effective.armorClass],
            ["PF massimi", effective.maxHp],
            ["Velocità", speed],
            ["Iniziativa", initiative != null ? (initiative >= 0 ? `+${initiative}` : initiative) : undefined],
            ["Bonus competenza", proficiencyBonus != null ? `+${proficiencyBonus}` : undefined],
            ["Percezione passiva", passivePerception],
            ["Dado vita", hitDie],
            ["Sensi", sheet?.senses],
            ["Resistenze", sheet?.resistances],
            ["Allineamento", sheet?.alignment],
            ["Età", sheet?.age],
            ["Aspetto", [sheet?.height, sheet?.weight, sheet?.sex].filter(Boolean).join(" · ") || undefined],
          ].map(([label, value]) => (
            <div key={String(label)} className="border-l border-barber-gold/25 pl-2">
              <dt className="text-xs text-barber-paper/55">{label}</dt>
              <dd className="mt-0.5 font-medium text-barber-paper">
                {value === null || value === undefined || value === "" ? <Missing /> : value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {showSheet ? (
        <CharacterSheetResources character={character} sheet={sheet} isLongCampaign={isLongCampaign} />
      ) : null}

      {showSheet ? (
        <Section title="Caratteristiche">
          {abilities && Object.keys(abilities).length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {ABILITIES.map(({ key, label }) => {
                const score = abilities[key];
                const mod = computedModFor(key);
                return (
                  <div key={key} className="rounded border border-barber-gold/30 bg-black/25 p-2.5 text-center">
                    <p className="text-xs font-medium text-barber-paper/65">{label}</p>
                    <p className="mt-1 font-cinzel text-2xl font-semibold tabular-nums text-gold-relief">
                      {numberOrMissing(score)}
                    </p>
                    <p className="text-xs tabular-nums text-barber-gold">
                      Mod. {mod == null ? <Missing /> : mod >= 0 ? `+${mod}` : mod}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <Missing />
          )}
        </Section>
      ) : null}

      {showSheet ? (
        <Section title="Tiri salvezza e tutte le 18 abilità">
          <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
            <div>
              <h4 className="mb-2 text-sm font-medium text-barber-paper/80">Tiri salvezza</h4>
              <dl className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                {ABILITIES.map(({ key, label }) => (
                  <div key={key} className="flex justify-between gap-2 border-b border-barber-gold/10 py-1">
                    <dt>{label}</dt>
                    <dd>{formatCheck(checks?.[key], computedModFor(key))}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium text-barber-paper/80">Abilità D&D 5e</h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                {ALL_CHARACTER_SKILLS.map(({ key, label, ability, abilityLabel }) => (
                  <div key={key} className="flex justify-between gap-2 border-b border-barber-gold/10 py-1">
                    <dt>
                      {label} <span className="text-xs text-barber-paper/50">({abilityLabel})</span>
                    </dt>
                    <dd>{formatCheck(skills?.[key], computedModFor(ability))}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </Section>
      ) : null}

      {showSheet ? (
        <Section title="Attacchi e armi">
          <LongWeaponsSection character={character} sheet={sheet} isLongCampaign={isLongCampaign} />
        </Section>
      ) : null}

      {showSheet ? (
        <Section title="Competenze e lingue">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="mb-1 text-sm text-barber-paper/70">Competenze</h4>
              <TextList
                values={[
                  ...(sheet?.proficiencies ?? []),
                  ...armorProfs.map((x) => `Armature: ${x}`),
                  ...weaponProfs.map((x) => `Armi: ${x}`),
                  ...toolProfs.map((x) => `Strumenti: ${x}`),
                ]}
              />
            </div>
            <div>
              <h4 className="mb-1 text-sm text-barber-paper/70">Lingue</h4>
              <TextList values={languages} />
            </div>
          </div>
        </Section>
      ) : null}

      {showStory ? (
        <>
          <Section title="Personalità e appunti del personaggio">
            <LongBioNotesEditorSection
              character={character}
              personality={personality}
              playerNotes={sheet?.playerNotes}
              isLongCampaign={isLongCampaign}
            />
          </Section>
          <Section title="Capacità e tratti">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-1 text-sm text-barber-paper/70">Razza</h4>
                {trait(sheet?.raceTraitsMd ?? derivedSnap?.raceTraitsMd)}
                <h4 className="mb-1 mt-3 text-sm text-barber-paper/70">Sottorazza</h4>
                {trait(sheet?.subraceTraitsMd ?? derivedSnap?.subraceTraitsMd)}
              </div>
              <div>
                <h4 className="mb-1 text-sm text-barber-paper/70">Classe</h4>
                {trait(sheet?.classFeaturesMd ?? derivedSnap?.classPrivilegesMd)}
                <h4 className="mb-1 mt-3 text-sm text-barber-paper/70">Sottoclasse</h4>
                {trait(sheet?.subclassFeaturesMd ?? derivedSnap?.classSubclassMd)}
              </div>
              <div className="md:col-span-2">
                <h4 className="mb-1 text-sm text-barber-paper/70">Background</h4>
                {trait(sheet?.backgroundMd ?? derivedSnap?.backgroundRulesMd)}
              </div>
            </div>
          </Section>
        </>
      ) : null}

      {showSpells ? (
        <Section title="Incantesimi del personaggio">
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <p>Classe: {spellcastingClass || <Missing />}</p>
            <p>Caratteristica: {spellcastingAbility?.toUpperCase() || <Missing />}</p>
            <p>CD Salvezza: {numberOrMissing(spellSaveDc)}</p>
            <p>
              Attacco magico:{" "}
              {spellAttackBonus == null ? <Missing /> : spellAttackBonus >= 0 ? `+${spellAttackBonus}` : spellAttackBonus}
            </p>
            <p>Trucchetti: {numberOrMissing(cantripsKnown)}</p>
            <p>Preparabili: {numberOrMissing(sheet?.spellsPrepared)}</p>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {slots.map(({ level, count }) => (
              <span key={level} className="rounded border border-barber-gold/20 px-2 py-1 text-xs">
                Liv. {level}: {count} slot max
              </span>
            ))}
            {slots.length === 0 ? <Missing /> : null}
          </div>
          <LongSpellsListSection character={character} sheet={sheet} isLongCampaign={isLongCampaign} />
        </Section>
      ) : null}

      {showEquipment ? (
        <>
          <Section title="Zaino ed equipaggiamento">
            <LongInventoryEditorSection
              character={character}
              items={sheet?.inventory}
              isLongCampaign={isLongCampaign}
            />
          </Section>
          {sheet?.attunements?.length ? (
            <Section title="Oggetti magici in sintonizzazione">
              <TextList values={sheet.attunements} />
            </Section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
