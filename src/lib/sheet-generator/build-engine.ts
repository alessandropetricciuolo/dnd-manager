import { backgroundBySlug, raceBySlug } from "@/lib/character-build-catalog";
import { resolveGeneratorRules } from "@/lib/sheet-generator/rules-resolver";
import type {
  AbilityKey,
  CharacterGeneratorInput,
  GeneratedCharacterSheet,
  GeneratorBuildResult,
  SkillKey,
} from "@/lib/sheet-generator/types";

const ABILITIES: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

const SKILL_ABILITY: Record<SkillKey, AbilityKey> = {
  acrobatics: "dex",
  animal_handling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleight_of_hand: "dex",
  stealth: "dex",
  survival: "wis",
};

type ClassCombatConfig = {
  hitDie: number;
  primary: AbilityKey[];
  savingThrows: AbilityKey[];
  armorClassBase: number;
  speed: string;
  weaponSet: Array<{ name: string; damage: string; type: string }>;
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  genericProficiencies: string[];
  skillPicks: SkillKey[];
};

const CLASS_CONFIG: Record<string, ClassCombatConfig> = {
  Barbaro: {
    hitDie: 12,
    primary: ["str", "con", "dex"],
    savingThrows: ["str", "con"],
    armorClassBase: 14,
    speed: "9 m",
    weaponSet: [
      { name: "Ascia bipenne", damage: "1d12+FOR", type: "taglienti" },
      { name: "Giavellotto", damage: "1d6+FOR", type: "perforanti" },
    ],
    armorProficiencies: ["Armature leggere", "Armature medie", "Scudi"],
    weaponProficiencies: ["Armi semplici", "Armi da guerra"],
    toolProficiencies: [],
    genericProficiencies: [],
    skillPicks: ["athletics", "survival"],
  },
  Bardo: {
    hitDie: 8,
    primary: ["cha", "dex", "con"],
    savingThrows: ["dex", "cha"],
    armorClassBase: 13,
    speed: "9 m",
    weaponSet: [
      { name: "Stocco", damage: "1d8+DES", type: "perforanti" },
      { name: "Pugnale", damage: "1d4+DES", type: "perforanti" },
    ],
    armorProficiencies: ["Armature leggere"],
    weaponProficiencies: ["Armi semplici", "Balestre a mano", "Spade corte", "Spade lunghe", "Stocchi"],
    toolProficiencies: ["Strumenti musicali"],
    genericProficiencies: [],
    skillPicks: ["persuasion", "performance", "insight"],
  },
  Chierico: {
    hitDie: 8,
    primary: ["wis", "con", "str"],
    savingThrows: ["wis", "cha"],
    armorClassBase: 17,
    speed: "9 m",
    weaponSet: [
      { name: "Mazza", damage: "1d6+FOR", type: "contundenti" },
      { name: "Balestra leggera", damage: "1d8+DES", type: "perforanti" },
    ],
    armorProficiencies: ["Armature leggere", "Armature medie", "Scudi"],
    weaponProficiencies: ["Armi semplici"],
    toolProficiencies: [],
    genericProficiencies: [],
    skillPicks: ["insight", "religion"],
  },
  Druido: {
    hitDie: 8,
    primary: ["wis", "con", "dex"],
    savingThrows: ["int", "wis"],
    armorClassBase: 14,
    speed: "9 m",
    weaponSet: [
      { name: "Scimitarra", damage: "1d6+DES", type: "taglienti" },
      { name: "Bastone ferrato", damage: "1d6+FOR", type: "contundenti" },
    ],
    armorProficiencies: ["Armature leggere", "Armature medie (non metalliche)", "Scudi (non metallici)"],
    weaponProficiencies: ["Bastoni ferrati", "Pugnali", "Scimitarre", "Giavellotti", "Falcetti", "Lance", "Fionde"],
    toolProficiencies: ["Kit erborista"],
    genericProficiencies: [],
    skillPicks: ["nature", "survival"],
  },
  Guerriero: {
    hitDie: 10,
    primary: ["str", "con", "dex"],
    savingThrows: ["str", "con"],
    armorClassBase: 17,
    speed: "9 m",
    weaponSet: [
      { name: "Spada lunga", damage: "1d8+FOR", type: "taglienti" },
      { name: "Arco lungo", damage: "1d8+DES", type: "perforanti" },
    ],
    armorProficiencies: ["Armature leggere", "Armature medie", "Armature pesanti", "Scudi"],
    weaponProficiencies: ["Armi semplici", "Armi da guerra"],
    toolProficiencies: [],
    genericProficiencies: [],
    skillPicks: ["athletics", "perception"],
  },
  Ladro: {
    hitDie: 8,
    primary: ["dex", "con", "int"],
    savingThrows: ["dex", "int"],
    armorClassBase: 14,
    speed: "9 m",
    weaponSet: [
      { name: "Stocco", damage: "1d8+DES", type: "perforanti" },
      { name: "Arco corto", damage: "1d6+DES", type: "perforanti" },
    ],
    armorProficiencies: ["Armature leggere"],
    weaponProficiencies: ["Armi semplici", "Balestre a mano", "Spade corte", "Spade lunghe", "Stocchi"],
    toolProficiencies: ["Arnesi da scasso"],
    genericProficiencies: [],
    skillPicks: ["stealth", "sleight_of_hand", "perception", "investigation"],
  },
  Mago: {
    hitDie: 6,
    primary: ["int", "con", "dex"],
    savingThrows: ["int", "wis"],
    armorClassBase: 13,
    speed: "9 m",
    weaponSet: [
      { name: "Pugnale", damage: "1d4+DES", type: "perforanti" },
      { name: "Bastone ferrato", damage: "1d6+FOR", type: "contundenti" },
    ],
    armorProficiencies: [],
    weaponProficiencies: ["Balestre leggere", "Bastoni ferrati", "Dardi", "Fionde", "Pugnali"],
    toolProficiencies: [],
    genericProficiencies: [],
    skillPicks: ["arcana", "history"],
  },
  Monaco: {
    hitDie: 8,
    primary: ["dex", "wis", "con"],
    savingThrows: ["str", "dex"],
    armorClassBase: 10,
    speed: "9 m",
    weaponSet: [
      { name: "Colpo senz'armi", damage: "1d4+DES", type: "contundenti" },
      { name: "Spada corta", damage: "1d6+DES", type: "perforanti" },
    ],
    armorProficiencies: [],
    weaponProficiencies: ["Armi semplici", "Spade corte"],
    toolProficiencies: ["Strumento musicale o artigiano"],
    genericProficiencies: [],
    skillPicks: ["acrobatics", "insight"],
  },
  Paladino: {
    hitDie: 10,
    primary: ["str", "cha", "con"],
    savingThrows: ["wis", "cha"],
    armorClassBase: 18,
    speed: "9 m",
    weaponSet: [
      { name: "Spada lunga", damage: "1d8+FOR", type: "taglienti" },
      { name: "Giavellotto", damage: "1d6+FOR", type: "perforanti" },
    ],
    armorProficiencies: ["Armature leggere", "Armature medie", "Armature pesanti", "Scudi"],
    weaponProficiencies: ["Armi semplici", "Armi da guerra"],
    toolProficiencies: [],
    genericProficiencies: [],
    skillPicks: ["persuasion", "athletics"],
  },
  Ranger: {
    hitDie: 10,
    primary: ["dex", "wis", "con"],
    savingThrows: ["str", "dex"],
    armorClassBase: 15,
    speed: "9 m",
    weaponSet: [
      { name: "Arco lungo", damage: "1d8+DES", type: "perforanti" },
      { name: "Spada corta", damage: "1d6+DES", type: "perforanti" },
    ],
    armorProficiencies: ["Armature leggere", "Armature medie", "Scudi"],
    weaponProficiencies: ["Armi semplici", "Armi da guerra"],
    toolProficiencies: [],
    genericProficiencies: [],
    skillPicks: ["perception", "survival", "stealth"],
  },
  Stregone: {
    hitDie: 6,
    primary: ["cha", "con", "dex"],
    savingThrows: ["con", "cha"],
    armorClassBase: 13,
    speed: "9 m",
    weaponSet: [
      { name: "Pugnale", damage: "1d4+DES", type: "perforanti" },
      { name: "Balestra leggera", damage: "1d8+DES", type: "perforanti" },
    ],
    armorProficiencies: [],
    weaponProficiencies: ["Balestre leggere", "Bastoni ferrati", "Fionde", "Pugnali", "Dardi"],
    toolProficiencies: [],
    genericProficiencies: [],
    skillPicks: ["arcana", "persuasion"],
  },
  Warlock: {
    hitDie: 8,
    primary: ["cha", "con", "dex"],
    savingThrows: ["wis", "cha"],
    armorClassBase: 14,
    speed: "9 m",
    weaponSet: [
      { name: "Daga", damage: "1d4+DES", type: "perforanti" },
      { name: "Balestra leggera", damage: "1d8+DES", type: "perforanti" },
    ],
    armorProficiencies: ["Armature leggere"],
    weaponProficiencies: ["Armi semplici"],
    toolProficiencies: [],
    genericProficiencies: [],
    skillPicks: ["deception", "arcana"],
  },
  Artefice: {
    hitDie: 8,
    primary: ["int", "con", "dex"],
    savingThrows: ["con", "int"],
    armorClassBase: 15,
    speed: "9 m",
    weaponSet: [
      { name: "Balestra leggera", damage: "1d8+DES", type: "perforanti" },
      { name: "Martello leggero", damage: "1d4+FOR", type: "contundenti" },
    ],
    armorProficiencies: ["Armature leggere", "Armature medie", "Scudi"],
    weaponProficiencies: ["Armi semplici"],
    toolProficiencies: ["Attrezzi da ladro", "Attrezzi da artigiano"],
    genericProficiencies: [],
    skillPicks: ["arcana", "investigation"],
  },
};

