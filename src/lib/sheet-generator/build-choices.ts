import { classByLabel, maxSpellLevelOnSheet } from "@/lib/character-build-catalog";
import {
  pickDefaultFightingStyle,
  pickDefaultWarlockInvocations,
  pickDefaultWarlockPact,
  fightingStyleSheetSeed,
  warlockBuildSeed,
} from "@/lib/sheet-generator/build-choice-defaults";
import type {
  BuildChoiceSlot,
  BuildChoicesPreview,
  CharacterBuildOverrides,
} from "@/lib/sheet-generator/build-choices-types";
import {
  PHB_FIGHTING_STYLE_OPTIONS,
  filterWarlockInvocationsForLevel,
  warlockInvocationsKnown,
} from "@/lib/sheet-generator/class-choice-catalog";
import {
  computeCoreSheet,
  getClassSkillPool,
  pickDefaultClassSkills,
} from "@/lib/sheet-generator/build-engine";
import {
  favoredEnemyCountForLevel,
  favoredTerrainCountForLevel,
  pickRangerFavoredEnemies,
  pickRangerFavoredTerrains,
  RANGER_FAVORED_ENEMY_TYPES,
  RANGER_FAVORED_TERRAINS,
} from "@/lib/sheet-generator/ranger-meta";
import {
  loadClassSpellPool,
  pickDefaultCantrips,
  pickDefaultLeveledSpells,
  spellSelectionCount,
} from "@/lib/sheet-generator/rules-resolver";
import {
  cantripsKnownForClass,
  slotsForClassLevel,
  SPELLCASTING_ABILITY_BY_CLASS,
} from "@/lib/sheet-generator/spell-slots";
import {
  detectThirdCasterSubclass,
  detectWildMagicBarbarianPath,
  getThirdCasterWizardSpellcasting,
} from "@/lib/sheet-generator/third-caster-subclass";
import type { CharacterGeneratorInput, SkillKey } from "@/lib/sheet-generator/types";

const CLASSES_WITH_FIGHTING_STYLE = new Set(["Guerriero", "Paladino", "Ranger"]);

export const SKILL_LABELS_IT: Record<SkillKey, string> = {
  acrobatics: "Acrobazia",
  animal_handling: "Addestrare Animali",
  arcana: "Arcano",
  athletics: "Atletica",
  deception: "Inganno",
  history: "Storia",
  insight: "Intuizione",
  intimidation: "Intimidazione",
  investigation: "Indagare",
  medicine: "Medicina",
  nature: "Natura",
  perception: "Percezione",
  performance: "Intrattenere",
  persuasion: "Persuasione",
  religion: "Religione",
  sleight_of_hand: "Rapidità di Mano",
  stealth: "Furtività",
  survival: "Sopravvivenza",
};

function slot(
  id: string,
  label: string,
  group: string,
  options: Array<{ value: string; label: string; meta?: string }>,
  value: string
): BuildChoiceSlot {
  return { id, label, group, options, value };
}

import {
  applySlotChange,
  overridesFromSlots,
  slotsToOverrides,
} from "@/lib/sheet-generator/build-choices-client";

