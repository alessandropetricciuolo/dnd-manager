import type { SkillKey } from "@/lib/sheet-generator/types";

/** Scelte manuali del giocatore durante la generazione scheda. */
export type CharacterBuildOverrides = {
  classSkills?: SkillKey[];
  cantrips?: string[];
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
