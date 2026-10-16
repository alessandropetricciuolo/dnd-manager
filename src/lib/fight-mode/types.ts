import type { CombatSpellSlots } from "@/lib/combat-spell-slots";
import type { CombatConditionId } from "@/lib/combat-conditions";

export type SavingThrowsMap = {
  for: number;
  des: number;
  cos: number;
  int: number;
  sag: number;
  car: number;
};

export type SavingThrowsSource = "sheet" | "estimated" | "manual";

export type CombatReaction = {
  name: string;
  trigger?: string;
  description?: string;
};

export type WeaponAttack = {
  name: string;
  toHit: string;
  damage: string;
  type: string;
};

export type DeathSaves = {
  success: number;
  fail: number;
};

export type CombatEffectDuration = {
  /** Numero di turni residui. */
  remainingTurns: number | null;
  tickOn: "turn_start" | "turn_end";
  anchorCombatantId: string;
  /** Round e turnIndex in cui è stato applicato per evitare scadenza immediata se applicato nel turno dell'ancora */
  appliedAtRound?: number;
  appliedAtTurnIndex?: number;
  /** Se l'ancora è stata rimossa dall'iniziativa, l'automatismo viene sospeso per intervento manuale */
  anchorRemoved?: boolean;
};

export type CombatEffectSavePrompt = {
  ability: keyof SavingThrowsMap;
  dc: number;
  timing: "turn_end" | "turn_start";
  onPass?: "remove_effect" | "manual";
};

export type CombatEffectInstance = {
  /** UUID univoco di questa specifica istanza d'effetto */
  effectId: string;
  /** ID del catalogo (es. "benedizione", "avvelenato", "custom:marchiato") */
  statusId: string;
  /** Label visualizzata (obbligatoria per custom, o derivata dal catalogo) */
  label: string;
  /** ID del combattente che subisce/riceve l'effetto */
  targetId: string;
  /** ID del combattente che ha generato l'effetto */
  sourceCasterId?: string;
  /** Nome leggibile della fonte o dell'incantesimo */
  sourceName?: string;
  /** Se l'effetto dipende da una specifica concentrazione attiva */
  concentrationId?: string;
  /** Durata strutturata (in Consegna 1 non scade automaticamente) */
  duration?: CombatEffectDuration | null;
  /** Parametri TS ripetuto opzionali */
  savePrompt?: CombatEffectSavePrompt | null;
};

export type ActiveConcentration = {
  /** UUID univoco di questa specifica sessione di concentrazione */
  concentrationId: string;
  /** ID del caster che mantiene la concentrazione */
  casterId: string;
  /** Nome dell'incantesimo o capacità (es. "Benedizione", "Guardiani Spirituali") */
  spellName: string;
  /** Lista degli effectId generati da questa concentrazione (può essere vuota) */
  linkedEffectIds: string[];
  /** Round in cui è iniziata */
  startedRound: number;
  /** Turno d'iniziativa in cui è iniziata, per evitare il tick immediato. */
  startedTurnIndex?: number;
  /** Turni residui opzionali */
  remainingTurns?: number | null;
};

export type PendingConcentrationCheck = {
  checkId: string;
  casterId: string;
  casterName: string;
  /** Specifica concentrationId a cui appartiene il check */
  concentrationId: string;
  spellName: string;
  damageTaken: number;
  /** max(10, floor(damageTaken / 2)) */
  dc: number;
  /** Bonus TS COS del caster (se noto o inserito manualmente) */
  conSaveBonus: number;
  /** Indica se il bonus TS COS proviene da dati strutturati certi ("sheet"/"manual") o non era presente ("estimated") */
  conSaveSource?: SavingThrowsSource;
  sourceDescription?: string;
  createdAt: number;
};

export type CombatHpMutation =
  | { kind: "damage"; targetId: string; amount: number; sourceLabel?: string }
  | { kind: "heal"; targetId: string; amount: number }
  | { kind: "set_exact"; targetId: string; exactHp: number }
  | { kind: "set_temp_hp"; targetId: string; tempHp: number };

export type EffectiveAcResult = {
  baseAc: number;
  effectiveAc: number;
  flatDelta: number;
  coverBonus: 0 | 2 | 5;
  formulaHints: string[];
};

export type FightProjectionEffectBadge = {
  effectId: string;
  statusId: string;
  label: string;
  isConcentrationLinked?: boolean;
};

/** Stato sintetico trasmesso al secondo monitor (zero PF visibili ai giocatori). */
export type FightProjectionState = {
  campaignId: string;
  roundNumber: number;
  turnElapsedSeconds: number;
  isTurnTimerRunning: boolean;
  activeCombatant: {
    id: string;
    name: string;
    type: "pc" | "monster" | "custom";
    characterClass?: string | null;
    portraitUrl?: string | null;
    conditions: CombatConditionId[];
    activeEffects?: FightProjectionEffectBadge[];
    activeConcentrationSpell?: string | null;
    noteText?: string;
    usedReaction?: boolean;
  } | null;
  /** Coda dei prossimi 5 turni (On-Deck Queue) */
  upcomingTurns: Array<{
    id: string;
    name: string;
    type: "pc" | "monster" | "custom";
    characterClass?: string | null;
    portraitUrl?: string | null;
    conditions: CombatConditionId[];
    activeEffects?: FightProjectionEffectBadge[];
    activeConcentrationSpell?: string | null;
    order: number;
  }>;
  updatedAt: number;
};