/** Anteprima scelte modificabili (valori precompilati dal motore automatico). */
export async function resolveBuildChoicesPreview(
  input: CharacterGeneratorInput,
  requestOrigin?: string | null
): Promise<BuildChoicesPreview> {
  const slots: BuildChoiceSlot[] = [];
  const core = computeCoreSheet(input.classLabel, input.level, input.backgroundSlug);
  const classDef = classByLabel(input.classLabel);
  const tcWizard = getThirdCasterWizardSpellcasting(
    detectThirdCasterSubclass(input.classLabel, input.classSubclass),
    input.level
  );
  const wmBarb =
    detectWildMagicBarbarianPath(input.classLabel, input.classSubclass) && input.level >= 3;

  const defaultSkills = pickDefaultClassSkills(
    input.classLabel,
    input.backgroundSlug,
    core.abilityMods
  );
  const skillPool = getClassSkillPool(input.classLabel);
  if (skillPool.length >= 2) {
    const skillOptions = skillPool.map((k) => ({
      value: k,
      label: SKILL_LABELS_IT[k],
    }));
    for (let i = 0; i < 2; i += 1) {
      slots.push(
        slot(
          `skill-${i + 1}`,
          `Competenza di classe ${i + 1}`,
          "Competenze",
          skillOptions,
          defaultSkills[i] ?? skillOptions[0]?.value ?? ""
        )
      );
    }
  }

  if (CLASSES_WITH_FIGHTING_STYLE.has(input.classLabel)) {
    const seed = fightingStyleSheetSeed(input);
    const style = pickDefaultFightingStyle(seed);
    const styleOptions = PHB_FIGHTING_STYLE_OPTIONS.map((s) => ({ value: s, label: s }));
    slots.push(
      slot("fighting-style", "Stile di combattimento", "Classe", styleOptions, style)
    );
  }

  if (input.classLabel === "Ranger") {
    const seed = fightingStyleSheetSeed(input);
    const enemyCount = favoredEnemyCountForLevel(input.level);
    const terrainCount = favoredTerrainCountForLevel(input.level);
    const defaultEnemies = pickRangerFavoredEnemies(seed, input.level);
    const defaultTerrains = pickRangerFavoredTerrains(seed, input.level);
    const enemyOptions = RANGER_FAVORED_ENEMY_TYPES.map((e) => ({
      value: e,
      label: e.charAt(0).toUpperCase() + e.slice(1),
    }));
    const terrainOptions = RANGER_FAVORED_TERRAINS.map((t) => ({
      value: t,
      label: t.charAt(0).toUpperCase() + t.slice(1),
    }));
    for (let i = 0; i < enemyCount; i += 1) {
      slots.push(
        slot(
          `favored-enemy-${i + 1}`,
          `Nemico prescelto ${i + 1}`,
          "Ranger",
          enemyOptions,
          defaultEnemies[i] ?? enemyOptions[0]?.value ?? ""
        )
      );
    }
    for (let i = 0; i < terrainCount; i += 1) {
      slots.push(
        slot(
          `favored-terrain-${i + 1}`,
          `Terreno prescelto ${i + 1}`,
          "Ranger",
          terrainOptions,
          defaultTerrains[i] ?? terrainOptions[0]?.value ?? ""
        )
      );
    }
  }

  let warlockPact: string | null = null;
  if (input.classLabel === "Warlock") {
    const seed = warlockBuildSeed(input);
    warlockPact = pickDefaultWarlockPact(seed);
    const pactOptions = [
      { value: "Patto della Catena", label: "Patto della Catena" },
      { value: "Patto della Lama", label: "Patto della Lama" },
      { value: "Patto del Tomo", label: "Patto del Tomo" },
    ];
    slots.push(
      slot("warlock-pact", "Dono del patto", "Warlock", pactOptions, warlockPact)
    );

    const invCount = Math.max(2, warlockInvocationsKnown(input.level));
    const defaultInv = pickDefaultWarlockInvocations(seed, input.level, warlockPact);
    const invOptions = filterWarlockInvocationsForLevel(input.level, warlockPact).map((o) => ({
      value: o.name,
      label: o.name,
      meta: o.summary,
    }));
    for (let i = 0; i < invCount; i += 1) {
      slots.push(
        slot(
          `invocation-${i + 1}`,
          `Supplica occulta ${i + 1}`,
          "Warlock",
          invOptions,
          defaultInv[i] ?? invOptions[0]?.value ?? ""
        )
      );
    }
  }

  const spellAbility = tcWizard ? "int" : SPELLCASTING_ABILITY_BY_CLASS[input.classLabel] ?? null;
  const castingMod = spellAbility ? core.abilityMods[spellAbility] : 0;
  let cantripsKnown = cantripsKnownForClass(input.classLabel, input.level);
  let spellsPrepared = 0;
  if (tcWizard) {
    cantripsKnown = tcWizard.cantripsKnown;
    spellsPrepared = tcWizard.spellsKnown;
  } else if (spellAbility && !wmBarb) {
    spellsPrepared = spellSelectionCount(input.classLabel, input.level, castingMod);
  }

  const shouldLoadSpells =
    (cantripsKnown > 0 || spellsPrepared > 0) && (!!tcWizard || !!classDef?.spellList);

  if (shouldLoadSpells) {
    const spellSlots = slotsForClassLevel(classDef, input.level);
    const maxOnSheet = tcWizard
      ? tcWizard.maxSpellLevelOnList
      : maxSpellLevelOnSheet(classDef, input.level);

    const { entries, torneoPool } = await loadClassSpellPool(
      {
        classLabel: input.classLabel,
        classSubclass: input.classSubclass,
        level: input.level,
        torneoMode: input.torneoMode,
        tcWizard: !!tcWizard,
      },
      maxOnSheet,
      requestOrigin
    );

    const pool = torneoPool.length ? torneoPool : entries;
    const combatPriority = !!input.powerPlayer || !!input.torneoMode;

    const defaultCantrips = pickDefaultCantrips(
      entries,
      cantripsKnown,
      !!input.torneoMode,
      combatPriority,
      input.classLabel,
      input.classSubclass
    );
    const defaultSpells = pickDefaultLeveledSpells(
      pool,
      entries,
      spellsPrepared,
      maxOnSheet,
      spellSlots,
      input.classLabel,
      combatPriority,
      input.torneoMode,
      input.classSubclass
    );

    const cantripOptions = entries
      .filter((e) => e.level === 0)
      .map((e) => ({ value: e.name, label: e.name }));

    for (let i = 0; i < cantripsKnown; i += 1) {
      slots.push(
        slot(
          `cantrip-${i + 1}`,
          `Trucchetto ${i + 1}`,
          "Incantesimi",
          cantripOptions,
          defaultCantrips[i]?.name ?? cantripOptions[0]?.value ?? ""
        )
      );
    }

    const leveledOptions = entries
      .filter((e) => e.level >= 1 && e.level <= maxOnSheet)
      .map((e) => ({
        value: e.name,
        label: e.name,
        meta: e.level > 0 ? `Livello ${e.level}` : undefined,
      }));

    for (let i = 0; i < spellsPrepared; i += 1) {
      slots.push(
        slot(
          `spell-${i + 1}`,
          spellsPrepared === 1 ? "Incantesimo" : `Incantesimo ${i + 1}`,
          "Incantesimi",
          leveledOptions,
          defaultSpells[i]?.name ?? leveledOptions[0]?.value ?? ""
        )
      );
    }
  }

  return { slots, overrides: overridesFromSlots(slots) };
}

