export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type SkillKey =
  | "acrobatics"
  | "animal_handling"
  | "arcana"
  | "athletics"
  | "deception"
  | "history"
  | "insight"
  | "intimidation"
  | "investigation"
  | "medicine"
  | "nature"
  | "perception"
  | "performance"
  | "persuasion"
  | "religion"
  | "sleight_of_hand"
  | "stealth"
  | "survival";

export type CharacterGeneratorInput = {
  characterName: string;
  raceSlug: string;
  subraceSlug: string | null;
  classLabel: string;
  classSubclass: string | null;
  backgroundSlug: string;
  level: number;
  alignment: string | null;
  age: string | null;
  height: string | null;
  weight: string | null;
  sex: string | null;
};

export type GeneratedSpell = {
  level: number;
  name: string;
  summary: string;
  ritual: boolean;
  concentration: boolean;
  verbal: boolean;
  somatic: boolean;
};

export type GeneratedCharacterSheet = {
  characterName: string;
  raceLabel: string;
  subraceLabel: string | null;
  classLabel: string;
  classSubclass: string | null;
  backgroundLabel: string;
  level: number;
  alignment: string | null;
  age: string | null;
  height: string | null;
  weight: string | null;
  sex: string | null;

  abilities: Record<AbilityKey, number>;
  abilityMods: Record<AbilityKey, number>;
  proficiencyBonus: number;
  savingThrows: Record<AbilityKey, { value: number; proficient: boolean }>;
  skills: Record<SkillKey, { value: number; proficient: boolean }>;
  passivePerception: number;

  speed: string;
  armorClass: number;
  initiative: number;
  hpMax: number;
  hitDie: string;
  hitDiceTotal: number;

  weaponRows: Array<{ name: string; toHit: string; damage: string; type: string }>;
  inventory: string[];
  languages: string[];
  proficiencies: string[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  toolProficiencies: string[];
  raceTraitsMd: string;
  subraceTraitsMd: string | null;
  classFeaturesMd: string;
  subclassFeaturesMd: string | null;
  backgroundMd: string | null;

  spellcastingClass: string | null;
  spellcastingAbility: AbilityKey | null;
  spellSaveDc: number | null;
  spellAttackBonus: number | null;
  spellSlots: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>;
  cantripsKnown: number;
  spellsPrepared: number;
  spells: GeneratedSpell[];
};

export type GeneratorBuildResult = {
  sheet: GeneratedCharacterSheet;
  warnings: string[];
};