const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

function modifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function proficiencyBonus(level: number): number {
  return 2 + Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4);
}

export function buildPointBuy(primaryOrder: AbilityKey[]): Record<AbilityKey, number> {
  const scores: Record<AbilityKey, number> = {
    str: 8,
    dex: 8,
    con: 8,
    int: 8,
    wis: 8,
    cha: 8,
  };
  const targets = [15, 15, 14, 12, 10, 8];
  let budget = 27;
  for (let i = 0; i < primaryOrder.length; i += 1) {
    const ability = primaryOrder[i];
    const target = targets[i] ?? 8;
    while (scores[ability] < target && scores[ability] < 15) {
      const next = scores[ability] + 1;
      const step = (POINT_BUY_COST[next] ?? 99) - (POINT_BUY_COST[scores[ability]] ?? 99);
      if (step > budget) break;
      scores[ability] = next;
      budget -= step;
    }
  }
  // spende eventuale residuo su Costituzione e poi Destrezza
  for (const a of ["con", "dex"] as AbilityKey[]) {
    while (scores[a] < 15) {
      const next = scores[a] + 1;
      const step = (POINT_BUY_COST[next] ?? 99) - (POINT_BUY_COST[scores[a]] ?? 99);
      if (step > budget) break;
      scores[a] = next;
      budget -= step;
    }
  }
  return scores;
}

