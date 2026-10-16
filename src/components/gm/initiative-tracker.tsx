"use client";

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import type { InitiativeRemoteCommandHandlers } from "@/lib/gm-remote/initiative-commands";
import type { InitiativeRemoteCombatant } from "@/lib/gm-remote/initiative-commands";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCampaignCharacters } from "@/app/campaigns/character-actions";
import { getMonstersForInitiative, getMonstersXpForIds, setWikiEntityGlobalStatus } from "@/app/campaigns/wiki-actions";
import {
  UserPlus,
  Swords,
  Edit3,
  Trash2,
  ArrowDownUp,
  SkipForward,
  SkipBack,
  Copy,
  RotateCcw,
  Skull,
  Play,
  Pause,
  Timer,
  BookOpen,
  Monitor,
  Zap,
  CheckCircle2,
  Info,
  Sparkles,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CHALLENGE_RATING_OPTIONS } from "@/lib/dnd-constants";
import type { CombatSpellSlots } from "@/lib/combat-spell-slots";
import {
  combatSpellSlotsEqual,
  normalizeCombatSpellSlots,
  resetCombatSpellSlots,
  restoreCombatSpellSlot,
  spendCombatSpellSlot,
  spellSlotsForCharacter,
} from "@/lib/combat-spell-slots";
import { ConditionsCell } from "@/components/gm/conditions-cell";
import {
  getCombatStatusDefinition,
  normalizeCombatConditions,
  type CombatConditionId,
} from "@/lib/combat-conditions";
import { SpellSlotsCell } from "@/components/gm/spell-slots-cell";
import type { Json } from "@/types/database.types";
import { formatTimerMmSs } from "@/lib/torneo/match-timer";
import { TacticalInitiativeCards } from "./screen-tactical/tactical-initiative-cards";
import { useGmScreenViewActive } from "./gm-screen-view";
import { publishFightProjection } from "@/lib/fight-mode/broadcast";
import { openProjectionWindow as openPopoutProjection } from "@/lib/browser/projection-window";
import type {
  SavingThrowsMap,
  SavingThrowsSource,
  CombatReaction,
  CombatEffectInstance,
  CombatEffectDuration,
  CombatEffectSavePrompt,
  ActiveConcentration,
  PendingConcentrationCheck,
  FightProjectionEffectBadge,
  PendingSaveReminder,
  TurnAdvanceUndoSnapshot,
  StructuredPcWeapon,
  StructuredPcSpell,
  CommandUndoSnapshot,
  CombatCommandProposal,
} from "@/lib/fight-mode/types";
import {
  estimatePcSaves,
  extractStructuredPcSaves,
  parseMonsterStatsFromMarkdown,
  DEFAULT_OPPORTUNITY_ATTACK,
  isCompleteMonsterStatblock,
} from "@/lib/fight-mode/stats-helper";
import {
  reconcileEntryEffectsAndConditions,
  normalizeActiveConcentration,
  normalizePendingConcentrationChecks,
  normalizePendingSaveReminders,
  initiativeStateSyncSignature,
  computeEffectiveArmorClass,
  startCombatantConcentration,
  breakCombatantConcentration,
  addCombatEffectInstances,
  removeCombatEffectInstance,
  toggleCombatStatusOnEntry,
  setCanonicalConditionsOnEntry,
  toggleMobileConcentrationOnEntry,
  applyCombatHpMutation,
  resolvePendingConcentrationCheck,
  resolvePendingSaveReminder,
  consumeSingleUseEffect,
  transitionNextTurn,
  undoAdvanceTurn,
  updateCombatantSavingThrowBonus,
  setCombatantDeadState,
  removeCombatantFromState,
  applyCombatCommandProposal,
  undoLastCommand,
  type AddCombatEffectPayload,
  type ApplyCombatCommandResult,
  type UndoCombatCommandResult,
} from "@/lib/fight-mode/state-transitions";
import { extractStructuredPcCombatData } from "@/lib/fight-mode/sheet-combat-extractor";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTurnTimer } from "@/lib/fight-mode/turn-timer";
import { CombatCommandBar } from "@/components/gm/screen-tactical/combat-command-bar";

function isDeadMonster(e: InitiativeEntry | undefined | null): boolean {
  if (!e) return false;
  if (e.type === "monster" || e.type === "custom") {
    return Boolean(e.isDead) || (typeof e.hp === "number" && e.hp <= 0);
  }
  return Boolean(e.isDead);
}

function toProjectionEffects(entry: InitiativeEntry): FightProjectionEffectBadge[] {
  return (entry.activeEffects ?? []).map((eff) => {
    const def = getCombatStatusDefinition(eff.statusId);
    return {
      effectId: eff.effectId,
      statusId: eff.statusId,
      label: eff.label,
      category: def?.category ?? "custom",
      ...(eff.sourceName ? { sourceName: eff.sourceName } : {}),
      isConcentration: Boolean(eff.concentrationId),
    };
  });
}

export type TorneoMegatimerControls = {
  enabled: boolean;
  remainingSec: number;
  roundLabel: string;
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
  onTogglePause: () => void | Promise<void>;
  onRestartTurn: () => void | Promise<void>;
};

export type InitiativeEntry = {
  id: string;
  name: string;
  type: "pc" | "monster" | "custom";
  characterClass?: string | null;
  armorClass: number;
  hp: number;
  maxHp: number;
  /** Punti ferita temporanei (non cumulabili, assorbono il danno prima dei PF reali). */
  tempHp?: number;
  initiative: number;
  playerId?: string;
  /** Ritratto PG (URL immagine scheda). */
  portraitUrl?: string | null;
  /** Wiki entity id quando aggiunto da lista mostri (campagne Long: per aggiornare global_status). */
  entityId?: string;
  isCore?: boolean;
  /** Grado di Sfida (es. "2", "1/2") se presente. */
  gs?: string;
  /** Punti esperienza singoli per la creatura (se valorizzati). */
  exp?: number;
  /** Stato esplicito di morte per mostri/custom. */
  isDead?: boolean;
  /** Danni inflitti in questo combattimento (contatore offensivo). */
  damageDealt?: number;
  /** Danni subiti in questo combattimento. */
  damageTaken?: number;
  /** Squadra torneo (PG). */
  teamId?: string;
  teamName?: string;
  teamColor?: string;
  /** Slot incantesimo in combattimento (caster). */
  spellSlots?: CombatSpellSlots;
  /** Derivazione automatica delle sole 15 condizioni canoniche da activeEffects. */
  conditions?: CombatConditionId[];
  /** Istanze attive di condizioni, buff, stati tattici e stati custom. */
  activeEffects?: CombatEffectInstance[];
  /** Concentrazione attiva mantenuta da questo combattente. */
  activeConcentration?: ActiveConcentration | null;
  /** FIGHT MODE: tracciamento reazione usata in questo round */
  usedReaction?: boolean;
  /** FIGHT MODE: catalogo reazioni note/disponibili (es. da statblock o Attacco di Opportunità) */
  availableReactions?: CombatReaction[];
  /** FIGHT MODE: tiri salvezza D&D 5e (FOR, DES, COS, INT, SAG, CAR) */
  savingThrows?: SavingThrowsMap;
  /** FIGHT MODE: origine dei tiri salvezza ('sheet' = dati strutturati, 'estimated' = stima classe, 'manual' = inserito da GM) */
  savingThrowsSource?: SavingThrowsSource;
  /** FIGHT MODE: tiri salvezza contro la morte per PG a 0 PF */
  deathSaves?: { success: number; fail: number };
  /** FIGHT MODE: annotazione rapida inline */
  noteText?: string;
  /** FIGHT MODE: Statblock markdown memorizzato per rendering istantaneo */
  contentBody?: string;
  /** Dati armi strutturate dalla scheda */
  weapons?: StructuredPcWeapon[];
  weaponsSource?: "sheet" | "fallback" | "empty";
  /** CD tiri salvezza incantesimi da scheda */
  spellSaveDc?: number | null;
  /** Bonus attacco incantesimi da scheda */
  spellAttackBonus?: number | null;
  /** Incantesimi conosciuti/a disposizione da scheda (escluso spellsListMd) */
  spells?: StructuredPcSpell[];
};

export type InitiativeTrackerState = {
  entries: InitiativeEntry[];
  currentTurnIndex: number;
  /** Giro di combattimento (1 = primo giro). */
  roundNumber: number;
  /** Secondi trascorsi nel turno corrente. */
  turnElapsedSeconds: number;
  isTurnTimerRunning: boolean;
  /** Coda FIFO dei check di concentrazione pendenti. */
  pendingConcentrationChecks?: PendingConcentrationCheck[];
  /** Promemoria attivi per tiri salvezza di inizio/fine turno legati a effetti */
  pendingSaveReminders?: PendingSaveReminder[];
  /** Snapshot per l'annullamento sicuro dell'ultimo avanzamento di turno */
  lastAdvanceUndoSnapshot?: TurnAdvanceUndoSnapshot | null;
  /** Elenco degli ID delle proposte di comando già applicate per prevenire doppie applicazioni */
  appliedProposalIds?: string[];
  /** Snapshot per l'annullamento dell'ultimo comando applicato */
  lastCommandUndoSnapshot?: CommandUndoSnapshot | null;
};

export function emptyInitiativeTrackerState(): InitiativeTrackerState {
  return {
    entries: [],
    currentTurnIndex: 0,
    roundNumber: 1,
    turnElapsedSeconds: 120,
    isTurnTimerRunning: false,
    pendingConcentrationChecks: [],
    pendingSaveReminders: [],
    lastAdvanceUndoSnapshot: null,
    appliedProposalIds: [],
    lastCommandUndoSnapshot: null,
  };
}

function normalizeInitiativeEntry(entry: InitiativeEntry): InitiativeEntry {
  const spellSlots = normalizeCombatSpellSlots(entry.spellSlots);
  const reconciled = reconcileEntryEffectsAndConditions(
    entry.id,
    entry.activeEffects,
    entry.conditions
  );
  const activeConcentration = normalizeActiveConcentration(entry.activeConcentration, entry.id);
  const savingThrowsSource: SavingThrowsSource =
    entry.savingThrowsSource === "sheet" ||
    entry.savingThrowsSource === "estimated" ||
    entry.savingThrowsSource === "manual"
      ? entry.savingThrowsSource
      : "estimated";

  return {
    ...entry,
    tempHp: Math.max(0, Math.trunc(entry.tempHp ?? 0)),
    conditions: reconciled.conditions,
    activeEffects: reconciled.activeEffects,
    activeConcentration,
    damageDealt: Math.max(0, Math.trunc(entry.damageDealt ?? 0)),
    damageTaken: Math.max(0, Math.trunc(entry.damageTaken ?? 0)),
    usedReaction: Boolean(entry.usedReaction),
    availableReactions: Array.isArray(entry.availableReactions)
      ? entry.availableReactions
      : [{ ...DEFAULT_OPPORTUNITY_ATTACK }],
    savingThrows: entry.savingThrows
      ? { ...entry.savingThrows }
      : entry.type === "pc"
      ? estimatePcSaves(entry.characterClass)
      : { for: 0, des: 0, cos: 0, int: 0, sag: 0, car: 0 },
    savingThrowsSource,
    deathSaves: entry.deathSaves
      ? {
          success: Math.min(3, Math.max(0, Math.trunc(entry.deathSaves.success ?? 0))),
          fail: Math.min(3, Math.max(0, Math.trunc(entry.deathSaves.fail ?? 0))),
        }
      : { success: 0, fail: 0 },
    noteText: typeof entry.noteText === "string" ? entry.noteText : "",
    contentBody: typeof entry.contentBody === "string" ? entry.contentBody : undefined,
    weapons: Array.isArray(entry.weapons) ? entry.weapons : undefined,
    weaponsSource: entry.weaponsSource === "sheet" || entry.weaponsSource === "fallback" || entry.weaponsSource === "empty" ? entry.weaponsSource : undefined,
    spellSaveDc: typeof entry.spellSaveDc === "number" ? entry.spellSaveDc : null,
    spellAttackBonus: typeof entry.spellAttackBonus === "number" ? entry.spellAttackBonus : null,
    spells: Array.isArray(entry.spells) ? entry.spells : undefined,
    ...(spellSlots ? { spellSlots } : { spellSlots: undefined }),
  };
}

export function sanitizeInitiativeTrackerState(
  input: Partial<InitiativeTrackerState> | null | undefined
): InitiativeTrackerState {
  if (!input || !Array.isArray(input.entries)) return emptyInitiativeTrackerState();
  const entries = input.entries.map(normalizeInitiativeEntry);
  const pendingConcentrationChecks = normalizePendingConcentrationChecks(
    input.pendingConcentrationChecks,
    entries
  );
  const pendingSaveReminders = normalizePendingSaveReminders(
    input.pendingSaveReminders,
    entries
  );
  return {
    entries,
    currentTurnIndex:
      entries.length > 0
        ? Math.max(0, Math.min(Math.trunc(input.currentTurnIndex ?? 0), entries.length - 1))
        : 0,
    roundNumber: Math.max(1, Math.trunc(input.roundNumber ?? 1)),
    turnElapsedSeconds:
      typeof input.turnElapsedSeconds === "number" && input.turnElapsedSeconds >= 0
        ? Math.trunc(input.turnElapsedSeconds)
        : 120,
    isTurnTimerRunning: Boolean(input.isTurnTimerRunning),
    pendingConcentrationChecks,
    pendingSaveReminders,
    lastAdvanceUndoSnapshot: input.lastAdvanceUndoSnapshot ?? null,
    appliedProposalIds: Array.isArray(input.appliedProposalIds)
      ? input.appliedProposalIds.filter((id): id is string => typeof id === "string")
      : [],
    lastCommandUndoSnapshot: input.lastCommandUndoSnapshot ?? null,
  };
}

