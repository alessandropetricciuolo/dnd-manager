import type { SkillKey } from "@/lib/sheet-generator/types";

/** Scelte manuali del giocatore durante la generazione scheda. */
export type CharacterBuildOverrides = {
  abilities?: Record<import("@/lib/sheet-generator/types").AbilityKey, number>;
  artificer?: import("./artificer-types").ArtificerChoices;
  classSkills?: SkillKey[];
  /** Maestria (doppio PB): scelte manuali; se vuote, assegnate automaticamente. */
  expertiseSkills?: SkillKey[];
  cantrips?: string[];
  racialCantrip?: string;
  spells?: string[];
  fightingStyle?: string;
  warlockPact?: string;
  warlockInvocations?: string[];
  favoredEnemies?: string[];
  favoredTerrains?: string[];
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