function computeHpMax(level: number, hitDie: number, conMod: number): number {
  const avg = Math.floor(hitDie / 2) + 1;
  const first = hitDie + conMod;
  const others = Math.max(0, level - 1) * (avg + conMod);
  return Math.max(level, first + others);
}

function computeCoreFromAbilities(
  classLabel: string,
  level: number,
  abilities: Record<AbilityKey, number>
): Pick<
  GeneratedCharacterSheet,
  | "abilities"
  | "abilityMods"
  | "proficiencyBonus"
  | "savingThrows"
  | "skills"
  | "passivePerception"
  | "speed"
  | "armorClass"
  | "initiative"
  | "hpMax"
  | "hitDie"
  | "hitDiceTotal"
  | "weaponRows"
  | "proficiencies"
  | "armorProficiencies"
  | "weaponProficiencies"
  | "toolProficiencies"
  | "inventory"
  | "languages"
> {
  const cfg = CLASS_CONFIG[classLabel] ?? CLASS_CONFIG.Guerriero;
  const lvl = Math.max(1, Math.min(20, level));
  const abilityMods = ABILITIES.reduce(
    (acc, a) => ({ ...acc, [a]: modifier(abilities[a]) }),
    {} as Record<AbilityKey, number>
  );
  const pb = proficiencyBonus(lvl);

  const savingThrows = ABILITIES.reduce((acc, a) => {
    const proficient = cfg.savingThrows.includes(a);
    acc[a] = { value: abilityMods[a] + (proficient ? pb : 0), proficient };
    return acc;
  }, {} as Record<AbilityKey, { value: number; proficient: boolean }>);

  const skillSet = new Set(cfg.skillPicks);
  const skills = (Object.keys(SKILL_ABILITY) as SkillKey[]).reduce((acc, k) => {
    const proficient = skillSet.has(k);
    const ability = SKILL_ABILITY[k];
    acc[k] = { value: abilityMods[ability] + (proficient ? pb : 0), proficient };
    return acc;
  }, {} as Record<SkillKey, { value: number; proficient: boolean }>);

  const passivePerception = 10 + skills.perception.value;
  const initiative = abilityMods.dex;
  const armorClass = Math.max(10 + abilityMods.dex, cfg.armorClassBase + Math.min(2, abilityMods.dex));
  const hpMax = computeHpMax(lvl, cfg.hitDie, abilityMods.con);
  const weaponRows = cfg.weaponSet.map((w) => ({
    name: w.name,
    damage: w.damage,
    type: w.type,
    toHit: `+${pb + Math.max(abilityMods.str, abilityMods.dex)}`,
  }));

  return {
    abilities,
    abilityMods,
    proficiencyBonus: pb,
    savingThrows,
    skills,
    passivePerception,
    speed: cfg.speed,
    armorClass,
    initiative,
    hpMax,
    hitDie: `d${cfg.hitDie}`,
    hitDiceTotal: lvl,
    weaponRows,
    proficiencies: [...cfg.genericProficiencies],
    armorProficiencies: cfg.armorProficiencies,
    weaponProficiencies: cfg.weaponProficiencies,
    toolProficiencies: cfg.toolProficiencies,
    inventory: ["Zaino", "Razioni x10", "Otre", "Corda di canapa (15 m)"],
    languages: ["Comune"],
  };
}

