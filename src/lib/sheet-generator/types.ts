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
  /** Se true, gli incantesimi sulla scheda privilegiano una tier list orientata al combattimento. */
  powerPlayer?: boolean;
  /** Modalità torneo: aggiunge Manuale rapido nel PDF (sezioni testo manuale). */
  torneoMode?: boolean;
  /** Aggiunge al PDF il testo del background PHB e/o la storia narrativa del PG. */
  includeBackgroundStoryInPdf?: boolean;
  /** Storia narrativa del PG (pagina «Storia del personaggio» se includeBackgroundStoryInPdf). */
  characterStory?: string | null;
  /** Scelte manuali (incantesimi, stile di combattimento, ecc.). */
  buildOverrides?: import("@/lib/sheet-generator/build-choices-types").CharacterBuildOverrides;
};

export type SpellOrigin = "class" | "subclass" | "race" | "feat" | "item" | "pact" | "arcanum";

export type GeneratedSpell = {
  level: number;
  name: string;
  summary: string;
  ritual: boolean;
  concentration: boolean;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  /** Testo completo dal manuale (per Manuale rapido torneo e consultazione sito). */
  fullTextMd?: string | null;
  /** Provenienza strutturata dell'incantesimo. */
  origin?: SpellOrigin;
  /** Etichetta leggibile della fonte specifica (es. "Elfo alto", "Dominio della Vita", "Arcanum Mistico"). */
  sourceLabel?: string;
  /** Caratteristica da incantatore specifica di questa provenienza. */
  ability?: AbilityKey;
  /** Sempre preparato (non conta nel limite di incantesimi preparati giornalieri). */
  alwaysPrepared?: boolean;
  /** Limite di utilizzi indipendente dagli slot (es. "1/riposo lungo", "A volontà", "Solo rituale"). */
  usesPerRest?: string;
  /** Se false, il lancio concesso da questa fonte non consuma uno slot ordinario. */
  requiresSlot?: boolean;
  /** Livello effettivo di lancio se fisso e superiore al livello base (es. Intimorire Infernale al 2° liv). */
  castAtLevel?: number;
  /** Sovrascrittura specifica del tempo di lancio (es. Cerchio di Mortalità: 1 azione bonus). */
  castingTimeOverride?: string;
  /** Sovrascrittura specifica della gittata (es. Cerchio di Mortalità: 9 m, Sussurri Guida: 18 m). */
  rangeOverride?: string;
};

export type GeneratedCharacterSheet = {
  artificer?: import("./artificer-types").ArtificerState;
  racialSpells?: GeneratedSpell[];
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
  skills: Record<SkillKey, { value: number; proficient: boolean; expertise?: boolean }>;
  passivePerception: number;

  speed: string;
  armorClass: number;
  /** Indica se il bonus di +1 dello Stile Difesa è già stato applicato alla CA. */
  defenseStyleApplied?: boolean;
  /** Nome dell'armatura fisica indossata (es. 'cotta di maglia', 'armatura di scaglie'), oppure null se non protetto da armatura fisica. */
  armorItem?: string | null;
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