function formatTurnElapsed(seconds: number): string {
  const s = Math.max(0, Math.trunc(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

const STORAGE_KEY_PREFIX = "gm-screen-initiative-";

export { initiativeStateSyncSignature };

export function initiativeStatesSyncEqual(
  a: InitiativeTrackerState,
  b: InitiativeTrackerState
): boolean {
  return initiativeStateSyncSignature(a) === initiativeStateSyncSignature(b);
}

function areInitiativeEntriesEqual(a: InitiativeEntry[], b: InitiativeEntry[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.name !== right.name ||
      left.type !== right.type ||
      left.characterClass !== right.characterClass ||
      left.armorClass !== right.armorClass ||
      left.hp !== right.hp ||
      left.maxHp !== right.maxHp ||
      (left.tempHp ?? 0) !== (right.tempHp ?? 0) ||
      left.initiative !== right.initiative ||
      left.playerId !== right.playerId ||
      left.entityId !== right.entityId ||
      left.isCore !== right.isCore ||
      left.gs !== right.gs ||
      left.exp !== right.exp ||
      left.isDead !== right.isDead ||
      left.usedReaction !== right.usedReaction ||
      (left.noteText ?? "") !== (right.noteText ?? "") ||
      left.deathSaves?.success !== right.deathSaves?.success ||
      left.deathSaves?.fail !== right.deathSaves?.fail ||
      (left.damageDealt ?? 0) !== (right.damageDealt ?? 0) ||
      (left.damageTaken ?? 0) !== (right.damageTaken ?? 0) ||
      left.teamId !== right.teamId ||
      left.teamName !== right.teamName ||
      left.teamColor !== right.teamColor ||
      left.savingThrowsSource !== right.savingThrowsSource ||
      JSON.stringify(left.savingThrows ?? null) !== JSON.stringify(right.savingThrows ?? null) ||
      JSON.stringify(normalizeCombatConditions(left.conditions)) !==
        JSON.stringify(normalizeCombatConditions(right.conditions)) ||
      JSON.stringify(left.activeEffects ?? []) !== JSON.stringify(right.activeEffects ?? []) ||
      JSON.stringify(left.activeConcentration ?? null) !==
        JSON.stringify(right.activeConcentration ?? null) ||
      !combatSpellSlotsEqual(left.spellSlots, right.spellSlots)
    ) {
      return false;
    }
  }
  return true;
}

function generateId(): string {
  return `init-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type MonsterForInitiative = {
  id: string;
  name: string;
  hp: number;
  armorClass?: number;
  imageUrl?: string | null;
  contentBody?: string;
  is_core?: boolean;
  global_status?: "alive" | "dead";
  xp_value?: number;
};

type InitiativeTrackerProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
  availableCharacters?: Array<{
    id: string;
    name: string;
    character_class: string | null;
    class_subclass?: string | null;
    level?: number;
    armor_class?: number | null;
    hit_points?: number | null;
    rules_snapshot?: Json | null;
    image_url?: string | null;
  }>;
  value?: InitiativeTrackerState;
  onChange?: (state: InitiativeTrackerState) => void;
  /** Notifica ogni cambio stato (es. sync telecomando). */
  onTrackerStateChange?: (state: InitiativeTrackerState) => void;
  /** Chiave localStorage alternativa (es. per incontro torneo). */
  storageKeyOverride?: string;
  /** Mappa character_id → squadra per auto-etichetta PG. */
  characterTeamMap?: Record<string, { teamId: string; teamName: string; teamColor: string }>;
  /** Mostra colonna squadra (torneo). */
  showTeamColumn?: boolean;
  /** Barra punteggio danni per incontro attivo. */
  torneoScoreboard?: {
    teamA: { id: string; name: string; color: string; total: number };
    teamB: { id: string; name: string; color: string; total: number };
  } | null;
  /** Sync controlli timer con megatimer torneo (countdown su DB). */
  torneoMegatimer?: TorneoMegatimerControls | null;
  /** Apri lo statblock mostro come pannello (GM Screen griglia). */
  onOpenMonsterStat?: (entry: { id: string; name: string; entityId?: string }) => void;
  /** FIGHT MODE: accredito automatico EXP al click di 'Chiudi Fight' (campagne long). */
  onConcludeFight?: () => boolean | void | Promise<boolean | void>;
  onBankExp?: (exp: number) => void | Promise<void>;
  /** FIGHT MODE: notifica al parent del combattente attivo per la card spotlight */
  onActiveCombatantChange?: (entry: InitiativeEntry | null, allEntries?: InitiativeEntry[]) => void;
  /** FIGHT MODE: display di default ('table' o 'tactical') */
  defaultDisplay?: "tactical" | "table";
};

export type InitiativeTrackerHandle = InitiativeRemoteCommandHandlers & {
  getState: () => InitiativeTrackerState;
  toggleReaction: (entryId: string) => void;
  closeFight: () => void;
  updateHp: (entryId: string, hp: number) => void;
  adjustHp: (entryId: string, delta: number) => void;
  setTempHp: (entryId: string, tempHp: number) => void;
  spendSlot: (entryId: string, level: number) => void;
  restoreSlot: (entryId: string, level: number) => void;
  resetSlots: (entryId: string) => void;
  toggleDeathSaveSuccess: (entryId: string) => void;
  toggleDeathSaveFail: (entryId: string) => void;
  updateNote: (entryId: string, noteText: string) => void;
  updateConditions: (entryId: string, conditions: CombatConditionId[]) => void;
  addEffect: (payload: {
    entryId: string;
    statusId: string;
    customLabel?: string;
    sourceCasterId?: string;
    sourceName?: string;
    isConcentration?: boolean;
    duration?: CombatEffectDuration | null;
    savePrompt?: CombatEffectSavePrompt | null;
  }) => void;
  removeEffect: (entryId: string, effectId: string) => void;
  consumeEffect?: (entryId: string, effectId: string) => void;
  startConcentration: (payload: {
    casterId: string;
    spellName: string;
    targetIds?: string[];
    linkedStatusId?: string;
    customEffectLabel?: string;
  }) => void;
  breakConcentration: (casterId: string) => void;
  resolveConcentrationCheck: (checkId: string, outcome: "passed" | "failed") => void;
  updateSavingThrowBonus: (entryId: string, ability: keyof SavingThrowsMap, bonus: number) => void;
  addRemoteCombatant: (combatant: InitiativeRemoteCombatant) => void;
  enrichMonster?: (entryId: string, fullStatblock: string) => void;
  applyCombatCommand?: (proposal: CombatCommandProposal, selectedOpIds?: string[]) => ApplyCombatCommandResult;
  undoLastCombatCommand?: () => UndoCombatCommandResult;
};

export const InitiativeTracker = forwardRef<InitiativeTrackerHandle, InitiativeTrackerProps>(
  function InitiativeTracker(
    {
      campaignId,
      campaignType,
      availableCharacters,
      value,
      onChange,
      onTrackerStateChange,
      storageKeyOverride,
      characterTeamMap,
      showTeamColumn = false,
      torneoScoreboard = null,
      torneoMegatimer = null,
      onOpenMonsterStat,
      onBankExp,
      onConcludeFight,
      onActiveCombatantChange,
      defaultDisplay = "tactical",
    },
    ref
  ) {
  const megatimerActive = Boolean(torneoMegatimer?.enabled);
  const storageKey = storageKeyOverride ?? `${STORAGE_KEY_PREFIX}${campaignId}`;
  const isLongCampaign = campaignType === "long";
  const isControlled = typeof onChange === "function" && value != null;

  const [entries, setEntries] = useState<InitiativeEntry[]>([]);
  const [pendingConcentrationChecks, setPendingConcentrationChecks] = useState<
    PendingConcentrationCheck[]
  >([]);
  const [pendingSaveReminders, setPendingSaveReminders] = useState<PendingSaveReminder[]>([]);
  const [lastAdvanceUndoSnapshot, setLastAdvanceUndoSnapshot] = useState<TurnAdvanceUndoSnapshot | null>(null);
  const [appliedProposalIds, setAppliedProposalIds] = useState<string[]>([]);
  const [lastCommandUndoSnapshot, setLastCommandUndoSnapshot] = useState<CommandUndoSnapshot | null>(null);
  const [editingConBonusCheckId, setEditingConBonusCheckId] = useState<string | null>(null);
  const [conBonusDraft, setConBonusDraft] = useState<string>("");
  const [trackerDisplay, setTrackerDisplay] = useState<"tactical" | "table">(defaultDisplay);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const viewActive = useGmScreenViewActive();
  const turnTimer = useTurnTimer(campaignId, viewActive);
  const turnElapsedSeconds = turnTimer.remainingSeconds;
  const isTurnTimerRunning = turnTimer.isRunning;
  const turnDurationSeconds = turnTimer.durationSeconds;

  const handleSetTurnDuration = useCallback(
    (sec: number) => {
      turnTimer.setDuration(sec);
    },
    [turnTimer]
  );
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: "name" | "hp" | "tempHp" | "initiative" | "armorClass";
  } | null>(null);
  const [addPcOpen, setAddPcOpen] = useState(false);
  const [addMonsterOpen, setAddMonsterOpen] = useState(false);
  const [pcList, setPcList] = useState<
    Array<{
      id: string;
      name: string;
      characterClass: string | null;
      classSubclass: string | null;
      level: number;
      armorClass: number | null;
      hitPoints: number | null;
      rulesSnapshot: Json | null;
      portraitUrl: string | null;
    }>
  >([]);
  const [selectedPcIds, setSelectedPcIds] = useState<Set<string>>(new Set());
  const [monsterList, setMonsterList] = useState<MonsterForInitiative[]>([]);
  const [selectedMonsterIds, setSelectedMonsterIds] = useState<Set<string>>(new Set());
  const [monsterQuantity, setMonsterQuantity] = useState(1);
  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customHp, setCustomHp] = useState<string>("");
  const [customAc, setCustomAc] = useState<string>("");
  const [customInit, setCustomInit] = useState<string>("");
  const [customGs, setCustomGs] = useState<string>("");
  const [customExp, setCustomExp] = useState<number>(0);
  const [lastResetState, setLastResetState] = useState<(InitiativeTrackerState & { at: number }) | null>(
    null
  );
  const trackerRef = useRef<InitiativeTrackerState>(emptyInitiativeTrackerState());
  const skipControlledEchoRef = useRef(false);
  const lastControlledParentSigRef = useRef<string>("");

  const buildTrackerState = useCallback(
    (overrides?: Partial<InitiativeTrackerState>): InitiativeTrackerState => ({
      entries: overrides?.entries ?? entries,
      currentTurnIndex: overrides?.currentTurnIndex ?? currentTurnIndex,
      roundNumber: overrides?.roundNumber ?? roundNumber,
      turnElapsedSeconds: overrides?.turnElapsedSeconds ?? turnElapsedSeconds,
      isTurnTimerRunning: overrides?.isTurnTimerRunning ?? isTurnTimerRunning,
      pendingConcentrationChecks:
        overrides?.pendingConcentrationChecks ?? pendingConcentrationChecks,
      pendingSaveReminders:
        overrides?.pendingSaveReminders ?? pendingSaveReminders,
      lastAdvanceUndoSnapshot:
        overrides?.lastAdvanceUndoSnapshot !== undefined
          ? overrides.lastAdvanceUndoSnapshot
          : lastAdvanceUndoSnapshot,
      appliedProposalIds:
        overrides?.appliedProposalIds ?? appliedProposalIds,
      lastCommandUndoSnapshot:
        overrides?.lastCommandUndoSnapshot !== undefined
          ? overrides.lastCommandUndoSnapshot
          : lastCommandUndoSnapshot,
    }),
    [
      appliedProposalIds,
      currentTurnIndex,
      entries,
      isTurnTimerRunning,
      lastAdvanceUndoSnapshot,
      lastCommandUndoSnapshot,
      pendingConcentrationChecks,
      pendingSaveReminders,
      roundNumber,
      turnElapsedSeconds,
    ]
  );

  const applyTransition = useCallback(
    (updater: (prev: InitiativeTrackerState) => InitiativeTrackerState): InitiativeTrackerState => {
      const next = updater(trackerRef.current);
      trackerRef.current = next;
      setEntries(next.entries);
      setCurrentTurnIndex(next.currentTurnIndex);
      setRoundNumber(next.roundNumber);
      setPendingConcentrationChecks(next.pendingConcentrationChecks ?? []);
      setPendingSaveReminders(next.pendingSaveReminders ?? []);
      setLastAdvanceUndoSnapshot(next.lastAdvanceUndoSnapshot ?? null);
      setAppliedProposalIds(next.appliedProposalIds ?? []);
      setLastCommandUndoSnapshot(next.lastCommandUndoSnapshot ?? null);
      return next;
    },
    []
  );

  useEffect(() => {
    trackerRef.current = buildTrackerState();
  }, [buildTrackerState]);

  useEffect(() => {
    if (!isControlled || !viewActive) return;
    const next = sanitizeInitiativeTrackerState(value ?? undefined);
    const prev = trackerRef.current;
    const entriesChanged = !areInitiativeEntriesEqual(prev.entries, next.entries);
    const metaChanged =
      prev.currentTurnIndex !== next.currentTurnIndex ||
      prev.roundNumber !== next.roundNumber;
    const checksChanged =
      JSON.stringify(prev.pendingConcentrationChecks ?? []) !==
      JSON.stringify(next.pendingConcentrationChecks ?? []);
    const remindersChanged =
      JSON.stringify(prev.pendingSaveReminders ?? []) !==
      JSON.stringify(next.pendingSaveReminders ?? []);
    const proposalLedgerChanged = JSON.stringify(prev.appliedProposalIds ?? []) !== JSON.stringify(next.appliedProposalIds ?? []);
    const commandUndoChanged = JSON.stringify(prev.lastCommandUndoSnapshot ?? null) !== JSON.stringify(next.lastCommandUndoSnapshot ?? null);
    if (!entriesChanged && !metaChanged && !checksChanged && !remindersChanged && !proposalLedgerChanged && !commandUndoChanged) return;
    skipControlledEchoRef.current = true;
    lastControlledParentSigRef.current = initiativeStateSyncSignature(next);
    trackerRef.current = next;
    if (entriesChanged) setEntries(next.entries);
    if (checksChanged) setPendingConcentrationChecks(next.pendingConcentrationChecks ?? []);
    if (remindersChanged) setPendingSaveReminders(next.pendingSaveReminders ?? []);
    setLastAdvanceUndoSnapshot(next.lastAdvanceUndoSnapshot ?? null);
    setAppliedProposalIds(next.appliedProposalIds ?? []);
    setLastCommandUndoSnapshot(next.lastCommandUndoSnapshot ?? null);
    if (metaChanged || entriesChanged || proposalLedgerChanged || commandUndoChanged) {
      setCurrentTurnIndex(next.currentTurnIndex);
      setRoundNumber(next.roundNumber);
    }
  }, [isControlled, value, viewActive]);

  const restoringStorageRef = useRef(false);
  const restoringProjectionRef = useRef(false);

  // Restore from localStorage on mount and when returning to a retained view
  useEffect(() => {
    if (isControlled || !viewActive) return;
    try {
      const raw = localStorage.getItem(storageKey);
      const restored = raw
        ? sanitizeInitiativeTrackerState(JSON.parse(raw) as Partial<InitiativeTrackerState>)
        : emptyInitiativeTrackerState();
      restoringStorageRef.current = true;
      restoringProjectionRef.current = true;
      trackerRef.current = restored;
      setEntries(restored.entries);
      setCurrentTurnIndex(restored.currentTurnIndex);
      setRoundNumber(restored.roundNumber);
      setPendingConcentrationChecks(restored.pendingConcentrationChecks ?? []);
      setPendingSaveReminders(restored.pendingSaveReminders ?? []);
      setLastAdvanceUndoSnapshot(restored.lastAdvanceUndoSnapshot ?? null);
      setAppliedProposalIds(restored.appliedProposalIds ?? []);
      setLastCommandUndoSnapshot(restored.lastCommandUndoSnapshot ?? null);
    } catch {
      // ignore
    }
  }, [isControlled, storageKey, viewActive]);

  // Persist tracker state
  useEffect(() => {
    if (!viewActive) return;
    if (restoringStorageRef.current) {
      restoringStorageRef.current = false;
      return;
    }
    const state = buildTrackerState();
    if (isControlled) {
      if (skipControlledEchoRef.current) {
        skipControlledEchoRef.current = false;
        return;
      }
      const sig = initiativeStateSyncSignature(state);
      const parentSig = initiativeStateSyncSignature(
        sanitizeInitiativeTrackerState(value ?? undefined)
      );
      if (sig === parentSig) {
        lastControlledParentSigRef.current = parentSig;
        return;
      }
      if (sig === lastControlledParentSigRef.current) return;
      lastControlledParentSigRef.current = sig;
      if (entries.length > 0) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
          // ignore
        }
      }
      onChange?.(state);
      return;
    }
    if (entries.length === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [
    viewActive,
    buildTrackerState,
    currentTurnIndex,
    entries,
    isControlled,
    isTurnTimerRunning,
    onChange,
    pendingConcentrationChecks,
    roundNumber,
    storageKey,
    turnElapsedSeconds,
    value,
  ]);

  useEffect(() => {
    if (isControlled) return;
    onTrackerStateChange?.(buildTrackerState());
  }, [buildTrackerState, onTrackerStateChange, isControlled]);

  const updateEntry = useCallback(
    (id: string, updates: Partial<InitiativeEntry>) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      }));
    },
    [applyTransition]
  );

  const removeEntry = useCallback(
    (id: string) => {
      applyTransition((prev) => removeCombatantFromState(prev, id));
    },
    [applyTransition]
  );

  const addRemoteCombatant = useCallback(
    (combatant: InitiativeRemoteCombatant) => {
      applyTransition((prev) => {
        if (prev.entries.some((entry) => entry.id === combatant.id)) return prev;
        const entry = normalizeInitiativeEntry({
          id: combatant.id,
          name: combatant.name,
          type: combatant.type,
          armorClass: combatant.ac,
          hp: combatant.hp,
          maxHp: combatant.maxHp,
          tempHp: 0,
          initiative: combatant.initiative,
          conditions: combatant.conditions,
          isDead: combatant.hp <= 0,
          damageDealt: 0,
          damageTaken: 0,
        });
        return {
          ...prev,
          entries: [...prev.entries, entry].sort((a, b) => b.initiative - a.initiative),
        };
      });
    },
    [applyTransition]
  );

  /** Restituisce il prossimo nome con numero progressivo (es. "Goblin" -> "Goblin 2", "Goblin 2" -> "Goblin 3"). */
  const getNextDuplicateName = useCallback(
    (currentName: string, allEntries: InitiativeEntry[]): string => {
      const match = currentName.match(/^(.+?)\s+(\d+)$/);
      const baseName = match ? match[1].trim() : currentName;
      let maxNum = 0;
      for (const e of allEntries) {
        if (e.name === baseName) maxNum = Math.max(maxNum, 1);
        const m = e.name.match(
          new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(\\d+)$`)
        );
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
      return maxNum === 0 ? `${baseName} 2` : `${baseName} ${maxNum + 1}`;
    },
    []
  );

  const duplicateEntry = useCallback(
    (entry: InitiativeEntry) => {
      const newName = getNextDuplicateName(entry.name, entries);
      const newId = generateId();
      applyTransition((prev) => {
        const cloned = normalizeInitiativeEntry({
          ...entry,
          id: newId,
          name: newName,
          damageDealt: 0,
          damageTaken: 0,
          activeEffects: undefined,
          activeConcentration: null,
          ...(entry.spellSlots
            ? { spellSlots: resetCombatSpellSlots(entry.spellSlots) }
            : {}),
        });
        return {
          ...prev,
          entries: [...prev.entries, cloned],
        };
      });
    },
    [applyTransition, entries, getNextDuplicateName]
  );

  const sortByInitiative = useCallback(() => {
    applyTransition((prev) => ({
      ...prev,
      entries: [...prev.entries].sort((a, b) => b.initiative - a.initiative),
      currentTurnIndex: 0,
      roundNumber: 1,
    }));
    turnTimer.reset(false);
  }, [applyTransition, turnTimer]);

  const [fastDmgInputs, setFastDmgInputs] = useState<Record<string, string>>({});

  // Notifica combattente attivo alla plancia tattica
  useEffect(() => {
    const active = entries[currentTurnIndex] ?? null;
    onActiveCombatantChange?.(active, entries);
  }, [entries, currentTurnIndex, onActiveCombatantChange]);

  // Only the visible tracker publishes; hidden copies must not overwrite it.
  useEffect(() => {
    if (!viewActive) return;
    if (restoringProjectionRef.current) {
      restoringProjectionRef.current = false;
      return;
    }
    if (entries.length === 0) {
      publishFightProjection({
        campaignId,
        roundNumber,
        turnElapsedSeconds,
        isTurnTimerRunning,
        activeCombatant: null,
        upcomingTurns: [],
        updatedAt: Date.now(),
      });
      return;
    }
    const active = entries[currentTurnIndex] ?? null;
    const upcoming: Array<{
      id: string;
      name: string;
      type: "pc" | "monster" | "custom";
      characterClass?: string | null;
      portraitUrl?: string | null;
      conditions: CombatConditionId[];
      activeEffects?: FightProjectionEffectBadge[];
      activeConcentrationSpell?: string | null;
      order: number;
    }> = [];

    const total = entries.length;
    let stepCount = 0;
    for (let offset = 1; offset < total && stepCount < 5; offset++) {
      const nextIdx = (currentTurnIndex + offset) % total;
      const item = entries[nextIdx];
      if (item && !isDeadMonster(item)) {
        stepCount++;
        upcoming.push({
          id: item.id,
          name: item.name,
          type: item.type,
          characterClass: item.characterClass,
          portraitUrl: item.portraitUrl,
          conditions: normalizeCombatConditions(item.conditions),
          activeEffects: toProjectionEffects(item),
          activeConcentrationSpell: item.activeConcentration?.spellName ?? null,
          order: stepCount,
        });
      }
    }

    publishFightProjection({
      campaignId,
      roundNumber,
      turnElapsedSeconds,
      isTurnTimerRunning,
      activeCombatant: active
        ? {
            id: active.id,
            name: active.name,
            type: active.type,
            characterClass: active.characterClass,
            portraitUrl: active.portraitUrl,
            conditions: normalizeCombatConditions(active.conditions),
            activeEffects: toProjectionEffects(active),
            activeConcentrationSpell: active.activeConcentration?.spellName ?? null,
            noteText: active.noteText,
            usedReaction: active.usedReaction,
          }
        : null,
      upcomingTurns: upcoming,
      updatedAt: Date.now(),
    });
  }, [viewActive, campaignId, currentTurnIndex, entries, isTurnTimerRunning, roundNumber, turnElapsedSeconds]);

  const nextTurn = useCallback(() => {
    if (entries.length === 0) return;
    applyTransition((prev) => transitionNextTurn(prev));
    if (!megatimerActive) {
      turnTimer.reset(true);
    }
  }, [applyTransition, entries.length, megatimerActive, turnTimer]);

  const handleUndoAdvance = useCallback(() => {
    applyTransition((prev) => {
      const res = undoAdvanceTurn(prev);
      if (!res.undone) {
        toast.error(res.message);
        return prev;
      }
      toast.success(res.message);
      return res.nextState;
    });
  }, [applyTransition]);

  const prevTurn = useCallback(() => {
    if (entries.length === 0) return;
    applyTransition((prev) => {
      if (prev.entries.length === 0) return prev;
      const nextEntries = prev.entries.map((e) =>
        e.usedReaction ? { ...e, usedReaction: false } : e
      );
      let prevIdx = prev.currentTurnIndex;
      let roundsToSub = 0;
      let attempts = 0;
      do {
        const wasZero = prevIdx === 0;
        prevIdx = prevIdx === 0 ? nextEntries.length - 1 : prevIdx - 1;
        if (wasZero) {
          roundsToSub++;
        }
        attempts++;
      } while (isDeadMonster(nextEntries[prevIdx]) && attempts < nextEntries.length);

      return {
        ...prev,
        entries: nextEntries,
        currentTurnIndex: prevIdx,
        roundNumber: Math.max(1, prev.roundNumber - roundsToSub),
      };
    });
    if (!megatimerActive) {
      turnTimer.reset(true);
    }
  }, [applyTransition, entries.length, megatimerActive, turnTimer]);

  const handleSelectTurn = useCallback(
    (idx: number) => {
      applyTransition((prev) => ({
        ...prev,
        currentTurnIndex: idx,
      }));
      if (!megatimerActive) {
        turnTimer.reset(true);
      }
    },
    [applyTransition, megatimerActive, turnTimer]
  );

  const toggleTurnTimer = useCallback(() => {
    if (entries.length === 0) return;
    if (megatimerActive && torneoMegatimer) {
      void torneoMegatimer.onTogglePause();
      return;
    }
    turnTimer.toggle();
  }, [entries.length, megatimerActive, torneoMegatimer, turnTimer]);

  const resetTurnTimer = useCallback(() => {
    if (megatimerActive && torneoMegatimer) {
      void torneoMegatimer.onRestartTurn();
      return;
    }
    turnTimer.reset(false);
  }, [megatimerActive, torneoMegatimer, turnTimer]);

  const resetRoundCounter = useCallback(() => {
    applyTransition((prev) => ({
      ...prev,
      roundNumber: 1,
      currentTurnIndex: 0,
    }));
    turnTimer.reset(false);
  }, [applyTransition, turnTimer]);

  const adjustDamageDealt = useCallback(
    (entryId: string, delta: number) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === entryId
            ? { ...e, damageDealt: Math.max(0, (e.damageDealt ?? 0) + delta) }
            : e
        ),
      }));
    },
    [applyTransition]
  );

  const adjustDamageTaken = useCallback(
    (entryId: string, delta: number) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === entryId
            ? { ...e, damageTaken: Math.max(0, (e.damageTaken ?? 0) + delta) }
            : e
        ),
      }));
    },
    [applyTransition]
  );

  const toggleReaction = useCallback(
    (entryId: string) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === entryId ? { ...e, usedReaction: !e.usedReaction } : e
        ),
      }));
    },
    [applyTransition]
  );

  const toggleDeathSaveSuccess = useCallback(
    (entryId: string) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => {
          if (e.id !== entryId) return e;
          const cur = e.deathSaves?.success ?? 0;
          const next = cur >= 3 ? 0 : cur + 1;
          return {
            ...e,
            deathSaves: {
              success: next,
              fail: e.deathSaves?.fail ?? 0,
            },
          };
        }),
      }));
    },
    [applyTransition]
  );

  const toggleDeathSaveFail = useCallback(
    (entryId: string) => {
      applyTransition((prev) => {
        const target = prev.entries.find((e) => e.id === entryId);
        if (!target) return prev;
        const cur = target.deathSaves?.fail ?? 0;
        const next = cur >= 3 ? 0 : cur + 1;
        const nextDead = next >= 3;
        let nextState: InitiativeTrackerState = {
          ...prev,
          entries: prev.entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  isDead: nextDead ? true : e.isDead,
                  deathSaves: {
                    success: e.deathSaves?.success ?? 0,
                    fail: next,
                  },
                }
              : e
          ),
        };
        if (nextDead) {
          nextState = breakCombatantConcentration(nextState, entryId);
        }
        return nextState;
      });
    },
    [applyTransition]
  );

  const updateNote = useCallback(
    (entryId: string, noteText: string) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => (e.id === entryId ? { ...e, noteText } : e)),
      }));
    },
    [applyTransition]
  );

  const applyHpChange = useCallback(
    async (entryId: string, nextHp: number) => {
      const nextState = applyTransition((prev) =>
        applyCombatHpMutation(prev, {
          targetId: entryId,
          kind: "set_exact",
          exactHp: nextHp,
        })
      );
      const updated = nextState.entries.find((e) => e.id === entryId);
      if (updated && isLongCampaign && updated.entityId && updated.isCore) {
        const res = await setWikiEntityGlobalStatus(
          updated.entityId,
          campaignId,
          updated.hp === 0 ? "dead" : "alive"
        );
        if (res.success) toast.success(res.message);
      }
    },
    [applyTransition, isLongCampaign, campaignId]
  );

  const adjustHp = useCallback(
    async (entryId: string, delta: number) => {
      if (delta === 0) return;
      const nextState = applyTransition((prev) =>
        applyCombatHpMutation(prev, {
          targetId: entryId,
          kind: delta < 0 ? "damage" : "heal",
          amount: Math.abs(delta),
        })
      );
      const updated = nextState.entries.find((e) => e.id === entryId);
      if (updated && isLongCampaign && updated.entityId && updated.isCore) {
        const res = await setWikiEntityGlobalStatus(
          updated.entityId,
          campaignId,
          updated.hp === 0 ? "dead" : "alive"
        );
        if (res.success) toast.success(res.message);
      }
    },
    [applyTransition, isLongCampaign, campaignId]
  );

  const setTempHp = useCallback(
    (entryId: string, tempHp: number) => {
      applyTransition((prev) =>
        applyCombatHpMutation(prev, {
          targetId: entryId,
          kind: "set_temp_hp",
          tempHp,
        })
      );
    },
    [applyTransition]
  );

  const handleFastDmgSubmit = useCallback(
    async (entry: InitiativeEntry, valStr: string) => {
      const amount = parseInt(valStr.trim(), 10);
      if (Number.isNaN(amount) || amount === 0) return;
      // amount > 0 = danno effettivo subito; amount < 0 = cura
      await adjustHp(entry.id, -amount);
      setFastDmgInputs((prev) => ({ ...prev, [entry.id]: "" }));
    },
    [adjustHp]
  );

  const spendSpellSlot = useCallback(
    (entryId: string, level: number) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => {
          if (e.id !== entryId || !e.spellSlots) return e;
          const next = spendCombatSpellSlot(e.spellSlots, level);
          return next ? { ...e, spellSlots: next } : e;
        }),
      }));
    },
    [applyTransition]
  );

  const restoreSpellSlot = useCallback(
    (entryId: string, level: number) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => {
          if (e.id !== entryId || !e.spellSlots) return e;
          const next = restoreCombatSpellSlot(e.spellSlots, level);
          return next ? { ...e, spellSlots: next } : e;
        }),
      }));
    },
    [applyTransition]
  );

  const resetEntrySpellSlots = useCallback(
    (entryId: string) => {
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === entryId && e.spellSlots
            ? { ...e, spellSlots: resetCombatSpellSlots(e.spellSlots) }
            : e
        ),
      }));
    },
    [applyTransition]
  );

  const openProjectionWindow = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = `/campaigns/${campaignId}/fight-projection`;
    const availW = window.screen.availWidth || window.screen.width || 1920;
    const availH = window.screen.availHeight || window.screen.height || 1080;
    await openPopoutProjection(url, "FightProjectionWindow", {
      fitCurrentScreen: true,
      fallbackWidth: availW,
      fallbackHeight: availH,
    });
  }, [campaignId]);

  const resetTracker = useCallback(() => {
    if (entries.length > 0) {
      setLastResetState({ ...buildTrackerState(), at: Date.now() });
    }
    const emptyState = emptyInitiativeTrackerState();
    trackerRef.current = emptyState;
    if (isControlled) onChange?.(emptyState);
    setEntries([]);
    setPendingConcentrationChecks([]);
    setCurrentTurnIndex(0);
    setRoundNumber(1);
    turnTimer.reset(false);
    turnTimer.pause();
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [buildTrackerState, storageKey, entries.length, turnTimer, isControlled, onChange]);

  const concludingFightRef = useRef(false);
  const handleCloseFight = useCallback(async () => {
    if (concludingFightRef.current) return;
    concludingFightRef.current = true;
    try {
      if (entries.length === 0) {
        toast.error("Nessun combattimento attivo da chiudere.");
        return;
      }

      // Calcola l'EXP dei mostri con isDead: true o hp <= 0
      const deadMonsters = entries.filter(
        (e) => (e.type === "monster" || e.type === "custom") && (e.isDead || e.hp <= 0)
      );
      const totalExp = deadMonsters.reduce((acc, m) => acc + (m.exp ?? 0), 0);

      if (onConcludeFight) {
        if ((await onConcludeFight()) === false) return;
      } else if (campaignType === "long" && onBankExp) {
        await onBankExp(totalExp);
        if (totalExp > 0) {
          toast.success(`Combattimento chiuso! ${totalExp} EXP bancati per la sessione.`);
        } else {
          toast.info("Combattimento chiuso! Nessun mostro sconfitto con valore EXP.");
        }
      } else if (totalExp > 0) {
        const key = `gm-screen-session-xp-${campaignId}`;
        let previous;
        try {
          previous = JSON.parse(
            localStorage.getItem(key) ??
              '{"version":2,"extraXpManual":0,"bankedMonsterXp":0,"perCharacter":{}}'
          );
          localStorage.setItem(
            key,
            JSON.stringify({
              ...previous,
              bankedMonsterXp: (previous.bankedMonsterXp ?? 0) + totalExp,
            })
          );
        } catch {
          toast.error("EXP non salvata. Il combattimento resta disponibile.");
          return;
        }
        window.dispatchEvent(new Event("gm-session-xp-changed"));
        toast.success(`Combattimento chiuso! Totale mostri sconfitti: ${totalExp} EXP.`);
      } else {
        toast.info("Combattimento chiuso!");
      }

      resetTracker();
      setLastResetState(null);
    } catch {
      toast.error("Scontro non concluso: riprova il salvataggio.");
    } finally {
      concludingFightRef.current = false;
    }
  }, [entries, campaignType, campaignId, onBankExp, onConcludeFight, resetTracker]);

  const updateConditions = useCallback(
    (entryId: string, conditions: CombatConditionId[]) => {
      applyTransition((prev) => setCanonicalConditionsOnEntry(prev, entryId, conditions));
    },
    [applyTransition]
  );

  const toggleCondition = useCallback(
    (entryId: string, condition: CombatConditionId) => {
      applyTransition((prev) => toggleCombatStatusOnEntry(prev, entryId, condition));
    },
    [applyTransition]
  );

  const toggleMobileConcentration = useCallback(
    (entryId: string) => {
      applyTransition((prev) => toggleMobileConcentrationOnEntry(prev, entryId));
    },
    [applyTransition]
  );

  const handleAddEffect = useCallback(
    (payload: AddCombatEffectPayload) => {
      applyTransition((prev) => addCombatEffectInstances(prev, payload));
    },
    [applyTransition]
  );

  const handleRemoveEffect = useCallback(
    (entryId: string, effectId: string) => {
      applyTransition((prev) => removeCombatEffectInstance(prev, entryId, effectId));
    },
    [applyTransition]
  );

  const handleConsumeEffect = useCallback(
    (entryId: string, effectId: string) => {
      applyTransition((prev) => consumeSingleUseEffect(prev, entryId, effectId));
    },
    [applyTransition]
  );

  const handleStartConcentration = useCallback(
    (payload: {
      casterId: string;
      spellName: string;
      targetIds?: string[];
      linkedStatusId?: string;
      customEffectLabel?: string;
    }) => {
      applyTransition((prev) => startCombatantConcentration(prev, payload));
    },
    [applyTransition]
  );

  const handleBreakConcentration = useCallback(
    (casterId: string) => {
      applyTransition((prev) => breakCombatantConcentration(prev, casterId));
    },
    [applyTransition]
  );

  const handleResolveConcentrationCheck = useCallback(
    (checkId: string, outcome: "passed" | "failed") => {
      applyTransition((prev) => resolvePendingConcentrationCheck(prev, checkId, outcome));
    },
    [applyTransition]
  );

  const handleUpdateSavingThrowBonus = useCallback(
    (entryId: string, ability: keyof SavingThrowsMap, bonus: number) => {
      applyTransition((prev) => updateCombatantSavingThrowBonus(prev, entryId, ability, bonus));
    },
    [applyTransition]
  );

  const enrichMonster = useCallback(
    (entryId: string, fullStatblock: string) => {
      if (!fullStatblock?.trim()) return;
      const parsedStats = parseMonsterStatsFromMarkdown(fullStatblock);
      applyTransition((prev) => ({
        ...prev,
        entries: prev.entries.map((e) => {
          const cleanCurrent = e.name.replace(/\s+\d+$/, "").trim().toLowerCase();
          const targetEntry = prev.entries.find((x) => x.id === entryId);
          const targetClean = targetEntry?.name.replace(/\s+\d+$/, "").trim().toLowerCase();
          const isTarget =
            e.id === entryId ||
            (targetClean &&
              cleanCurrent === targetClean &&
              (!e.contentBody || !isCompleteMonsterStatblock(e.contentBody)));
          if (!isTarget) return e;

          const hasParsedSaves =
            parsedStats?.savingThrows &&
            Object.values(parsedStats.savingThrows).some((v) => v !== 0);
          const newSaves =
            e.savingThrowsSource === "manual"
              ? e.savingThrows
              : hasParsedSaves
              ? parsedStats!.savingThrows
              : e.savingThrows;
          const newSavesSource: SavingThrowsSource =
            e.savingThrowsSource === "manual"
              ? "manual"
              : hasParsedSaves
              ? "sheet"
              : e.savingThrowsSource ?? "estimated";
          const newReactions =
            parsedStats?.reactions && parsedStats.reactions.length > 0
              ? parsedStats.reactions
              : e.availableReactions;

          return {
            ...e,
            contentBody: fullStatblock,
            savingThrows: newSaves,
            savingThrowsSource: newSavesSource,
            availableReactions: newReactions,
          };
        }),
      }));
    },
    [applyTransition]
  );

  const handleApplyCombatCommand = useCallback(
    (proposal: CombatCommandProposal, selectedOpIds?: string[]): ApplyCombatCommandResult => {
      let result: ApplyCombatCommandResult = {
        nextState: trackerRef.current,
        success: false,
        message: "",
      };
      applyTransition((prev) => {
        const res = applyCombatCommandProposal(prev, proposal, selectedOpIds);
        result = res;
        if (!res.success) {
          toast.error(res.message);
          return prev;
        }
        toast.success(res.message);
        return res.nextState;
      });
      return result;
    },
    [applyTransition]
  );

  const handleUndoLastCombatCommand = useCallback((): UndoCombatCommandResult => {
    let result: UndoCombatCommandResult = {
      nextState: trackerRef.current,
      undone: false,
      message: "",
    };
    applyTransition((prev) => {
      const res = undoLastCommand(prev);
      result = res;
      if (!res.undone) {
        toast.error(res.message);
        return prev;
      }
      toast.success(res.message);
      return res.nextState;
    });
    return result;
  }, [applyTransition]);

  useImperativeHandle(
    ref,
    () => ({
      nextTurn,
      prevTurn,
      toggleTurnTimer,
      resetTurnTimer,
      resetRound: resetRoundCounter,
      adjustDamage: adjustDamageDealt,
      adjustDamageTaken,
      adjustHp: (id: string, delta: number) => void adjustHp(id, delta),
      setHp: (id: string, hp: number) => void applyHpChange(id, hp),
      setTempHp,
      setConditions: updateConditions,
      toggleCondition,
      toggleMobileConcentration,
      addEffect: (p) =>
        handleAddEffect({
          targetIds: [p.entryId],
          statusId: p.statusId,
          customLabel: p.customLabel,
          sourceCasterId: p.sourceCasterId,
          sourceName: p.sourceName,
          linkToConcentration: p.isConcentration,
          duration: p.duration,
          savePrompt: p.savePrompt,
        }),
      removeEffect: handleRemoveEffect,
      consumeEffect: handleConsumeEffect,
      startConcentration: handleStartConcentration,
      breakConcentration: handleBreakConcentration,
      resolveConcentrationCheck: handleResolveConcentrationCheck,
      updateSavingThrowBonus: handleUpdateSavingThrowBonus,
      addCombatant: addRemoteCombatant,
      removeCombatant: removeEntry,
      getState: () => buildTrackerState(),
      toggleReaction,
      closeFight: handleCloseFight,
      updateHp: (id: string, hp: number) => void applyHpChange(id, hp),
      spendSlot: spendSpellSlot,
      restoreSlot: restoreSpellSlot,
      resetSlots: resetEntrySpellSlots,
      toggleDeathSaveSuccess,
      toggleDeathSaveFail,
      updateNote,
      updateConditions,
      addRemoteCombatant,
      removeEntry,
      enrichMonster,
      applyCombatCommand: handleApplyCombatCommand,
      undoLastCombatCommand: handleUndoLastCombatCommand,
    }),
    [
      addRemoteCombatant,
      removeEntry,
      toggleCondition,
      toggleMobileConcentration,
      handleAddEffect,
      handleRemoveEffect,
      handleConsumeEffect,
      handleStartConcentration,
      handleBreakConcentration,
      handleResolveConcentrationCheck,
      handleUpdateSavingThrowBonus,
      handleApplyCombatCommand,
      handleUndoLastCombatCommand,
      adjustDamageDealt,
      adjustDamageTaken,
      adjustHp,
      applyHpChange,
      setTempHp,
      buildTrackerState,
      enrichMonster,
      handleCloseFight,
      nextTurn,
      prevTurn,
      resetEntrySpellSlots,
      resetRoundCounter,
      resetTurnTimer,
      restoreSpellSlot,
      spendSpellSlot,
      toggleDeathSaveFail,
      toggleDeathSaveSuccess,
      toggleReaction,
      toggleTurnTimer,
      updateConditions,
      updateNote,
    ]
  );

  const undoReset = useCallback(() => {
    if (!lastResetState) return;
    const { at: _at, ...restored } = lastResetState;
    const sanitized = sanitizeInitiativeTrackerState(restored);
    trackerRef.current = sanitized;
    setEntries(sanitized.entries);
    setPendingConcentrationChecks(sanitized.pendingConcentrationChecks ?? []);
    setCurrentTurnIndex(sanitized.currentTurnIndex);
    setRoundNumber(sanitized.roundNumber);
    if (sanitized.isTurnTimerRunning) {
      turnTimer.start();
    } else {
      turnTimer.pause();
    }
    setLastResetState(null);
    try {
      localStorage.setItem(storageKey, JSON.stringify(sanitized));
    } catch {
      // ignore
    }
    toast.success("Reset annullato.");
  }, [lastResetState, storageKey, turnTimer]);

  const openAddPc = useCallback(async () => {
    setAddPcOpen(true);
    setSelectedPcIds(new Set());
    if (availableCharacters) {
      setPcList(
        availableCharacters.map((character) => ({
          id: character.id,
          name: character.name,
          characterClass: character.character_class ?? null,
          classSubclass: character.class_subclass ?? null,
          level: character.level ?? 1,
          armorClass: character.armor_class ?? null,
          hitPoints: character.hit_points ?? null,
          rulesSnapshot: character.rules_snapshot ?? null,
          portraitUrl: character.image_url ?? null,
        }))
      );
      return;
    }
    const res = await getCampaignCharacters(campaignId);
    if (res.success && res.data) {
      setPcList(
        res.data.map((c) => ({
          id: c.id,
          name: c.name,
          characterClass: c.character_class ?? null,
          classSubclass: c.class_subclass ?? null,
          level: c.level ?? 1,
          armorClass: c.armor_class ?? null,
          hitPoints: c.hit_points ?? null,
          rulesSnapshot: c.rules_snapshot ?? null,
          portraitUrl: c.image_url ?? null,
        }))
      );
    } else {
      setPcList([]);
    }
  }, [availableCharacters, campaignId]);

  const addPcEntry = useCallback(
    (
      characterId: string,
      name: string,
      characterClass: string | null,
      armorClass: number | null,
      hitPoints: number | null,
      spellSlotInput?: {
        rules_snapshot?: Json | null;
        class_subclass?: string | null;
        level?: number;
        portrait_url?: string | null;
      }
    ) => {
      const hp = Math.max(0, hitPoints ?? 0);
      const team = characterTeamMap?.[characterId];
      const spellSlots = spellSlotsForCharacter({
        rules_snapshot: spellSlotInput?.rules_snapshot ?? null,
        character_class: characterClass,
        class_subclass: spellSlotInput?.class_subclass ?? null,
        level: spellSlotInput?.level ?? 1,
      });
      const extractedSaves = extractStructuredPcSaves(
        spellSlotInput?.rules_snapshot ?? null,
        characterClass,
        spellSlotInput?.level ?? 1
      );
      const pcCombatData = extractStructuredPcCombatData(
        spellSlotInput?.rules_snapshot ?? null,
        characterClass,
        spellSlotInput?.level ?? 1
      );
      applyTransition((prev) => ({
        ...prev,
        entries: [
          ...prev.entries,
          normalizeInitiativeEntry({
            id: generateId(),
            name,
            type: "pc",
            characterClass: characterClass ?? null,
            armorClass: Math.max(0, armorClass ?? 0),
            hp,
            maxHp: hp,
            tempHp: 0,
            initiative: 0,
            playerId: characterId,
            portraitUrl: spellSlotInput?.portrait_url ?? null,
            damageDealt: 0,
            damageTaken: 0,
            usedReaction: false,
            availableReactions: [{ ...DEFAULT_OPPORTUNITY_ATTACK }],
            savingThrows: extractedSaves.savingThrows,
            savingThrowsSource: extractedSaves.source,
            weapons: pcCombatData.weapons,
            weaponsSource: pcCombatData.source,
            spellSaveDc: pcCombatData.spellSaveDc,
            spellAttackBonus: pcCombatData.spellAttackBonus,
            spells: pcCombatData.spells,
            deathSaves: { success: 0, fail: 0 },
            noteText: "",
            ...(spellSlots ? { spellSlots } : {}),
            ...(team
              ? { teamId: team.teamId, teamName: team.teamName, teamColor: team.teamColor }
              : {}),
          }),
        ],
      }));
    },
    [applyTransition, characterTeamMap]
  );

  const addSelectedPcs = useCallback(() => {
    const ids = Array.from(selectedPcIds);
    if (ids.length === 0) {
      toast.error("Seleziona almeno un personaggio.");
      return;
    }
    const map = new Map(pcList.map((p) => [p.id, p]));
    for (const id of ids) {
      const player = map.get(id);
      if (player) {
        addPcEntry(id, player.name, player.characterClass, player.armorClass, player.hitPoints, {
          rules_snapshot: player.rulesSnapshot,
          class_subclass: player.classSubclass,
          level: player.level,
          portrait_url: player.portraitUrl,
        });
      }
    }
    setAddPcOpen(false);
  }, [selectedPcIds, pcList, addPcEntry]);

  const openAddMonster = useCallback(async () => {
    setAddMonsterOpen(true);
    setMonsterQuantity(1);
    setSelectedMonsterIds(new Set());
    const res = await getMonstersForInitiative(campaignId);
    if (res.success && res.data) {
      const baseList = res.data;
      // Arricchisci con XP dalla Wiki se disponibili
      const ids = baseList.map((m) => m.id);
      const xpRes = await getMonstersXpForIds(campaignId, ids);
      if (xpRes.success && xpRes.data) {
        const xpMap = new Map(xpRes.data.map((r) => [r.id, r.xp_value]));
        setMonsterList(
          baseList.map((m) => ({
            ...m,
            xp_value: xpMap.get(m.id) ?? 0,
          }))
        );
      } else {
        setMonsterList(baseList);
      }
    } else {
      setMonsterList([]);
    }
  }, [campaignId]);

  const addMonsterEntry = useCallback(
    (monster: MonsterForInitiative, count: number) => {
      const parsedStats = monster.contentBody
        ? parseMonsterStatsFromMarkdown(monster.contentBody)
        : null;
      const hasParsedSaves =
        parsedStats?.savingThrows &&
        Object.values(parsedStats.savingThrows).some((v) => v !== 0);
      const monsterSaves: SavingThrowsMap = parsedStats?.savingThrows ?? {
        for: 0,
        des: 0,
        cos: 0,
        int: 0,
        sag: 0,
        car: 0,
      };
      const monsterReactions: CombatReaction[] =
        parsedStats?.reactions && parsedStats.reactions.length > 0
          ? parsedStats.reactions
          : [{ ...DEFAULT_OPPORTUNITY_ATTACK }];

      const newEntries: InitiativeEntry[] = [];
      for (let i = 0; i < count; i++) {
        newEntries.push(
          normalizeInitiativeEntry({
            id: generateId(),
            name: count > 1 ? `${monster.name} ${i + 1}` : monster.name,
            type: "monster",
            armorClass: monster.armorClass ?? 0,
            hp: monster.hp,
            maxHp: monster.hp,
            tempHp: 0,
            initiative: 0,
            isDead: false,
            portraitUrl: monster.imageUrl ?? null,
            damageDealt: 0,
            damageTaken: 0,
            usedReaction: false,
            availableReactions: monsterReactions,
            savingThrows: monsterSaves,
            savingThrowsSource: hasParsedSaves ? "sheet" : "estimated",
            deathSaves: { success: 0, fail: 0 },
            noteText: "",
            entityId: monster.id,
            contentBody: monster.contentBody ?? undefined,
            ...(typeof monster.xp_value === "number" && monster.xp_value > 0
              ? { exp: monster.xp_value }
              : {}),
            ...(isLongCampaign && monster.is_core && { isCore: true }),
          })
        );
      }
      applyTransition((prev) => ({
        ...prev,
        entries: [...prev.entries, ...newEntries],
      }));
    },
    [applyTransition, isLongCampaign]
  );

  const addSelectedMonsters = useCallback(() => {
    const ids = Array.from(selectedMonsterIds);
    if (ids.length === 0) {
      toast.error("Seleziona almeno un mostro.");
      return;
    }
    const list = monsterList.filter((m) => ids.includes(m.id));
    for (const m of list) {
      const isDead = isLongCampaign && m.global_status === "dead";
      if (isDead && m.is_core) {
        toast.warning(`"${m.name}" è già segnato come morto nella campagna (Core).`);
      }
      addMonsterEntry(m, monsterQuantity);
    }
    setAddMonsterOpen(false);
  }, [selectedMonsterIds, monsterList, addMonsterEntry, monsterQuantity, isLongCampaign]);

  const toggleDead = useCallback(
    async (entryId: string) => {
      const entry = entries.find((item) => item.id === entryId);
      if (!entry || (entry.type !== "monster" && entry.type !== "custom")) return;

      const nextDead = !entry.isDead;
      applyTransition((prev) => setCombatantDeadState(prev, entryId, nextDead));

      if (isLongCampaign && entry.entityId && entry.isCore) {
        const res = await setWikiEntityGlobalStatus(
          entry.entityId,
          campaignId,
          nextDead ? "dead" : "alive"
        );
        if (res.success) toast.success(res.message);
      }
    },
    [applyTransition, campaignId, entries, isLongCampaign]
  );

  const openAddCustom = useCallback(() => {
    setCustomName("");
    setCustomHp("");
    setCustomAc("");
    setCustomInit("");
    setCustomGs("");
    setCustomExp(0);
    setAddCustomOpen(true);
  }, []);

  const handleCreateCustom = useCallback(() => {
    const name = customName.trim() || "Nemico Sconosciuto";
    const hpNum = parseInt(customHp, 10);
    const acNum = parseInt(customAc, 10);
    const initNum = parseInt(customInit, 10);
    const hp = Number.isNaN(hpNum) ? 0 : hpNum;
    const armorClass = Number.isNaN(acNum) ? 0 : acNum;
    const initiative = Number.isNaN(initNum) ? 0 : initNum;
    applyTransition((prev) => ({
      ...prev,
      entries: [
        ...prev.entries,
        normalizeInitiativeEntry({
          id: generateId(),
          name,
          type: "custom",
          armorClass,
          hp,
          maxHp: hp,
          tempHp: 0,
          initiative,
          isDead: false,
          damageDealt: 0,
          damageTaken: 0,
          usedReaction: false,
          availableReactions: [{ ...DEFAULT_OPPORTUNITY_ATTACK }],
          savingThrows: { for: 0, des: 0, cos: 0, int: 0, sag: 0, car: 0 },
          savingThrowsSource: "estimated",
          deathSaves: { success: 0, fail: 0 },
          noteText: "",
          ...(customGs && { gs: customGs }),
          ...(customExp > 0 && { exp: customExp }),
        }),
      ],
    }));
    setAddCustomOpen(false);
  }, [applyTransition, customName, customHp, customAc, customInit, customGs, customExp]);

  const handleCellSave = useCallback(
    async (
      id: string,
      field: "name" | "hp" | "tempHp" | "initiative" | "armorClass",
      value: string
    ) => {
      if (field === "name") {
        updateEntry(id, { name: value.trim() || "Senza nome" });
      } else {
        const num = parseInt(value, 10);
        const v = Number.isNaN(num) ? 0 : num;
        if (field === "hp") {
          await applyHpChange(id, v);
        } else if (field === "tempHp") {
          setTempHp(id, Math.max(0, v));
        } else if (field === "armorClass") {
          updateEntry(id, { armorClass: Math.max(0, v) });
        } else {
          updateEntry(id, { initiative: v });
        }
      }
      setEditingCell(null);
    },
    [updateEntry, applyHpChange, setTempHp]
  );

  const hpColor = (entry: InitiativeEntry) => {
    if (entry.isDead) return "text-red-300 line-through";
    if (entry.maxHp <= 0) return "text-zinc-400";
    const pct = entry.hp / entry.maxHp;
    if (pct > 0.5) return "text-emerald-400";
    if (pct > 0.25) return "text-amber-400";
    return "text-red-400";
  };

  const showSpellSlotsColumn = entries.some((e) => (e.spellSlots?.max.length ?? 0) > 0);
  const tableColSpan =
    11 + (showTeamColumn ? 1 : 0) + (showSpellSlotsColumn ? 1 : 0);

  return (
    <div className="flex h-full w-full flex-col p-3 text-zinc-100">
      <header className="mb-2 space-y-2 border-b border-amber-600/30 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-sm font-bold tracking-tight text-amber-400">
          Initiative Tracker
        </h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-amber-600/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
            onClick={sortByInitiative}
            disabled={entries.length === 0}
            title="Ordina combattenti per iniziativa (dal punteggio più alto al più basso)"
          >
            <ArrowDownUp className="mr-1 h-3 w-3" />
            Ordina
          </Button>
          {entries.length > 0 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-amber-600/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
                onClick={prevTurn}
                title="Turno precedente"
              >
                <SkipBack className="mr-1 h-3 w-3" />
                Indietro
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-amber-600/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
                onClick={nextTurn}
                title="Passa al turno successivo"
              >
                <SkipForward className="mr-1 h-3 w-3" />
                Turno Succ.
              </Button>
              {lastAdvanceUndoSnapshot ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 border-sky-500/60 bg-sky-950/40 px-2 text-xs text-sky-200 hover:bg-sky-600/30 font-semibold"
                  onClick={handleUndoAdvance}
                  title="Annulla l'ultimo avanzamento di turno (se non sono intervenute modifiche successive)"
                >
                  <RotateCcw className="mr-1 h-3 w-3 text-sky-400" />
                  Annulla avanzamento
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-red-500/40 px-2 text-xs text-red-300 hover:bg-red-500/20"
                onClick={resetTracker}
                title="Cancella tutte le righe e inizia un nuovo incontro"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            </>
          ) : lastResetState ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-amber-500/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
              onClick={undoReset}
              title="Ripristina l'ultimo stato prima del reset"
            >
              Annulla Reset
            </Button>
          ) : null}
          <span className="mx-0.5 h-4 w-px bg-amber-600/30" aria-hidden />
          <Button
            size="sm"
            className="h-7 bg-amber-700 px-2 text-xs text-white hover:bg-amber-600"
            onClick={openAddPc}
          >
            <UserPlus className="mr-1 h-3 w-3" />
            PG
          </Button>
          <Button
            size="sm"
            className="h-7 bg-amber-700 px-2 text-xs text-white hover:bg-amber-600"
            onClick={openAddMonster}
          >
            <Swords className="mr-1 h-3 w-3" />
            Mostro
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-amber-600/40 px-2 text-xs text-amber-200 hover:bg-amber-600/20"
            onClick={openAddCustom}
          >
            <Edit3 className="mr-1 h-3 w-3" />
            Manuale
          </Button>
          <span className="mx-0.5 h-4 w-px bg-amber-600/30" aria-hidden />
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-emerald-500/40 px-2 text-xs text-emerald-300 hover:bg-emerald-500/20"
            onClick={() => void handleCloseFight()}
            disabled={entries.length === 0}
            title="Trasferisci i PE dei mostri alla bozza sessione"
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Concludi scontro
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 border-cyan-500/40 px-2 text-xs text-cyan-300 hover:bg-cyan-500/20"
            onClick={openProjectionWindow}
            title="Apri finestra di proiezione per il secondo monitor (giocatori)"
          >
            <Monitor className="mr-1 h-3 w-3" />
            Proietta
          </Button>

          <div className="ml-auto flex items-center rounded border border-brass-base/30 bg-[#160f0b] p-0.5">
            <button
              type="button"
              onClick={() => setTrackerDisplay("tactical")}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-cinzel font-bold transition-colors",
                trackerDisplay === "tactical"
                  ? "bg-guild-gold text-guild-black shadow-sm"
                  : "text-parchment-400 hover:text-parchment-200"
              )}
            >
              Tattica
            </button>
            <button
              type="button"
              onClick={() => setTrackerDisplay("table")}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-cinzel font-bold transition-colors",
                trackerDisplay === "table"
                  ? "bg-guild-gold text-guild-black shadow-sm"
                  : "text-parchment-400 hover:text-parchment-200"
              )}
            >
              Tabella
            </button>
          </div>
        </div>
        </div>

        {entries.length > 0 || torneoScoreboard ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-600/25 bg-zinc-900/60 px-2.5 py-1.5">
            {entries.length > 0 ? (
              <>
                <span className="text-xs font-semibold text-amber-300/90">
                  Giro <span className="tabular-nums text-amber-100">{roundNumber}</span>
                </span>
                <span className="h-4 w-px bg-amber-600/30" aria-hidden />
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
                  <Timer className="h-3.5 w-3.5 text-amber-400/80" />
                  <span
                    className={cn(
                      "font-mono tabular-nums text-sm font-bold",
                      megatimerActive && torneoMegatimer?.isExpired
                        ? "text-red-400"
                        : !megatimerActive && turnElapsedSeconds === 0
                        ? "text-red-400 font-black animate-pulse"
                        : !megatimerActive && turnElapsedSeconds <= 30
                        ? "text-amber-400"
                        : "text-amber-100"
                    )}
                  >
                    {megatimerActive && torneoMegatimer
                      ? formatTimerMmSs(torneoMegatimer.remainingSec)
                      : formatTurnElapsed(turnElapsedSeconds)}
                  </span>
                  {!megatimerActive && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-[10px] font-mono text-zinc-400 hover:text-amber-300 rounded border border-amber-700/30 bg-[#160f0a] px-1.5 py-0.5 ml-0.5 flex items-center gap-1"
                          title="Imposta durata countdown turno (default 2 min)"
                        >
                          <span>{Math.floor(turnDurationSeconds / 60)}:{String(turnDurationSeconds % 60).padStart(2, "0")}</span>
                          <span className="text-[8px] opacity-70">▾</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 border-brass-base/40 bg-[#160f0a] p-3 text-parchment-100 shadow-2xl text-xs space-y-2">
                        <div className="font-cinzel font-bold text-amber-300 border-b border-brass-base/20 pb-1">
                          Durata Countdown Turno
                        </div>
                        <p className="text-[10px] text-zinc-400 font-sans">
                          Il timer riparte da questo valore ad ogni cambio di turno.
                        </p>
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {[
                            { label: "30s", val: 30 },
                            { label: "1 min", val: 60 },
                            { label: "1m 30s", val: 90 },
                            { label: "2 min", val: 120 },
                            { label: "3 min", val: 180 },
                            { label: "5 min", val: 300 },
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => handleSetTurnDuration(item.val)}
                              className={cn(
                                "rounded px-2 py-1 text-[11px] font-mono font-bold transition-all border",
                                turnDurationSeconds === item.val
                                  ? "border-amber-500 bg-amber-950/80 text-amber-200 ring-1 ring-amber-500/50"
                                  : "border-brass-base/20 bg-[#1c130b] text-zinc-300 hover:border-amber-600/60"
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  {megatimerActive && torneoMegatimer?.roundLabel ? (
                    <span className="hidden text-[10px] text-zinc-500 sm:inline">
                      · {torneoMegatimer.roundLabel}
                    </span>
                  ) : null}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 border-amber-600/40 text-amber-200 hover:bg-amber-600/20"
                  onClick={toggleTurnTimer}
                  title={
                    megatimerActive && torneoMegatimer
                      ? torneoMegatimer.isRunning
                        ? "Pausa megatimer"
                        : torneoMegatimer.isPaused
                          ? "Riprendi megatimer"
                          : "Avvia megatimer turno"
                      : isTurnTimerRunning
                        ? "Pausa timer turno"
                        : "Avvia timer turno"
                  }
                  aria-label={
                    megatimerActive && torneoMegatimer?.isRunning
                      ? "Pausa megatimer"
                      : "Avvia megatimer"
                  }
                >
                  {megatimerActive && torneoMegatimer
                    ? torneoMegatimer.isRunning
                      ? <Pause className="h-3.5 w-3.5" />
                      : <Play className="h-3.5 w-3.5" />
                    : isTurnTimerRunning
                      ? <Pause className="h-3.5 w-3.5" />
                      : <Play className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-amber-600/40 px-2 text-[10px] text-amber-200 hover:bg-amber-600/20"
                  onClick={resetTurnTimer}
                  title={megatimerActive ? "Riavvia countdown turno corrente" : "Azzera il timer del turno corrente"}
                >
                  {megatimerActive ? "Riavvia turno" : "Azzera timer"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-amber-200"
                  onClick={resetRoundCounter}
                  title="Riporta a giro 1 e primo in lista"
                >
                  Reset giro
                </Button>
              </>
            ) : null}
            {torneoScoreboard ? (
              <>
                {entries.length > 0 ? (
                  <span className="h-4 w-px bg-amber-600/30" aria-hidden />
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="flex items-center gap-1.5 rounded px-1.5 py-0.5"
                    style={{ borderLeft: `2px solid ${torneoScoreboard.teamA.color}` }}
                    title="Danni inflitti (squadra)"
                  >
                    <span className="max-w-[5.5rem] truncate text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      {torneoScoreboard.teamA.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-orange-300">
                      {torneoScoreboard.teamA.total}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-600">vs</span>
                  <div
                    className="flex items-center gap-1.5 rounded px-1.5 py-0.5"
                    style={{ borderLeft: `2px solid ${torneoScoreboard.teamB.color}` }}
                    title="Danni inflitti (squadra)"
                  >
                    <span className="max-w-[5.5rem] truncate text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      {torneoScoreboard.teamB.name}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-orange-300">
                      {torneoScoreboard.teamB.total}
                    </span>
                  </div>
                </div>
              </>
            ) : null}
            {entries.length > 0 && entries[currentTurnIndex] ? (
              <span className="ml-auto truncate text-[10px] text-zinc-500">
                In turno:{" "}
                <span className="font-medium text-amber-200/90">{entries[currentTurnIndex].name}</span>
              </span>
            ) : null}
          </div>
        ) : null}

        {/* BARRA COMANDI TATTICI: VOCE PUSH-TO-TALK, TEXT INPUT, ANALISI DETERMINISTICA / IA ASSISTITA */}
        <CombatCommandBar
          state={buildTrackerState()}
          onApplyProposal={handleApplyCombatCommand}
          onUndoLastCommand={handleUndoLastCombatCommand}
          campaignId={campaignId}
          className="my-1"
        />

        {/* CODA FIFO CHECK CONCENTRAZIONE PENDENTI */}
        {pendingConcentrationChecks.length > 0 ? (
          <div
            data-testid="concentration-checks-banner"
            className="space-y-1.5 rounded-lg border border-fuchsia-500/60 bg-fuchsia-950/35 p-2.5 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-fuchsia-200">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-fuchsia-300 animate-pulse" />
                Tiri Salvezza su Concentrazione Pendenti ({pendingConcentrationChecks.length})
              </span>
              <span className="text-[10px] font-normal normal-case text-fuchsia-300/80">
                CD = max(10, ⌊danno / 2⌋)
              </span>
            </div>
            <div className="space-y-1.5">
              {pendingConcentrationChecks.map((check) => {
                const isEstimated =
                  !check.conSaveSource || check.conSaveSource === "estimated";
                const formattedCon =
                  check.conSaveBonus >= 0
                    ? `+${check.conSaveBonus}`
                    : `${check.conSaveBonus}`;
                const minD20 = Math.max(1, check.dc - check.conSaveBonus);
                const isEditingBonus = editingConBonusCheckId === check.checkId;

                return (
                  <div
                    key={check.checkId}
                    data-testid={`concentration-check-item-${check.checkId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-fuchsia-500/40 bg-zinc-950/85 px-2.5 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-fuchsia-100">{check.casterName}</span>
                        <span className="text-zinc-400">concentrato su</span>
                        <span className="rounded bg-fuchsia-900/60 border border-fuchsia-500/40 px-1.5 py-0.5 font-semibold text-fuchsia-200">
                          🔮 {check.spellName}
                        </span>
                        <span className="rounded bg-red-950/70 border border-red-700/40 px-1.5 py-0.5 font-mono text-[11px] text-red-200">
                          Danno: {check.damageTaken} PF →{" "}
                          <strong className="text-amber-300">CD {check.dc}</strong>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-mono text-zinc-300">
                          TS COS:{" "}
                          <strong className="text-amber-300">{formattedCon}</strong>{" "}
                          <span className="text-zinc-400">(dado ≥ {minD20})</span>
                        </span>

                        {isEstimated ? (
                          <span
                            className="inline-flex items-center gap-1 rounded border border-amber-500/50 bg-amber-950/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-200"
                            title="Il bonus TS COS non era presente nei dati strutturati della scheda: verifica o inserisci il valore reale del personaggio."
                          >
                            <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                            TS COS non strutturato (stima: {formattedCon})
                          </span>
                        ) : (
                          <span className="rounded border border-emerald-600/40 bg-emerald-950/50 px-1.5 py-0.5 text-[10px] text-emerald-300">
                            {check.conSaveSource === "manual" ? "COS manuale" : "COS da scheda"}
                          </span>
                        )}

                        {isEditingBonus ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const parsed = parseInt(conBonusDraft, 10);
                              if (!Number.isNaN(parsed)) {
                                handleUpdateSavingThrowBonus(check.casterId, "cos", parsed);
                              }
                              setEditingConBonusCheckId(null);
                            }}
                            className="inline-flex items-center gap-1"
                          >
                            <Input
                              type="number"
                              value={conBonusDraft}
                              onChange={(e) => setConBonusDraft(e.target.value)}
                              className="h-6 w-14 bg-zinc-900 border-amber-500/60 px-1 text-center font-mono text-[11px] text-amber-100"
                              autoFocus
                            />
                            <Button
                              type="submit"
                              size="sm"
                              className="h-6 bg-amber-600 px-2 text-[10px] font-bold text-zinc-950 hover:bg-amber-500"
                            >
                              Salva COS
                            </Button>
                            <button
                              type="button"
                              onClick={() => setEditingConBonusCheckId(null)}
                              className="text-[10px] text-zinc-400 hover:text-zinc-200 px-1"
                            >
                              Annulla
                            </button>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setConBonusDraft(String(check.conSaveBonus));
                              setEditingConBonusCheckId(check.checkId);
                            }}
                            className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-amber-300 hover:border-amber-500/50 hover:bg-zinc-800"
                          >
                            ✎ Imposta bonus COS
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        data-testid={`concentration-check-pass-${check.checkId}`}
                        onClick={() => handleResolveConcentrationCheck(check.checkId, "passed")}
                        className="h-7 bg-emerald-700 px-2.5 text-xs font-bold text-white hover:bg-emerald-600"
                        title="TS Superato: mantieni la concentrazione attiva"
                      >
                        ✓ Superato
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        data-testid={`concentration-check-fail-${check.checkId}`}
                        onClick={() => handleResolveConcentrationCheck(check.checkId, "failed")}
                        className="h-7 bg-red-700 px-2.5 text-xs font-bold text-white hover:bg-red-600"
                        title="TS Fallito: interrompi concentrazione e rimuovi gli effetti collegati"
                      >
                        ✕ Fallito
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* BANNER PROMEMORIA TIRI SALVEZZA PENDENTI (INIZIO / FINE TURNO) */}
        {pendingSaveReminders.length > 0 ? (
          <div
            data-testid="save-reminders-banner"
            className="space-y-1.5 rounded-lg border border-amber-500/60 bg-amber-950/35 p-2.5 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-200">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                Tiri Salvezza di Fine / Inizio Turno ({pendingSaveReminders.length})
              </span>
              <span className="text-[10px] font-normal normal-case text-amber-300/80">
                Verifica se l&apos;effetto termina o persiste
              </span>
            </div>
            <div className="space-y-1.5">
              {pendingSaveReminders.map((reminder) => {
                const formattedBonus =
                  reminder.saveBonus >= 0 ? `+${reminder.saveBonus}` : `${reminder.saveBonus}`;
                const timingLabel =
                  reminder.timing === "turn_start" ? "Inizio Turno" : "Fine Turno";
                const abilityLabel = reminder.ability.toUpperCase();

                return (
                  <div
                    key={reminder.reminderId}
                    data-testid={`save-reminder-item-${reminder.reminderId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-500/40 bg-zinc-950/85 px-2.5 py-2 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-amber-100">{reminder.targetName}</span>
                        <span className="text-zinc-400">subisce</span>
                        <span className="rounded bg-amber-900/60 border border-amber-500/40 px-1.5 py-0.5 font-semibold text-amber-200">
                          {reminder.label}
                        </span>
                        <span className="rounded bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                          {timingLabel}
                        </span>
                        <span className="rounded bg-amber-950/70 border border-amber-700/40 px-1.5 py-0.5 font-mono text-[11px] text-amber-200">
                          TS {abilityLabel} → <strong className="text-amber-300">CD {reminder.dc}</strong> (Bonus: {formattedBonus})
                        </span>
                        {reminder.sourceName && (
                          <span className="text-[10px] text-zinc-400 italic">
                            Fonte: {reminder.sourceName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-emerald-600/60 bg-emerald-950/60 text-emerald-200 hover:bg-emerald-600/30 text-xs font-semibold px-2.5"
                        onClick={() => {
                          applyTransition((prev) =>
                            resolvePendingSaveReminder(prev, reminder.reminderId, "passed")
                          );
                          toast.success(`TS ${reminder.label} per ${reminder.targetName}: Superato!`);
                        }}
                      >
                        ✓ Superato
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-red-600/60 bg-red-950/60 text-red-200 hover:bg-red-600/30 text-xs font-semibold px-2.5"
                        onClick={() => {
                          applyTransition((prev) =>
                            resolvePendingSaveReminder(prev, reminder.reminderId, "failed")
                          );
                          toast.error(`TS ${reminder.label} per ${reminder.targetName}: Fallito!`);
                        }}
                      >
                        ✕ Fallito
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </header>

      {trackerDisplay === "tactical" ? (
        <div className="min-h-0 flex-1 overflow-hidden rounded border border-brass-base/30 bg-[#120d09]">
          <TacticalInitiativeCards
            entries={entries}
            currentTurnIndex={currentTurnIndex}
            onSelectTurn={handleSelectTurn}
            onUpdateHp={(id, delta) => void adjustHp(id, delta)}
            onSetHp={(id, hp) => void applyHpChange(id, hp)}
            onSetTempHp={setTempHp}
            onSetInitiative={(id, initiative) => updateEntry(id, { initiative })}
            onSetAc={(id, armorClass) => updateEntry(id, { armorClass: Math.max(0, armorClass) })}
            onToggleDead={(id) => void toggleDead(id)}
            onToggleCondition={(id, cId) => toggleCondition(id, cId)}
            onAddEffect={handleAddEffect}
            onRemoveEffect={handleRemoveEffect}
            onBreakConcentration={handleBreakConcentration}
            onConsumeEffect={handleConsumeEffect}
            onOpenMonsterStat={onOpenMonsterStat}
            onDeleteEntry={removeEntry}
            onToggleReaction={toggleReaction}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded border border-amber-600/30 bg-zinc-900/80">
        <Table>
          <TableHeader>
            <TableRow className="border-amber-600/20 hover:bg-transparent">
              {showTeamColumn ? (
                <TableHead className="h-8 w-24 px-2 text-xs font-semibold text-amber-400">Squadra</TableHead>
              ) : null}
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                Nome
              </TableHead>
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                Classe
              </TableHead>
              <TableHead className="h-8 min-w-[130px] px-2 text-xs font-semibold text-amber-400">
                HP
              </TableHead>
              <TableHead className="h-8 w-12 px-2 text-xs font-semibold text-amber-400">
                CA
              </TableHead>
              <TableHead className="h-8 w-12 px-2 text-xs font-semibold text-amber-400">
                Init
              </TableHead>
              <TableHead className="h-8 min-w-[110px] px-2 text-xs font-semibold text-amber-400">
                TS
              </TableHead>
              <TableHead className="h-8 w-24 px-2 text-xs font-semibold text-amber-400">
                Reazione
              </TableHead>
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                Stati
              </TableHead>
              <TableHead className="h-8 px-2 text-xs font-semibold text-amber-400">
                Danni
              </TableHead>
              <TableHead className="h-8 min-w-[100px] px-2 text-xs font-semibold text-amber-400">
                Note
              </TableHead>
              {showSpellSlotsColumn ? (
                <TableHead className="h-8 min-w-[7rem] px-2 text-xs font-semibold text-violet-300">
                  Slot
                </TableHead>
              ) : null}
              <TableHead className="h-8 w-12 px-1 text-xs font-semibold text-amber-400">
                Azioni
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow className="border-amber-600/20">
                <TableCell
                  colSpan={tableColSpan}
                  className="py-6 text-center text-xs text-zinc-500"
                >
                  Nessun partecipante.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry, index) => {
                const acInfo = computeEffectiveArmorClass(entry.armorClass, entry.activeEffects);
                const acModified = acInfo.effectiveAc !== acInfo.baseAc;
                const acTooltipParts = [`CA Base: ${acInfo.baseAc}`];
                if (acInfo.flatDelta !== 0) {
                  acTooltipParts.push(
                    `Modificatori effetti: ${acInfo.flatDelta > 0 ? `+${acInfo.flatDelta}` : acInfo.flatDelta}`
                  );
                }
                if (acInfo.coverBonus > 0) {
                  acTooltipParts.push(`Copertura: +${acInfo.coverBonus}`);
                }
                if (acInfo.formulaHints.length > 0) {
                  acTooltipParts.push(`Nota formula: ${acInfo.formulaHints.join("; ")}`);
                }

                return (
                <TableRow
                  key={entry.id}
                  className={cn(
                    "border-amber-600/20 text-sm",
                    entry.isDead && "bg-red-950/25 text-zinc-500",
                    index === currentTurnIndex &&
                      "bg-amber-600/25 ring-1 ring-amber-500/50"
                  )}
                >
                  {showTeamColumn ? (
                    <TableCell className="px-2 py-1.5">
                      {entry.teamName ? (
                        <span
                          className="inline-block max-w-[5.5rem] truncate rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            color: entry.teamColor ?? "#f59e0b",
                            backgroundColor: `${entry.teamColor ?? "#f59e0b"}22`,
                            borderLeft: `2px solid ${entry.teamColor ?? "#f59e0b"}`,
                          }}
                          title={entry.teamName}
                        >
                          {entry.teamName}
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600">—</span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "name" ? (
                      <Input
                        type="text"
                        className="h-10 min-w-[120px] bg-zinc-800 text-sm text-zinc-100"
                        defaultValue={entry.name}
                        autoFocus
                        onBlur={(e) =>
                          handleCellSave(entry.id, "name", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCellSave(
                              entry.id,
                              "name",
                              (e.target as HTMLInputElement).value
                            );
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          "min-w-0 max-w-[140px] truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors hover:bg-zinc-700/80 hover:text-amber-200",
                          entry.isDead ? "text-zinc-500 line-through" : "text-zinc-100"
                        )}
                        onClick={() =>
                          setEditingCell({ id: entry.id, field: "name" })
                        }
                        title={entry.name}
                      >
                        {entry.name}
                      </button>
                    )}
                    {entry.isDead && (
                      <span className="mt-1 inline-flex rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
                        Morto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <span className="inline-block max-w-[120px] truncate text-xs text-zinc-300" title={entry.characterClass ?? "—"}>
                      {entry.characterClass?.trim() || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "hp" ? (
                      <Input
                        type="number"
                        className="h-10 w-28 bg-zinc-800 text-sm text-zinc-100"
                        defaultValue={entry.hp}
                        autoFocus
                        onBlur={(e) =>
                          handleCellSave(entry.id, "hp", e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCellSave(
                              entry.id,
                              "hp",
                              (e.target as HTMLInputElement).value
                            );
                          }
                        }}
                      />
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 border-amber-600/30 bg-zinc-900/60 px-0 text-zinc-200 hover:bg-amber-600/20"
                            onClick={() => void adjustHp(entry.id, -1)}
                            title="-1 HP (Danno)"
                          >
                            -
                          </Button>
                          <button
                            type="button"
                            className={cn(
                              "min-w-[5.5rem] rounded px-2 py-1 text-left text-sm font-semibold transition-colors hover:bg-zinc-700/80",
                              hpColor(entry)
                            )}
                            onClick={() =>
                              setEditingCell({ id: entry.id, field: "hp" })
                            }
                            title="Clicca per rettificare manualmente i PF esatti (non attiva TS concentrazione)"
                          >
                            {entry.maxHp > 0 ? `${entry.hp}/${entry.maxHp}` : entry.hp}
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 border-amber-600/30 bg-zinc-900/60 px-0 text-zinc-200 hover:bg-amber-600/20"
                            onClick={() => void adjustHp(entry.id, +1)}
                            title="+1 HP (Cura)"
                          >
                            +
                          </Button>
                        </div>

                        {/* PF Temporanei + Input Rapido Danno/Cura */}
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const val = fastDmgInputs[entry.id] ?? "";
                              if (val) void handleFastDmgSubmit(entry, val);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Input
                              type="text"
                              placeholder="±danno"
                              value={fastDmgInputs[entry.id] ?? ""}
                              onChange={(e) =>
                                setFastDmgInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))
                              }
                              className="h-6 w-16 bg-zinc-800/90 px-1 py-0 text-center font-mono text-[10px] text-zinc-200 border-zinc-700 placeholder:text-zinc-500"
                              title="Inserisci danni subiti (es. 12) o cura (es. -5) e premi Invio"
                            />
                          </form>

                          {editingCell?.id === entry.id && editingCell?.field === "tempHp" ? (
                            <Input
                              type="number"
                              min={0}
                              defaultValue={entry.tempHp ?? 0}
                              autoFocus
                              onBlur={(e) => handleCellSave(entry.id, "tempHp", e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleCellSave(
                                    entry.id,
                                    "tempHp",
                                    (e.target as HTMLInputElement).value
                                  );
                                } else if (e.key === "Escape") {
                                  setEditingCell(null);
                                }
                              }}
                              className="h-6 w-14 bg-cyan-950/90 border-cyan-500/60 px-1 text-center font-mono text-[10px] text-cyan-100"
                            />
                          ) : (entry.tempHp ?? 0) > 0 ? (
                            <button
                              type="button"
                              onClick={() => setEditingCell({ id: entry.id, field: "tempHp" })}
                              className="rounded border border-cyan-500/50 bg-cyan-950/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-300 hover:bg-cyan-900/70"
                              title="Punti Ferita Temporanei attivi (assorbono il danno prima dei PF reali). Clicca per modificare."
                            >
                              +{entry.tempHp} temp
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingCell({ id: entry.id, field: "tempHp" })}
                              className="rounded border border-zinc-700/70 bg-zinc-900/70 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400 hover:border-cyan-600/50 hover:text-cyan-300"
                              title="Imposta Punti Ferita Temporanei"
                            >
                              +Temp
                            </button>
                          )}
                        </div>

                        {entry.type === "pc" && entry.hp <= 0 && (
                          <div className="flex flex-col gap-0.5 rounded bg-zinc-950/80 p-1 border border-red-900/40 text-[10px]">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-emerald-400 font-bold text-[9px]">S:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3].map((num) => (
                                  <button
                                    key={`succ-${num}`}
                                    type="button"
                                    onClick={() => toggleDeathSaveSuccess(entry.id)}
                                    className={cn(
                                      "h-3 w-3 rounded-full border text-[8px]",
                                      (entry.deathSaves?.success ?? 0) >= num
                                        ? "bg-emerald-500 border-emerald-400"
                                        : "border-zinc-700 hover:border-emerald-500"
                                    )}
                                    title={`TS Morte Successo ${num}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-red-400 font-bold text-[9px]">F:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3].map((num) => (
                                  <button
                                    key={`fail-${num}`}
                                    type="button"
                                    onClick={() => toggleDeathSaveFail(entry.id)}
                                    className={cn(
                                      "h-3 w-3 rounded-full border text-[8px]",
                                      (entry.deathSaves?.fail ?? 0) >= num
                                        ? "bg-red-500 border-red-400"
                                        : "border-zinc-700 hover:border-red-500"
                                    )}
                                    title={`TS Morte Fallimento ${num}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                        {typeof entry.exp === "number" && entry.exp > 0 && (
                          <span className="mt-0.5 text-[10px] font-medium text-amber-300/90">
                            EXP: {entry.exp}
                          </span>
                        )}
                        {(entry.type === "monster" || entry.type === "custom") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "h-7 justify-start px-0 text-[10px]",
                              entry.isDead ? "text-red-300 hover:bg-red-500/10" : "text-zinc-400 hover:bg-zinc-700/30"
                            )}
                            onClick={() => void toggleDead(entry.id)}
                          >
                            <Skull className="mr-1 h-3 w-3" />
                            {entry.isDead ? "Ripristina vivo" : "Segna morto"}
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id && editingCell?.field === "armorClass" ? (
                      <Input
                        type="number"
                        className="h-10 w-20 bg-zinc-800 text-sm text-zinc-100"
                        defaultValue={entry.armorClass}
                        autoFocus
                        onBlur={(e) => handleCellSave(entry.id, "armorClass", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCellSave(entry.id, "armorClass", (e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          "min-w-[2rem] rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors hover:bg-zinc-700/80",
                          acModified
                            ? acInfo.effectiveAc > acInfo.baseAc
                              ? "text-cyan-300 font-bold"
                              : "text-rose-300 font-bold"
                            : "text-zinc-200"
                        )}
                        onClick={() => setEditingCell({ id: entry.id, field: "armorClass" })}
                        title={acTooltipParts.join(" · ")}
                      >
                        <span>{acInfo.effectiveAc}</span>
                        {acModified && (
                          <span className="ml-0.5 text-[9px] text-zinc-400 font-normal">
                            ({acInfo.baseAc})
                          </span>
                        )}
                        {acInfo.formulaHints.length > 0 && (
                          <span className="ml-0.5 text-[9px] text-amber-400" title={acInfo.formulaHints.join("; ")}>
                            *
                          </span>
                        )}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    {editingCell?.id === entry.id &&
                    editingCell?.field === "initiative" ? (
                      <Input
                        type="number"
                        className="h-10 w-20 bg-zinc-800 text-sm text-zinc-100"
                        defaultValue={entry.initiative}
                        autoFocus
                        onBlur={(e) =>
                          handleCellSave(
                            entry.id,
                            "initiative",
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCellSave(
                              entry.id,
                              "initiative",
                              (e.target as HTMLInputElement).value
                            );
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="min-w-[2rem] rounded px-1.5 py-0.5 text-left text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700/80"
                        onClick={() =>
                          setEditingCell({
                            id: entry.id,
                            field: "initiative",
                          })
                        }
                      >
                        {entry.initiative}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-middle">
                    {entry.savingThrows ? (
                      <div className="space-y-0.5">
                        <div className="grid grid-cols-3 gap-x-1.5 gap-y-0.5 text-[10px] font-mono leading-tight max-w-[120px]">
                          <span className="truncate text-zinc-400" title={`FOR ${entry.savingThrows.for >= 0 ? `+${entry.savingThrows.for}` : entry.savingThrows.for}`}>
                            FOR <span className={entry.savingThrows.for > 0 ? "text-amber-300 font-semibold" : "text-zinc-300"}>{entry.savingThrows.for >= 0 ? `+${entry.savingThrows.for}` : entry.savingThrows.for}</span>
                          </span>
                          <span className="truncate text-zinc-400" title={`DES ${entry.savingThrows.des >= 0 ? `+${entry.savingThrows.des}` : entry.savingThrows.des}`}>
                            DES <span className={entry.savingThrows.des > 0 ? "text-amber-300 font-semibold" : "text-zinc-300"}>{entry.savingThrows.des >= 0 ? `+${entry.savingThrows.des}` : entry.savingThrows.des}</span>
                          </span>
                          <span className="truncate text-zinc-400" title={`COS ${entry.savingThrows.cos >= 0 ? `+${entry.savingThrows.cos}` : entry.savingThrows.cos}`}>
                            COS <span className={entry.savingThrows.cos > 0 ? "text-amber-300 font-semibold" : "text-zinc-300"}>{entry.savingThrows.cos >= 0 ? `+${entry.savingThrows.cos}` : entry.savingThrows.cos}</span>
                          </span>
                          <span className="truncate text-zinc-400" title={`INT ${entry.savingThrows.int >= 0 ? `+${entry.savingThrows.int}` : entry.savingThrows.int}`}>
                            INT <span className={entry.savingThrows.int > 0 ? "text-amber-300 font-semibold" : "text-zinc-300"}>{entry.savingThrows.int >= 0 ? `+${entry.savingThrows.int}` : entry.savingThrows.int}</span>
                          </span>
                          <span className="truncate text-zinc-400" title={`SAG ${entry.savingThrows.sag >= 0 ? `+${entry.savingThrows.sag}` : entry.savingThrows.sag}`}>
                            SAG <span className={entry.savingThrows.sag > 0 ? "text-amber-300 font-semibold" : "text-zinc-300"}>{entry.savingThrows.sag >= 0 ? `+${entry.savingThrows.sag}` : entry.savingThrows.sag}</span>
                          </span>
                          <span className="truncate text-zinc-400" title={`CAR ${entry.savingThrows.car >= 0 ? `+${entry.savingThrows.car}` : entry.savingThrows.car}`}>
                            CAR <span className={entry.savingThrows.car > 0 ? "text-amber-300 font-semibold" : "text-zinc-300"}>{entry.savingThrows.car >= 0 ? `+${entry.savingThrows.car}` : entry.savingThrows.car}</span>
                          </span>
                        </div>
                        {(!entry.savingThrowsSource || entry.savingThrowsSource === "estimated") && (
                          <div
                            className="text-[9px] text-amber-400/90 flex items-center gap-0.5"
                            title="Tiri salvezza stimati (non presenti nei dati strutturati della scheda)"
                          >
                            <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                            <span>Stimati</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-middle">
                    <div className="flex flex-col gap-1 items-start">
                      <button
                        type="button"
                        onClick={() => toggleReaction(entry.id)}
                        className={cn(
                          "flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold font-mono transition-colors",
                          entry.usedReaction
                            ? "bg-red-950/70 text-red-400 border border-red-800/60 line-through"
                            : "bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/80"
                        )}
                        title="Clicca per invertire stato reazione (usata / pronta). Si resetta automaticamente al cambio turno."
                      >
                        <Zap className="h-3 w-3" />
                        {entry.usedReaction ? "Usata" : "Pronta"}
                      </button>

                      {entry.availableReactions && entry.availableReactions.length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex items-center gap-1 text-[9px] text-zinc-400 hover:text-amber-300 underline underline-offset-2"
                            >
                              <Info className="h-2.5 w-2.5" />
                              <span>{entry.availableReactions.length} {entry.availableReactions.length === 1 ? "reazione" : "reazioni"}</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 border-brass-base/40 bg-[#140e0a] p-2.5 text-xs text-parchment-200 shadow-xl">
                            <div className="space-y-2">
                              <h4 className="font-cinzel text-xs font-bold text-amber-300 border-b border-brass-base/20 pb-1">
                                Reazioni di {entry.name}
                              </h4>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {entry.availableReactions.map((r, i) => (
                                  <div key={i} className="rounded bg-[#1d140e] p-1.5 border border-brass-base/10">
                                    <div className="font-bold text-[11px] text-brass-light">{r.name}</div>
                                    {r.trigger && <div className="text-[10px] text-amber-400/80 italic">Innesco: {r.trigger}</div>}
                                    {r.description && <div className="text-[10px] text-zinc-400 mt-0.5">{r.description}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <ConditionsCell
                      entryId={entry.id}
                      name={entry.name}
                      value={entry.conditions}
                      activeEffects={entry.activeEffects}
                      activeConcentration={entry.activeConcentration}
                      allCombatants={entries.map((e) => ({ id: e.id, name: e.name, type: e.type }))}
                      onChange={(conditions) => updateConditions(entry.id, conditions)}
                      onAddEffect={handleAddEffect}
                      onRemoveEffect={(effId) => handleRemoveEffect(entry.id, effId)}
                      onStartConcentration={handleStartConcentration}
                      onBreakConcentration={() => handleBreakConcentration(entry.id)}
                      onConsumeEffect={(effId) => handleConsumeEffect(entry.id, effId)}
                    />
                  </TableCell>
                  <TableCell className="px-2 py-1.5">
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 border-orange-600/30 bg-zinc-900/60 px-0 text-xs text-orange-200 hover:bg-orange-600/20"
                          onClick={() => adjustDamageDealt(entry.id, -5)}
                          title="-5 danni inflitti"
                        >
                          -5
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 border-orange-600/30 bg-zinc-900/60 px-0 text-xs text-orange-200 hover:bg-orange-600/20"
                          onClick={() => adjustDamageDealt(entry.id, -1)}
                          title="-1 danno inflitto"
                        >
                          -
                        </Button>
                        <span
                          className={cn(
                            "min-w-[2.25rem] text-center text-sm font-bold tabular-nums",
                            entry.type === "pc" ? "text-orange-300" : "text-orange-400/80"
                          )}
                          title="Danni inflitti in questo combattimento"
                        >
                          {entry.damageDealt ?? 0}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 border-orange-600/30 bg-zinc-900/60 px-0 text-xs text-orange-200 hover:bg-orange-600/20"
                          onClick={() => adjustDamageDealt(entry.id, +1)}
                          title="+1 danno inflitto"
                        >
                          +
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 border-orange-600/30 bg-zinc-900/60 px-0 text-xs text-orange-200 hover:bg-orange-600/20"
                          onClick={() => adjustDamageDealt(entry.id, +5)}
                          title="+5 danni inflitti"
                        >
                          +5
                        </Button>
                      </div>
                      {(entry.damageDealt ?? 0) > 0 ? (
                        <button
                          type="button"
                          className="text-[10px] text-zinc-500 hover:text-orange-300"
                          onClick={() => updateEntry(entry.id, { damageDealt: 0 })}
                        >
                          Azzera danni
                        </button>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 align-middle">
                    <Input
                      type="text"
                      placeholder="Nota..."
                      value={entry.noteText ?? ""}
                      onChange={(e) => updateNote(entry.id, e.target.value)}
                      className="h-7 w-28 bg-zinc-800/80 px-1.5 text-[11px] text-zinc-200 border-zinc-700/60 focus:border-amber-500/80 placeholder:text-zinc-600"
                      title="Nota rapida combattente"
                    />
                  </TableCell>
                  {showSpellSlotsColumn ? (
                    <TableCell className="px-2 py-1.5 align-top">
                      {entry.spellSlots ? (
                        <SpellSlotsCell
                          slots={entry.spellSlots}
                          onSpend={(level) => spendSpellSlot(entry.id, level)}
                          onRestore={(level) => restoreSpellSlot(entry.id, level)}
                          onReset={() => resetEntrySpellSlots(entry.id)}
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-600">—</span>
                      )}
                    </TableCell>
                  ) : null}
                  <TableCell className="px-1 py-1.5">
                    <div className="flex items-center gap-0.5">
                      {(entry.type === "monster" || entry.type === "custom") && onOpenMonsterStat ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-amber-400 hover:bg-amber-500/20 hover:text-amber-200"
                          onClick={() =>
                            onOpenMonsterStat({
                              id: entry.id,
                              name: entry.name,
                              entityId: entry.entityId,
                            })
                          }
                          aria-label="Apri statblock"
                          title="Apri statblock"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {(entry.type === "monster" || entry.type === "custom") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 hover:text-red-200",
                            entry.isDead ? "text-red-300 hover:bg-red-500/20" : "text-zinc-500 hover:bg-zinc-700/40"
                          )}
                          onClick={() => void toggleDead(entry.id)}
                          aria-label={entry.isDead ? "Ripristina vivo" : "Segna morto"}
                          title={entry.isDead ? "Ripristina vivo" : "Segna morto"}
                        >
                          <Skull className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-400 hover:bg-amber-500/20 hover:text-amber-200"
                        onClick={() => duplicateEntry(entry)}
                        aria-label="Duplica"
                        title="Duplica (nome con numero progressivo)"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                        onClick={() => removeEntry(entry.id)}
                        aria-label="Rimuovi"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      )}

      {/* Dialog Aggiungi PG */}
      <Dialog open={addPcOpen} onOpenChange={setAddPcOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              Aggiungi personaggio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-400">
                Seleziona più PG e aggiungili in un colpo solo.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setSelectedPcIds(new Set(pcList.map((p) => p.id)))}
                  disabled={pcList.length === 0}
                >
                  Tutti
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setSelectedPcIds(new Set())}
                  disabled={selectedPcIds.size === 0}
                >
                  Nessuno
                </Button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-amber-600/20 bg-zinc-950/30 p-2">
            {pcList.length === 0 ? (
              <p className="py-4 text-zinc-500">
                Nessun PG in questa campagna.
              </p>
            ) : (
              <ul className="space-y-1">
                {pcList.map((c) => (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-amber-600/20 hover:text-amber-200">
                      <input
                        type="checkbox"
                        checked={selectedPcIds.has(c.id)}
                        onChange={() =>
                          setSelectedPcIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(c.id)) next.delete(c.id);
                            else next.add(c.id);
                            return next;
                          })
                        }
                        className="h-4 w-4 accent-amber-500"
                      />
                      <span className="text-base">{c.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-zinc-500">
                {selectedPcIds.size} selezionati
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setAddPcOpen(false)}
                >
                  Chiudi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  onClick={addSelectedPcs}
                  disabled={selectedPcIds.size === 0}
                >
                  Aggiungi selezionati
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Aggiungi Mostro */}
      <Dialog open={addMonsterOpen} onOpenChange={setAddMonsterOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              Aggiungi mostro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Quantità (per ogni mostro selezionato)
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={monsterQuantity}
                onChange={(e) =>
                  setMonsterQuantity(
                    Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1))
                  )
                }
                className="w-24 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-400">
                Seleziona più mostri e aggiungili in batch.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setSelectedMonsterIds(new Set(monsterList.map((m) => m.id)))}
                  disabled={monsterList.length === 0}
                >
                  Tutti
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setSelectedMonsterIds(new Set())}
                  disabled={selectedMonsterIds.size === 0}
                >
                  Nessuno
                </Button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-amber-600/20 bg-zinc-950/30 p-2">
              {monsterList.length === 0 ? (
                <p className="py-4 text-zinc-500">
                  Nessun mostro nel wiki. Crea voci tipo &quot;Mostro&quot; nella Wiki.
                </p>
              ) : (
                <ul className="space-y-1">
                  {monsterList.map((m) => {
                    const isDead = isLongCampaign && m.global_status === "dead";
                    return (
                      <li key={m.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 hover:bg-amber-600/20 hover:text-amber-200">
                          <input
                            type="checkbox"
                            checked={selectedMonsterIds.has(m.id)}
                            onChange={() =>
                              setSelectedMonsterIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(m.id)) next.delete(m.id);
                                else next.add(m.id);
                                return next;
                              })
                            }
                            className="h-4 w-4 accent-amber-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate font-medium">{m.name}</span>
                              <span className="text-sm text-zinc-500">HP {m.hp}</span>
                              {isDead && (
                                <span className="rounded bg-red-500/30 px-1.5 py-0.5 text-xs text-red-300">
                                  Morto
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-xs text-zinc-500">
                {selectedMonsterIds.size} selezionati
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-amber-600/40 text-amber-100"
                  onClick={() => setAddMonsterOpen(false)}
                >
                  Chiudi
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8 bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  onClick={addSelectedMonsters}
                  disabled={selectedMonsterIds.size === 0}
                >
                  Aggiungi selezionati
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Aggiungi Mostro Manuale */}
      <Dialog open={addCustomOpen} onOpenChange={setAddCustomOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              Aggiungi mostro manuale
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm text-zinc-300">Nome</label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Es. Goblin"
                className="bg-zinc-800 text-zinc-100"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">HP</label>
                <Input
                  type="number"
                  min={0}
                  value={customHp}
                  onChange={(e) => setCustomHp(e.target.value)}
                  className="bg-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">CA</label>
                <Input
                  type="number"
                  min={0}
                  value={customAc}
                  onChange={(e) => setCustomAc(e.target.value)}
                  className="bg-zinc-800 text-zinc-100"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">
                  Iniziativa
                </label>
                <Input
                  type="number"
                  value={customInit}
                  onChange={(e) => setCustomInit(e.target.value)}
                  className="bg-zinc-800 text-zinc-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">
                  Grado di Sfida (GS)
                </label>
                <Select
                  value={customGs}
                  onValueChange={(val) => {
                    setCustomGs(val);
                    const opt = CHALLENGE_RATING_OPTIONS.find(
                      (o) => o.value === val
                    );
                    setCustomExp(opt?.xp ?? 0);
                  }}
                >
                  <SelectTrigger className="h-9 w-full border-amber-600/40 bg-zinc-800 text-xs text-zinc-100">
                    <SelectValue placeholder="Scegli GS" />
                  </SelectTrigger>
                  <SelectContent className="border-amber-600/40 bg-zinc-900 text-xs text-zinc-100">
                    {CHALLENGE_RATING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="block text-sm text-zinc-300">
                  Punti Esperienza
                </label>
                <div className="rounded border border-amber-600/40 bg-zinc-800 px-3 py-2 text-xs text-amber-200">
                  {customExp > 0 ? `${customExp} EXP` : "Nessun GS selezionato"}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-600/40 text-amber-100"
                onClick={() => setAddCustomOpen(false)}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
                onClick={handleCreateCustom}
              >
                Aggiungi alla iniziativa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