function parseAbilityBonusesFromTraits(
  text: string,
  primaryOrder: AbilityKey[]
): Partial<Record<AbilityKey, number>> {
  const bonuses: Partial<Record<AbilityKey, number>> = {};
  const t = text.toLowerCase();
  const add = (a: AbilityKey, n: number) => {
    bonuses[a] = (bonuses[a] ?? 0) + n;
  };
  const abilityPatterns: Array<{ key: AbilityKey; re: RegExp }> = [
    { key: "str", re: /forza/gi },
    { key: "dex", re: /destrezza/gi },
    { key: "con", re: /costituzione/gi },
    { key: "int", re: /intelligenza/gi },
    { key: "wis", re: /saggezza/gi },
    { key: "cha", re: /carisma/gi },
  ];

  if (/ogni punteggio di caratteristica.*aumenta di 1/.test(t)) {
    for (const a of ABILITIES) add(a, 1);
  }

  for (const { key, re } of abilityPatterns) {
    const single = new RegExp(`${re.source}[^.\\n]{0,60}aumenta di\\s*([12])`, "i");
    const m = t.match(single);
    if (m) add(key, Number.parseInt(m[1], 10));
  }

  // Pattern: "forza e costituzione aumentano di 1"
  for (let i = 0; i < abilityPatterns.length; i += 1) {
    for (let j = i + 1; j < abilityPatterns.length; j += 1) {
      const a = abilityPatterns[i];
      const b = abilityPatterns[j];
      const pair = new RegExp(`${a.re.source}[^.\\n]{0,20}e[^.\\n]{0,20}${b.re.source}[^.\\n]{0,30}aumentan[oa] di\\s*([12])`, "i");
      const m = t.match(pair);
      if (m) {
        const n = Number.parseInt(m[1], 10);
        add(a.key, n);
        add(b.key, n);
      }
    }
  }

  // Fallback per razze "choose +2/+1" (es. MPMM).
  if (Object.keys(bonuses).length === 0) {
    if (/aumenta di 2.*aumenta di 1|due punteggi.*aumentano di 1|un punteggio.*aumenta di 2/.test(t)) {
      add(primaryOrder[0] ?? "str", 2);
      add(primaryOrder[1] ?? "dex", 1);
    }
  }
  return bonuses;
}

function applyAbilityBonuses(
  base: Record<AbilityKey, number>,
  bonuses: Partial<Record<AbilityKey, number>>
): Record<AbilityKey, number> {
  const out = { ...base };
  for (const a of ABILITIES) {
    out[a] = Math.max(1, Math.min(20, out[a] + (bonuses[a] ?? 0)));
  }
  return out;
}