export { applySlotChange, slotsToOverrides } from "@/lib/sheet-generator/build-choices-client";

export function validateBuildOverrides(
  overrides: CharacterBuildOverrides,
  preview: BuildChoicesPreview
): string[] {
  const errors: string[] = [];

  for (const s of preview.slots) {
    let val: string | undefined;
    if (s.id.startsWith("skill-")) {
      const idx = Number.parseInt(s.id.replace("skill-", ""), 10) - 1;
      val = overrides.classSkills?.[idx];
    } else if (s.id.startsWith("cantrip-")) {
      const idx = Number.parseInt(s.id.replace("cantrip-", ""), 10) - 1;
      val = overrides.cantrips?.[idx];
    } else if (s.id.startsWith("spell-")) {
      const idx = Number.parseInt(s.id.replace("spell-", ""), 10) - 1;
      val = overrides.spells?.[idx];
    } else if (s.id.startsWith("invocation-")) {
      const idx = Number.parseInt(s.id.replace("invocation-", ""), 10) - 1;
      val = overrides.warlockInvocations?.[idx];
    } else if (s.id.startsWith("favored-enemy-")) {
      const idx = Number.parseInt(s.id.replace("favored-enemy-", ""), 10) - 1;
      val = overrides.favoredEnemies?.[idx];
    } else if (s.id.startsWith("favored-terrain-")) {
      const idx = Number.parseInt(s.id.replace("favored-terrain-", ""), 10) - 1;
      val = overrides.favoredTerrains?.[idx];
    } else if (s.id === "fighting-style") {
      val = overrides.fightingStyle;
    } else if (s.id === "warlock-pact") {
      val = overrides.warlockPact;
    }

    if (!val) continue;
    if (!s.options.some((o) => o.value === val)) {
      errors.push(`Scelta non valida per ${s.label}: ${val}`);
    }
  }

  const skillSet = new Set(overrides.classSkills ?? []);
  if ((overrides.classSkills?.length ?? 0) > 1 && skillSet.size !== overrides.classSkills!.length) {
    errors.push("Le competenze di classe devono essere diverse.");
  }

  const allSpells = [...(overrides.cantrips ?? []), ...(overrides.spells ?? [])];
  const spellSet = new Set(allSpells.map((n) => n.toLocaleLowerCase("it")));
  if (spellSet.size !== allSpells.length) {
    errors.push("Non puoi selezionare lo stesso incantesimo più volte.");
  }

  const invSet = new Set(overrides.warlockInvocations ?? []);
  if (invSet.size !== (overrides.warlockInvocations?.length ?? 0)) {
    errors.push("Le suppliche occulte devono essere diverse.");
  }

  return errors;
}