export type PendingSaveReminder = {
  reminderId: string;
  effectId: string;
  targetId: string;
  targetName: string;
  statusId: string;
  label: string;
  ability: keyof SavingThrowsMap;
  dc: number;
  timing: "turn_start" | "turn_end";
  onPass?: "remove_effect" | "manual";
  sourceName?: string;
  saveBonus: number;
  saveSource?: SavingThrowsSource;
  roundNumber: number;
  turnIndex: number;
  createdAt: number;
};

export type TurnAdvanceUndoSnapshot = {
  previousTurnIndex: number;
  previousRoundNumber: number;
  /** Signature attesa dello stato SUBITO DOPO l'avanzamento per verifica integrità */
  expectedPostSignature: string;
  /** Snapshot ripristinabile dello stato prima dell'avanzamento */
  previousState: any;
  timestamp: number;
};

export type StructuredPcWeapon = {
  name: string;
  toHit: string | null;
  damage: string | null;
  type: string | null;
};

export type StructuredPcSpell = {
  name: string;
  level: number;
  concentration: boolean;
  ritual: boolean;
  summary?: string;
};

export type StructuredPcCombatData = {
  weapons: StructuredPcWeapon[];
  weaponsSource?: "sheet" | "fallback" | "empty";
  spellSaveDc: number | null;
  spellAttackBonus: number | null;
  spells: StructuredPcSpell[];
  hasSpells: boolean;
  source: "sheet" | "fallback" | "empty";
  disclaimer: string;
};

export type MonsterActionSuggestion = {
  id: string;
  actionName: string;
  originalSentence: string;
  statusId: string;
  label: string;
  dc?: number;
  ability?: keyof SavingThrowsMap;
  /** TS iniziale dell'attacco; non crea un TS ripetuto automatico. */
  initialSaveDc?: number;
  initialSaveAbility?: keyof SavingThrowsMap;
  timing?: "turn_end" | "turn_start";
  onPass?: "remove_effect" | "manual";
  durationTurns?: number;
  requiresConcentration?: boolean;
};

export type CombatCommandOperation =
  | {
      id: string;
      kind: "damage";
      targetId: string;
      targetName: string;
      amount: number;
      sourceLabel?: string;
    }
  | {
      id: string;
      kind: "heal";
      targetId: string;
      targetName: string;
      amount: number;
    }
  | {
      id: string;
      kind: "set_exact_hp";
      targetId: string;
      targetName: string;
      exactHp: number;
    }
  | {
      id: string;
      kind: "add_effect";
      targetId: string;
      targetName: string;
      statusId: string;
      label: string;
      sourceCasterId?: string;
      sourceName?: string;
      linkToConcentration?: boolean;
      spellName?: string;
      durationTurns?: number | null;
    }
  | {
      id: string;
      kind: "remove_effect";
      targetId: string;
      targetName: string;
      statusId?: string;
      effectId?: string;
    }
  | {
      id: string;
      kind: "start_concentration";
      casterId: string;
      casterName: string;
      spellName: string;
      targetIds?: string[];
      linkedStatusId?: string;
    }
  | {
      id: string;
      kind: "break_concentration";
      casterId: string;
      casterName: string;
    };

export type CombatCommandUnresolvedTarget = {
  query: string;
  reason: "not_found" | "ambiguous";
  candidates?: Array<{ id: string; name: string }>;
  intent?:
    | { kind: "damage"; amount: number | null; sourceLabel?: string }
    | { kind: "heal"; amount: number | null }
    | { kind: "set_exact_hp"; exactHp: number | null }
    | { kind: "add_effect"; statusId: string; label: string; linkToConcentration?: boolean; spellName?: string; durationTurns?: number | null }
    | { kind: "remove_effect"; statusId?: string; effectId?: string }
    | { kind: "start_concentration"; spellName?: string; linkedStatusId?: string }
    | { kind: "break_concentration" };
};

export type CombatCommandMissingData = {
  operationId: string;
  field: "amount" | "exactHp" | "spellName" | "casterId" | "sourceCasterId" | "durationTurns" | "statusId" | "command_syntax";
  message: string;
};

export type CombatCommandProposal = {
  proposalId: string;
  source: "local" | "ai";
  rawInput: string;
  /** Firma dello stato nel momento in cui la proposta è stata generata */
  stateSignatureAtCreation: string;
  operations: CombatCommandOperation[];
  unresolvedTargets: CombatCommandUnresolvedTarget[];
  missingData: CombatCommandMissingData[];
  explanation?: string;
};

export type CommandUndoSnapshot = {
  proposalId: string;
  expectedPostSignature: string;
  previousState: any;
  appliedAt: number;
};