export function computeCoreSheet(
  classLabel: string,
  level: number
): Pick<
  GeneratedCharacterSheet,
  | "abilities"
  | "abilityMods"
  | "proficiencyBonus"
  | "savingThrows"
  | "skills"
  | "passivePerception"
  | "speed"
  | "armorClass"
  | "initiative"
  | "hpMax"
  | "hitDie"
  | "hitDiceTotal"
  | "weaponRows"
  | "proficiencies"
  | "armorProficiencies"
  | "weaponProficiencies"
  | "toolProficiencies"
  | "inventory"
  | "languages"
> {
  const cfg = CLASS_CONFIG[classLabel] ?? CLASS_CONFIG.Guerriero;
  const abilities = buildPointBuy(cfg.primary);
  return computeCoreFromAbilities(classLabel, level, abilities);
}

export async function buildGeneratedCharacterSheet(
  input: CharacterGeneratorInput,
  requestOrigin?: string | null
): Promise<GeneratorBuildResult> {
  const baseCore = computeCoreSheet(input.classLabel, input.level);
  const initialRules = await resolveGeneratorRules(
    {
      raceSlug: input.raceSlug,
      subraceSlug: input.subraceSlug,
      classLabel: input.classLabel,
      classSubclass: input.classSubclass,
      backgroundSlug: input.backgroundSlug,
      level: input.level,
    },
    baseCore.abilityMods,
    baseCore.proficiencyBonus,
    requestOrigin
  );
  const cfg = CLASS_CONFIG[input.classLabel] ?? CLASS_CONFIG.Guerriero;
  const raceBaseBonuses = parseAbilityBonusesFromTraits(initialRules.raceTraitsMd, cfg.primary);
  const subraceBonuses = parseAbilityBonusesFromTraits(initialRules.subraceTraitsMd ?? "", cfg.primary);
  const raceBonuses = ABILITIES.reduce((acc, a) => {
    acc[a] = (raceBaseBonuses[a] ?? 0) + (subraceBonuses[a] ?? 0);
    return acc;
  }, {} as Partial<Record<AbilityKey, number>>);
  const boostedAbilities = applyAbilityBonuses(baseCore.abilities, raceBonuses);
  const core = computeCoreFromAbilities(input.classLabel, input.level, boostedAbilities);
  const rules = await resolveGeneratorRules(
    {
      raceSlug: input.raceSlug,
      subraceSlug: input.subraceSlug,
      classLabel: input.classLabel,
      classSubclass: input.classSubclass,
      backgroundSlug: input.backgroundSlug,
      level: input.level,
    },
    core.abilityMods,
    core.proficiencyBonus,
    requestOrigin
  );
  const raceDef = raceBySlug(input.raceSlug);
  const subraceLabel = raceDef?.subraces?.find((s) => s.slug === input.subraceSlug)?.label ?? null;
  const bg = backgroundBySlug(input.backgroundSlug);

  const spellSaveDc =
    rules.spellcastingAbility != null
      ? 8 + core.proficiencyBonus + core.abilityMods[rules.spellcastingAbility]
      : null;
  const spellAttackBonus =
    rules.spellcastingAbility != null
      ? core.proficiencyBonus + core.abilityMods[rules.spellcastingAbility]
      : null;

  const sheet: GeneratedCharacterSheet = {
    characterName: input.characterName,
    raceLabel: raceDef?.label ?? input.raceSlug,
    subraceLabel,
    classLabel: input.classLabel,
    classSubclass: input.classSubclass,
    backgroundLabel: bg?.label ?? input.backgroundSlug,
    level: input.level,
    alignment: input.alignment,
    age: input.age,
    height: input.height,
    weight: input.weight,
    sex: input.sex,
    ...core,
    raceTraitsMd: rules.raceTraitsMd,
    subraceTraitsMd: rules.subraceTraitsMd,
    classFeaturesMd: rules.classFeaturesMd,
    subclassFeaturesMd: rules.subclassFeaturesMd,
    backgroundMd: rules.backgroundMd,
    spellcastingClass: rules.spellcastingAbility ? input.classLabel : null,
    spellcastingAbility: rules.spellcastingAbility,
    spellSaveDc,
    spellAttackBonus,
    spellSlots: rules.spellSlots,
    cantripsKnown: rules.cantripsKnown,
    spellsPrepared: rules.spellsPrepared,
    spells: rules.spells,
  };

  return { sheet, warnings: rules.warnings };
}
