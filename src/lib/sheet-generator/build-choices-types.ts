import type { SkillKey } from "@/lib/sheet-generator/types";
import type { SelectedWeaponChoice } from "./weapon-catalog";

/** Scelte manuali del giocatore durante la generazione scheda. */
export type CharacterBuildOverrides = {
  abilities?: Record<import("@/lib/sheet-generator/types").AbilityKey, number>;
  artificer?: import("./artificer-types").ArtificerChoices;
  weapons?: SelectedWeaponChoice[];
  classSkills?: SkillKey[];
  /** Tre competenze aggiuntive concesse dal Collegio della Sapienza del Bardo (separate dalle normali competenze di classe). */
  bonusSkills?: SkillKey[];
  bardBonusSkills?: SkillKey[];
  /** Maestria (doppio PB): scelte manuali; se vuote, assegnate automaticamente. */
  expertiseSkills?: SkillKey[];
  cantrips?: string[];
  racialCantrip?: string;
  spells?: string[];
  fightingStyle?: string;
  secondFightingStyle?: string;
  warlockPact?: string;
  warlockInvocations?: string[];
  favoredEnemies?: string[];
  favoredTerrains?: string[];
  fighter?: import("./fighter-archetypes").FighterChoices;
  barbarian?: import("./barbarian-paths").BarbarianChoices;
  cleric?: import("./cleric-domains").ClericChoices;
  druid?: import("./druid-circles").DruidChoices;
  rogue?: import("./rogue-archetypes").RogueChoices;
  wizard?: import("./wizard-traditions").WizardChoices;
  monk?: import("./monk-traditions").MonkChoices;
  paladin?: import("./paladin-oaths").PaladinChoices;
  ranger?: import("./ranger-archetypes").RangerChoices;
  sorcerer?: import("./sorcerer-origins").SorcererChoices;
  warlock?: import("./warlock-patrons").WarlockChoices;
};

export type BuildChoiceOption = {
  value: string;
  label: string;
  meta?: string;
  disabled?: boolean;
  requiresInfusion?: string;
  requiresAttunement?: boolean;
};

/** Un menu a tendina (o slot) modificabile in fase di anteprima scelte. */
export type BuildChoiceSlot = {
  id: string;
  label: string;
  group: string;
  options: BuildChoiceOption[];
  value: string;
};

export type BuildChoicesPreview = {
  slots: BuildChoiceSlot[];
  overrides: CharacterBuildOverrides;
};
