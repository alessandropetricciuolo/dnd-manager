"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
} from "react";
import { getCampaignCharacters, type CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { setWikiEntityGlobalStatus } from "@/app/campaigns/wiki-actions";
import {
  getApprovedSignupsForSession,
  getLongCampaignCalendarState,
  saveLongCampaignCalendarBaseDate,
} from "@/app/campaigns/actions";
import {toast} from "sonner";
import { getSessionXpDraftAction, saveSessionXpDraftAction } from "@/app/campaigns/session-xp-actions";
import { computeSessionXpAwards, monsterXp } from "@/lib/gm/session-xp";
import { getCampaignSessionsForGm, type CampaignSessionOption } from "@/app/campaigns/gm-actions";
import {
  type InitiativeEntry,
  type InitiativeTrackerState,
  emptyInitiativeTrackerState,
  sanitizeInitiativeTrackerState,
} from "@/components/gm/initiative-tracker";
import { adjustInitiativeHp, type InitiativeRemoteCommandHandlers } from "@/lib/gm-remote/initiative-commands";
import { normalizeCombatConditions } from "@/lib/combat-conditions";
import { createRemoteCombatCommandController } from "@/lib/gm-remote/combat-command-controller";
import type { RemoteCombatCommandSnapshot } from "@/lib/gm-remote/combat-command-remote";
import {
  applyCombatHpMutation,
  buildInitiativeDraftState,
  removeCombatantFromState,
  setCanonicalConditionsOnEntry,
  toggleCombatStatusOnEntry,
  toggleMobileConcentrationOnEntry,
  transitionNextTurn,
} from "@/lib/fight-mode/state-transitions";
import { resetTurnTimer, toggleTurnTimer } from "@/lib/fight-mode/turn-timer";
import {
  DEFAULT_FANTASY_BASE_DATE,
  DEFAULT_FANTASY_CALENDAR_CONFIG,
  normalizeFantasyCalendarConfig,
  normalizeFantasyCalendarDate,
  type FantasyCalendarConfig,
  type FantasyCalendarDate,
} from "@/lib/long-calendar";

export type LongSessionAttendanceStatus = "attended" | "absent";

export type LongSessionSignup = {
  id: string;
  player_id: string;
  player_name: string;
  status: string;
};

export type LongSessionXpCharacterState = {
  plus: number;
  minus: number;
  customXp: number | null;
};

export type LongSessionXpState = {
  version: 2;
  extraXpManual: number;
  bankedMonsterXp: number;
  perCharacter: Record<string, LongSessionXpCharacterState>;
};

export type LongSessionEconomyDraft = {
  payoutMissionId: string;
  payoutAlloc: Record<string, { gp: string; sp: string; cp: string }>;
};

export type LongSessionMissionSelection = {
  missionId: string;
  encounterId: string;
};

type InitiativeState = InitiativeTrackerState;

function advanceRemoteTurn(state: InitiativeState, direction: 1 | -1): InitiativeState {
  const length = state.entries.length;
  if (!length) return state;
  let index = state.currentTurnIndex;
  let rounds = state.roundNumber;
  for (let attempt = 0; attempt < length; attempt += 1) {
    const previous = index;
    index = direction === 1 ? (index + 1) % length : index === 0 ? length - 1 : index - 1;
    if (direction === 1 && index === 0) rounds += 1;
    if (direction === -1 && previous === 0) rounds = Math.max(1, rounds - 1);
    const entry = state.entries[index];
    const dead = entry && (entry.type === "monster" || entry.type === "custom") && (entry.isDead || entry.hp <= 0);
    if (!dead) break;
  }
  return {
    ...state,
    entries: state.entries.map((entry) => entry.usedReaction ? { ...entry, usedReaction: false } : entry),
    currentTurnIndex: index,
    roundNumber: rounds,
  };
}

type StoredLongSessionState = {
  importedLegacy?: boolean;
  revision?: number;
  version: 2;
  attendance: Record<string, LongSessionAttendanceStatus>;
  initiative: InitiativeState;
  xp: LongSessionXpState;
  elapsedHours: number;
  economyDraft: LongSessionEconomyDraft;
  missionSelection: LongSessionMissionSelection;
};

type LongSessionContextValue = {
  campaignId: string;
  setDraftPaused: (paused: boolean) => void;
  concludeFight: () => boolean;
  draftMessage: string;
  sessions: CampaignSessionOption[];
  loadingSessions: boolean;
  selectedSessionId: string | null;
  setSelectedSessionId: (sessionId: string | null) => void;
  signups: LongSessionSignup[];
  loadingSignups: boolean;
  allCharacters: CampaignCharacterRow[];
  loadingCharacters: boolean;
  sessionCharacters: CampaignCharacterRow[];
  sessionCharactersMissingSheet: LongSessionSignup[];
  attendance: Record<string, LongSessionAttendanceStatus>;
  setAttendance: (playerId: string, value: LongSessionAttendanceStatus) => void;
  initiativeState: InitiativeState;
  setInitiativeState: Dispatch<SetStateAction<InitiativeState>>;
  initiativeRemoteHandlers: InitiativeRemoteCommandHandlers;
  remoteCombatCommand: RemoteCombatCommandSnapshot | null;
  handleRemoteCombatCommandRequest: (payload: Record<string, unknown>, remoteSessionPublicId: string) => void;
  handleRemoteCombatCommandConfirm: (payload: Record<string, unknown>, remoteSessionPublicId: string) => void;
  confirmRemoteCombatCommandOnPc: (operationIds?: string[]) => void;
  onRemoteSessionContextChange: (remoteSessionPublicId: string | null) => void;
  xpState: LongSessionXpState;
  setXpState: (state: LongSessionXpState) => void;
  elapsedHours: number;
  setElapsedHours: (hours: number) => void;
  calendarBaseDate: FantasyCalendarDate;
  setCalendarBaseDate: (date: FantasyCalendarDate) => void;
  calendarConfig: FantasyCalendarConfig;
  setCalendarConfig: (config: FantasyCalendarConfig) => void;
  saveCalendarSettings: () => Promise<{ success: boolean; error?: string; message?: string }>;
  economyDraft: LongSessionEconomyDraft;
  setEconomyDraft: (draft: LongSessionEconomyDraft) => void;
  missionSelection: LongSessionMissionSelection;
  setMissionSelection: (selection: LongSessionMissionSelection) => void;
  refreshSessions: () => Promise<void>;
  refreshCharacters: () => Promise<void>;
  updateCharacterCoinsLocally: (characterId: string, next: { coins_gp: number; coins_sp: number; coins_cp: number }) => void;
  clearSelectedSessionState: () => void;
  selectedSessionLabel: string | undefined;
  hasActiveSession: boolean;
  hasUnsavedLocalState: boolean;
};

const LAST_SESSION_KEY_PREFIX = "gm-screen-long-selected-";
const SESSION_STATE_KEY_PREFIX = "gm-screen-long-session-";

const emptyInitiativeState: InitiativeState = emptyInitiativeTrackerState();

const emptyXpState: LongSessionXpState = {
  version: 2,
  extraXpManual: 0,
  bankedMonsterXp: 0,
  perCharacter: {},
};

const emptyEconomyDraft: LongSessionEconomyDraft = {
  payoutMissionId: "",
  payoutAlloc: {},
};

const emptyMissionSelection: LongSessionMissionSelection = {
  missionId: "",
  encounterId: "",
};

const LongSessionContext = createContext<LongSessionContextValue | null>(null);

function sessionStateKey(campaignId: string, sessionId: string) {
  return `${SESSION_STATE_KEY_PREFIX}${campaignId}-${sessionId}`;
}

function lastSessionKey(campaignId: string) {
  return `${LAST_SESSION_KEY_PREFIX}${campaignId}`;
}

function defaultAttendanceFromStatus(status: string | null | undefined): LongSessionAttendanceStatus {
  return String(status ?? "").toLowerCase() === "absent" ? "absent" : "attended";
}

function formatSessionLabel(session: CampaignSessionOption): string {
  const date = new Date(session.scheduled_at);
  const dateLabel = Number.isNaN(date.getTime())
    ? session.scheduled_at
    : date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" });
  return session.title?.trim() ? `${session.title} — ${dateLabel}` : dateLabel;
}

function readStoredSessionState(campaignId: string, sessionId: string): StoredLongSessionState | null {
  try {
    const raw = localStorage.getItem(sessionStateKey(campaignId, sessionId));
    if (!raw) {
      if (localStorage.getItem(`gm-screen-legacy-xp-imported-${campaignId}`)) return null;
      const oldXp = localStorage.getItem(`gm-screen-session-xp-${campaignId}`);
      const oldInitiative = localStorage.getItem(`gm-screen-initiative-${campaignId}`);
      if (!oldXp && !oldInitiative) return null;
      return {version:2,importedLegacy:true,attendance:{},xp:oldXp ? JSON.parse(oldXp) : emptyXpState,
        initiative:sanitizeInitiativeState(oldInitiative ? JSON.parse(oldInitiative) : null),elapsedHours:0,
        economyDraft:emptyEconomyDraft,missionSelection:emptyMissionSelection};
    }
    const parsed = JSON.parse(raw) as {
      revision?: number;
      version?: number;
      attendance?: Record<string, LongSessionAttendanceStatus>;
      initiative?: InitiativeState;
      xp?: Partial<LongSessionXpState> & { perCharacter?: Record<string, LongSessionXpCharacterState> };
      elapsedHours?: number;
      economyDraft?: Partial<LongSessionEconomyDraft>;
      missionSelection?: Partial<LongSessionMissionSelection> | null;
    };
    if (parsed?.version !== 1 && parsed?.version !== 2) return null;
    return {
      revision: parsed.revision,
      version: 2,
      attendance: parsed.attendance ?? {},
      initiative: sanitizeInitiativeState(parsed.initiative),
      xp:
        parsed.xp && typeof parsed.xp === "object"
          ? {
              version: 2,
              extraXpManual:
                parsed.xp.extraXpManual != null && Number.isFinite(parsed.xp.extraXpManual)
                  ? Math.max(0, Math.trunc(parsed.xp.extraXpManual))
                  : 0,
              bankedMonsterXp:
                parsed.xp.bankedMonsterXp != null && Number.isFinite(parsed.xp.bankedMonsterXp)
                  ? Math.max(0, Math.trunc(parsed.xp.bankedMonsterXp))
                  : 0,
              perCharacter: parsed.xp.perCharacter ?? {},
            }
          : emptyXpState,
      elapsedHours:
        parsed.elapsedHours != null && Number.isFinite(parsed.elapsedHours)
          ? Math.max(0, Math.trunc(parsed.elapsedHours))
          : 0,
      economyDraft: {
        payoutMissionId: parsed.economyDraft?.payoutMissionId ?? "",
        payoutAlloc: parsed.economyDraft?.payoutAlloc ?? {},
      },
      missionSelection: sanitizeMissionSelection(parsed.missionSelection),
    };
  } catch {
    return null;
  }
}

function sanitizeXpState(
  input: LongSessionXpState | null | undefined,
  validCharacterIds: string[]
): LongSessionXpState {
  const valid = new Set(validCharacterIds);
  const source = input?.perCharacter ?? {};
  const perCharacter: Record<string, LongSessionXpCharacterState> = {};
  for (const [characterId, value] of Object.entries(source)) {
    if (!valid.has(characterId)) continue;
    perCharacter[characterId] = {
      plus: Number.isFinite(value?.plus) ? Math.max(0, Math.trunc(value.plus)) : 0,
      minus: Number.isFinite(value?.minus) ? Math.max(0, Math.trunc(value.minus)) : 0,
      customXp:
        value?.customXp != null && Number.isFinite(value.customXp)
          ? Math.max(0, Math.trunc(value.customXp))
          : null,
    };
  }
  return {
    version: 2,
    extraXpManual:
      input?.extraXpManual != null && Number.isFinite(input.extraXpManual)
        ? Math.max(0, Math.trunc(input.extraXpManual))
        : 0,
    bankedMonsterXp:
      input?.bankedMonsterXp != null && Number.isFinite(input.bankedMonsterXp)
        ? Math.max(0, Math.trunc(input.bankedMonsterXp))
        : 0,
    perCharacter,
  };
}

function sanitizeInitiativeState(input: InitiativeState | null | undefined): InitiativeState {
  return sanitizeInitiativeTrackerState(input ?? undefined);
}

function sanitizeEconomyDraft(
  input: LongSessionEconomyDraft | null | undefined,
  validCharacterIds: string[]
): LongSessionEconomyDraft {
  const valid = new Set(validCharacterIds);
  const payoutAlloc: LongSessionEconomyDraft["payoutAlloc"] = {};
  for (const [characterId, value] of Object.entries(input?.payoutAlloc ?? {})) {
    if (!valid.has(characterId)) continue;
    payoutAlloc[characterId] = {
      gp: value?.gp ?? "",
      sp: value?.sp ?? "",
      cp: value?.cp ?? "",
    };
  }
  return {
    payoutMissionId: input?.payoutMissionId ?? "",
    payoutAlloc,
  };
}

function sanitizeMissionSelection(
  input: Partial<LongSessionMissionSelection> | null | undefined
): LongSessionMissionSelection {
  return {
    missionId: typeof input?.missionId === "string" ? input.missionId : "",
    encounterId: typeof input?.encounterId === "string" ? input.encounterId : "",
  };
}

function buildDefaultAttendance(signups: LongSessionSignup[]) {
  return signups.reduce(
    (acc, signup) => {
      acc[signup.player_id] = defaultAttendanceFromStatus(signup.status);
      return acc;
    },
    {} as Record<string, LongSessionAttendanceStatus>
  );
}

export function GmScreenLongStateProvider({
  campaignId,
  initialSessionId,
  children,
}: {
  campaignId: string;
  initialSessionId?: string | null;
  children: ReactNode;
}) {
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [sessions, setSessions] = useState<CampaignSessionOption[]>([]);
  const [signups, setSignups] = useState<LongSessionSignup[]>([]);
  const [allCharacters, setAllCharacters] = useState<CampaignCharacterRow[]>([]);
  const [selectedSessionId, setSelectedSessionIdState] = useState<string | null>(initialSessionId ?? null);
  const [attendance, setAttendanceState] = useState<Record<string, LongSessionAttendanceStatus>>({});
  const [initiativeState, setInitiativeState] = useState<InitiativeState>(emptyInitiativeState);
  const [remoteCombatCommand, setRemoteCombatCommand] = useState<RemoteCombatCommandSnapshot | null>(null);
  const remoteCombatCommandRef = useRef<RemoteCombatCommandSnapshot | null>(null);
  remoteCombatCommandRef.current = remoteCombatCommand;
  const selectedSessionRef = useRef(selectedSessionId);
  selectedSessionRef.current = selectedSessionId;
  const campaignIdRef = useRef(campaignId);
  campaignIdRef.current = campaignId;
  const remoteSessionPublicIdRef = useRef<string | null>(null);
  const initiativeRef = useRef(initiativeState);
  initiativeRef.current = initiativeState;
  const commitInitiativeState = useCallback((next: InitiativeState) => {
    initiativeRef.current = next;
    setInitiativeState(next);
  }, []);
  const updateInitiativeState = useCallback((update: (current: InitiativeState) => InitiativeState) => {
    commitInitiativeState(update(initiativeRef.current));
  }, [commitInitiativeState]);
  const setInitiativeStateSafely = useCallback<Dispatch<SetStateAction<InitiativeState>>>((action) => {
    const next = typeof action === "function" ? action(initiativeRef.current) : action;
    commitInitiativeState(next);
  }, [commitInitiativeState]);
  const remoteHpProjectionRef = useRef<Map<string, number>>(new Map());
  remoteHpProjectionRef.current = new Map(initiativeState.entries.map((entry) => [entry.id, entry.hp]));
  const coreStatusSaveQueueRef = useRef(Promise.resolve());
  const saveRemoteCoreStatus = useCallback((entryId: string, hp: number) => {
    const entry = initiativeRef.current.entries.find((candidate) => candidate.id === entryId);
    if (!entry?.entityId || !entry.isCore) return;
    const nextHp = Math.max(0, Math.min(hp, entry.maxHp > 0 ? entry.maxHp : hp));
    const projected = remoteHpProjectionRef.current.get(entryId) ?? entry.hp;
    if ((projected <= 0) === (nextHp <= 0)) {
      remoteHpProjectionRef.current.set(entryId, nextHp);
      return;
    }
    remoteHpProjectionRef.current.set(entryId, nextHp);
    const status = nextHp <= 0 ? "dead" : "alive";
    coreStatusSaveQueueRef.current = coreStatusSaveQueueRef.current
      .then(() => setWikiEntityGlobalStatus(entry.entityId!, campaignId, status))
      .then(() => undefined)
      .catch((error: unknown) => {
        console.warn("[gm-remote] core_monster_status_sync_failed", error);
      });
  }, [campaignId]);
  const saveRemoteCoreStatusRef = useRef(saveRemoteCoreStatus);
  saveRemoteCoreStatusRef.current = saveRemoteCoreStatus;
  const publishRemoteCombatCommand = useCallback((next: RemoteCombatCommandSnapshot | null) => {
    remoteCombatCommandRef.current = next;
    setRemoteCombatCommand(next);
  }, []);

  const commandController = useMemo(() => createRemoteCombatCommandController({
    getContext: () => ({
      campaignId: campaignIdRef.current,
      sessionId: selectedSessionRef.current,
      remoteSessionPublicId: remoteSessionPublicIdRef.current,
      matchId: null,
    }),
    getState: () => initiativeRef.current,
    setState: (nextState) => {
      const previous = initiativeRef.current;
      for (const entry of nextState.entries) {
        const before = previous.entries.find((candidate) => candidate.id === entry.id);
        if (before && before.hp !== entry.hp) saveRemoteCoreStatusRef.current(entry.id, entry.hp);
      }
      commitInitiativeState(nextState);
    },
    onChange: publishRemoteCombatCommand,
    parseAi: async (text, state, stateSignature) => {
      const result = await import("@/lib/actions/combat-command-ai-actions").then(({ interpretCombatCommandWithAiAction }) =>
        interpretCombatCommandWithAiAction({
          campaignId: campaignIdRef.current,
          rawInput: text,
          combatants: state.entries.map((entry) => ({ id: entry.id, name: entry.name, type: entry.type, hp: entry.hp, maxHp: entry.maxHp })),
          stateSignatureAtCreation: stateSignature,
        }));
      return result;
    },
  }), [commitInitiativeState, publishRemoteCombatCommand]);
  useEffect(() => {
    commandController.onCampaignContextChange(campaignId);
  }, [campaignId, commandController]);
  useEffect(() => {
    commandController.onSessionContextChange(selectedSessionId);
  }, [selectedSessionId, commandController]);
  const onRemoteSessionContextChange = useCallback((remoteSessionPublicId: string | null) => {
    remoteSessionPublicIdRef.current = remoteSessionPublicId;
    commandController.onRemoteSessionContextChange(remoteSessionPublicId);
  }, [commandController]);
  const handleRemoteCombatCommandRequest = useCallback((payload: Record<string, unknown>, remoteSessionPublicId: string) => {
    void commandController.request(payload, remoteSessionPublicId);
  }, [commandController]);
  const handleRemoteCombatCommandConfirm = useCallback((payload: Record<string, unknown>, remoteSessionPublicId: string) => {
    commandController.confirm(payload, remoteSessionPublicId);
  }, [commandController]);
  const confirmRemoteCombatCommandOnPc = useCallback((operationIds?: string[]) => {
    commandController.confirmOnPc(operationIds);
  }, [commandController]);
  const initiativeRemoteHandlers = useMemo<InitiativeRemoteCommandHandlers>(() => ({
    nextTurn: () => {
      updateInitiativeState(transitionNextTurn);
      resetTurnTimer(campaignId, true);
    },
    prevTurn: () => {
      updateInitiativeState((state) => advanceRemoteTurn(state, -1));
      resetTurnTimer(campaignId, true);
    },
    toggleTurnTimer: () => toggleTurnTimer(campaignId),
    resetTurnTimer: () => resetTurnTimer(campaignId, false),
    resetRound: () => {
      updateInitiativeState((state) => ({ ...state, currentTurnIndex: 0, roundNumber: 1 }));
      resetTurnTimer(campaignId, false);
    },
    adjustDamage: (entryId, delta) => updateInitiativeState((state) => ({
      ...state,
      entries: state.entries.map((entry) => entry.id === entryId
        ? { ...entry, damageDealt: Math.max(0, (entry.damageDealt ?? 0) + delta) }
        : entry),
    })),
    adjustDamageTaken: (entryId, delta) => updateInitiativeState((state) => ({
      ...state,
      entries: state.entries.map((entry) => entry.id === entryId
        ? { ...entry, damageTaken: Math.max(0, (entry.damageTaken ?? 0) + delta) }
        : entry),
    })),
    adjustHp: (entryId, delta) => {
      const entry = initiativeRef.current.entries.find((candidate) => candidate.id === entryId);
      if (entry) {
        const currentHp = remoteHpProjectionRef.current.get(entryId) ?? entry.hp;
        const nextHp = Math.max(0, Math.min(currentHp + delta, entry.maxHp > 0 ? entry.maxHp : currentHp + delta));
        saveRemoteCoreStatus(entryId, nextHp);
      }
      updateInitiativeState((state) => adjustInitiativeHp(state, entryId, delta));
    },
    setHp: (entryId, hp) => {
      saveRemoteCoreStatus(entryId, hp);
      updateInitiativeState((state) => applyCombatHpMutation(state, { kind: "set_exact", targetId: entryId, exactHp: hp }));
    },
    setConditions: (entryId, conditions) => updateInitiativeState((state) =>
      setCanonicalConditionsOnEntry(state, entryId, conditions)
    ),
    toggleCondition: (entryId, condition) => updateInitiativeState((state) =>
      toggleCombatStatusOnEntry(state, entryId, condition)
    ),
    toggleMobileConcentration: (entryId) => updateInitiativeState((state) =>
      toggleMobileConcentrationOnEntry(state, entryId)
    ),
    addCombatant: (combatant) => updateInitiativeState((state) => {
      if (state.entries.some((entry) => entry.id === combatant.id)) return state;
      const activeId = state.entries[state.currentTurnIndex]?.id;
      const added: InitiativeEntry = {
        id: combatant.id,
        name: combatant.name,
        type: combatant.type,
        armorClass: combatant.ac,
        hp: combatant.hp,
        maxHp: combatant.maxHp,
        initiative: combatant.initiative,
        conditions: normalizeCombatConditions(combatant.conditions),
        isDead: combatant.hp <= 0,
        damageDealt: 0,
        damageTaken: 0,
      };
      const entries = [...state.entries, added].sort((a, b) => b.initiative - a.initiative);
      const activeIndex = entries.findIndex((entry) => entry.id === activeId);
      return sanitizeInitiativeTrackerState({
        ...state,
        entries,
        currentTurnIndex: activeIndex >= 0 ? activeIndex : state.currentTurnIndex,
      });
    }),
    removeCombatant: (entryId) => updateInitiativeState((state) =>
      removeCombatantFromState(state, entryId)
    ),
  }), [campaignId, saveRemoteCoreStatus, updateInitiativeState]);
  const [xpState, setXpState] = useState<LongSessionXpState>(emptyXpState);
  const [elapsedHours, setElapsedHoursState] = useState(0);
  const [calendarBaseDate, setCalendarBaseDateState] = useState<FantasyCalendarDate>(DEFAULT_FANTASY_BASE_DATE);
  const [calendarConfig, setCalendarConfigState] = useState<FantasyCalendarConfig>(DEFAULT_FANTASY_CALENDAR_CONFIG);
  const [economyDraft, setEconomyDraftState] = useState<LongSessionEconomyDraft>(emptyEconomyDraft);
  const [missionSelection, setMissionSelectionState] = useState<LongSessionMissionSelection>(emptyMissionSelection);
  const restoreRef = useRef(false);
  const [hydratedSessionId, setHydratedSessionId] = useState<string | null>(null);
  const [draftPaused, setDraftPaused] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const hydratedSessionRef = useRef<string | null>(null);
  const revisionRef = useRef<Record<string, number>>({});
  const lastSavedRef = useRef<Record<string,string>>({});
  const readableSessionsRef = useRef(new Set<string>());
  const saveQueueRef = useRef(Promise.resolve());
  const concludeFight = useCallback(() => {
    if (!selectedSessionId || hydratedSessionId !== selectedSessionId) { toast.error("Seleziona una sessione e attendi il caricamento della bozza."); return false; }
    const xp = monsterXp(initiativeRef.current.entries);
    commitInitiativeState(emptyInitiativeTrackerState());
    setXpState(current => ({...current, bankedMonsterXp: current.bankedMonsterXp + xp}));
    return true;
  }, [commitInitiativeState, selectedSessionId, hydratedSessionId]);

  const refreshSessions = useCallback(async () => {
    setLoadingSessions(true);
    const result = await getCampaignSessionsForGm(campaignId);
    setLoadingSessions(false);
    if (result.success && result.data) {
      setSessions(result.data);
    } else {
      setSessions([]);
    }
  }, [campaignId]);

  const refreshCharacters = useCallback(async () => {
    setLoadingCharacters(true);
    const result = await getCampaignCharacters(campaignId);
    setLoadingCharacters(false);
    if (result.success && result.data) {
      setAllCharacters(result.data);
    } else {
      setAllCharacters([]);
    }
  }, [campaignId]);

  useEffect(() => {
    void refreshSessions();
    void refreshCharacters();
  }, [refreshSessions, refreshCharacters]);

  useEffect(() => {
    let cancelled = false;
    getLongCampaignCalendarState(campaignId).then((result) => {
      if (cancelled || !result.success || !result.data) return;
      const normalizedConfig = normalizeFantasyCalendarConfig(result.data.config as never);
      setCalendarConfigState(normalizedConfig);
      setCalendarBaseDateState(normalizeFantasyCalendarDate(result.data.baseDate as never, normalizedConfig));
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  useEffect(() => {
    if (typeof window === "undefined" || restoreRef.current) return;
    restoreRef.current = true;
    if (initialSessionId) {
      setSelectedSessionIdState(initialSessionId);
      return;
    }
    try {
      const remembered = localStorage.getItem(lastSessionKey(campaignId));
      if (remembered) {
        setSelectedSessionIdState(remembered);
      }
    } catch {
      // ignore
    }
  }, [campaignId, initialSessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (selectedSessionId) {
        localStorage.setItem(lastSessionKey(campaignId), selectedSessionId);
      } else {
        localStorage.removeItem(lastSessionKey(campaignId));
      }
    } catch {
      // ignore
    }
  }, [campaignId, selectedSessionId]);

  useEffect(() => {
    if (selectedSessionId && hydratedSessionRef.current === selectedSessionId) return;
    setHydratedSessionId(null);
    if (!selectedSessionId) {
      setSignups([]);
      setAttendanceState({});
      commitInitiativeState(emptyInitiativeState);
      setXpState(emptyXpState);
      setElapsedHoursState(0);
      setEconomyDraftState(emptyEconomyDraft);
      setMissionSelectionState(emptyMissionSelection);
      return;
    }

    if (loadingCharacters) return;
    let cancelled = false;
    const localDraft = readStoredSessionState(campaignId, selectedSessionId);

    const loadSignups = async () => {
      setLoadingSignups(true);
      const [result, shared] = await Promise.all([getApprovedSignupsForSession(selectedSessionId), getSessionXpDraftAction(selectedSessionId)]);
      if (cancelled) return;
      setLoadingSignups(false);
      const nextSignups = result.success && result.data ? result.data : [];
      setSignups(nextSignups);

      const defaults = buildDefaultAttendance(nextSignups);
      const validCharacterIds = allCharacters
        .filter((character) =>
          nextSignups.some((signup) => signup.player_id === character.assigned_to)
        )
        .map((character) => character.id);
      revisionRef.current[selectedSessionId] = shared.success ? shared.data.revision : 0;
      if (shared.success && shared.data.status === "scheduled") readableSessionsRef.current.add(selectedSessionId);
      else readableSessionsRef.current.delete(selectedSessionId);
      const serverDraft = shared.success ? shared.data.draft : null;
      const stored = serverDraft
        ? (localDraft?.revision === revisionRef.current[selectedSessionId] ? localDraft : serverDraft.snapshot as unknown as StoredLongSessionState | undefined)
        : localDraft;
      const restoredXp = sanitizeXpState(stored?.xp, validCharacterIds);
      if (serverDraft && !serverDraft.snapshot) {
        for (const award of serverDraft.perPlayerXpAwards) {
          const character = allCharacters.find(c => c.assigned_to === award.playerId);
          if (character) restoredXp.perCharacter[character.id] = {plus:0,minus:0,customXp:award.xp};
        }
        if (serverDraft.perPlayerXpAwards.length === 0) {
          for (const id of validCharacterIds) restoredXp.perCharacter[id] = {plus:0,minus:0,customXp:serverDraft.xpGained};
        }
      }
      setDraftMessage(shared.success ? "Bozza condivisa caricata" : "Bozza locale: " + shared.error);
      lastSavedRef.current[selectedSessionId] = "";

      if (stored?.importedLegacy) {
        for (const character of allCharacters) {
          const old = stored.xp.perCharacter[character.id] as LongSessionXpCharacterState & {present?:boolean};
          if (character.assigned_to && old?.present === false) defaults[character.assigned_to] = "absent";
        }
        try {localStorage.setItem(`gm-screen-legacy-xp-imported-${campaignId}`,selectedSessionId);} catch { /* Keep existing copy. */ }
      }
      setAttendanceState({ ...defaults, ...(serverDraft?.attendance ?? {}), ...(stored?.attendance ?? {}) });
      commitInitiativeState(sanitizeInitiativeState(stored?.initiative));
      setXpState(restoredXp);
      setElapsedHoursState(
        stored?.elapsedHours != null && Number.isFinite(stored.elapsedHours)
          ? Math.max(0, Math.trunc(stored.elapsedHours))
          : 0
      );
      setEconomyDraftState(sanitizeEconomyDraft(stored?.economyDraft, validCharacterIds));
      setMissionSelectionState(sanitizeMissionSelection(stored?.missionSelection));
      hydratedSessionRef.current = selectedSessionId;
      setHydratedSessionId(selectedSessionId);
    };

    void loadSignups();
    return () => {
      cancelled = true;
    };
  }, [allCharacters, loadingCharacters, campaignId, selectedSessionId, commitInitiativeState]);

  const sessionCharacters = useMemo(() => {
    if (!signups.length) return [];
    const order = new Map(signups.map((signup, index) => [signup.player_id, index]));
    return allCharacters
      .filter((character) => character.assigned_to && order.has(character.assigned_to))
      .sort((a, b) => {
        const aOrder = order.get(a.assigned_to ?? "") ?? Number.MAX_SAFE_INTEGER;
        const bOrder = order.get(b.assigned_to ?? "") ?? Number.MAX_SAFE_INTEGER;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name, "it");
      });
  }, [allCharacters, signups]);

  const sessionCharactersMissingSheet = useMemo(() => {
    const assignedPlayerIds = new Set(
      sessionCharacters.map((character) => character.assigned_to).filter(Boolean) as string[]
    );
    return signups.filter((signup) => !assignedPlayerIds.has(signup.player_id));
  }, [sessionCharacters, signups]);

  useEffect(() => {
    if (!selectedSessionId || hydratedSessionId !== selectedSessionId || loadingCharacters) return;
    const validCharacterIds = sessionCharacters.map((character) => character.id);
    setXpState((current) => sanitizeXpState(current, validCharacterIds));
    setEconomyDraftState((current) => sanitizeEconomyDraft(current, validCharacterIds));
    setAttendanceState((current) => {
      const defaults = buildDefaultAttendance(signups);
      return { ...defaults, ...current };
    });
  }, [hydratedSessionId, loadingCharacters, selectedSessionId, sessionCharacters, signups]);

  useEffect(() => {
    if (!selectedSessionId || hydratedSessionId !== selectedSessionId || typeof window === "undefined") return;
    try {
      const payload: StoredLongSessionState = {
        revision: revisionRef.current[selectedSessionId],
        version: 2,
        attendance,
        initiative: initiativeState,
        xp: xpState,
        elapsedHours,
        economyDraft,
        missionSelection,
      };
      localStorage.setItem(sessionStateKey(campaignId, selectedSessionId), JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [hydratedSessionId, attendance, campaignId, economyDraft, elapsedHours, initiativeState, missionSelection, selectedSessionId, xpState]);

  const initiativeDraftState = useMemo(() => buildInitiativeDraftState({
    entries: initiativeState.entries,
    currentTurnIndex: initiativeState.currentTurnIndex,
    roundNumber: initiativeState.roundNumber,
    isTurnTimerRunning: initiativeState.isTurnTimerRunning,
    pendingConcentrationChecks: initiativeState.pendingConcentrationChecks,
    pendingSaveReminders: initiativeState.pendingSaveReminders,
    lastAdvanceUndoSnapshot: initiativeState.lastAdvanceUndoSnapshot,
    appliedProposalIds: initiativeState.appliedProposalIds,
    lastCommandUndoSnapshot: initiativeState.lastCommandUndoSnapshot,
  }), [initiativeState.entries, initiativeState.currentTurnIndex, initiativeState.roundNumber, initiativeState.isTurnTimerRunning, initiativeState.pendingConcentrationChecks, initiativeState.pendingSaveReminders, initiativeState.lastAdvanceUndoSnapshot, initiativeState.appliedProposalIds, initiativeState.lastCommandUndoSnapshot]);
  useEffect(() => {
    if (draftPaused || !selectedSessionId || hydratedSessionId !== selectedSessionId || !readableSessionsRef.current.has(selectedSessionId)) return;
    const computed = computeSessionXpAwards({characters:sessionCharacters, attendance, xpState, initiativeEntries:initiativeDraftState.entries});
    const draft = {attendance, xpGained:computed.basePerPlayer, perPlayerXpAwards:computed.awards,
      snapshot:{version:2,attendance,initiative:initiativeDraftState,xp:xpState,elapsedHours,economyDraft,missionSelection}};
    const signature = JSON.stringify(draft);
    if (signature === lastSavedRef.current[selectedSessionId]) return;
    const timer = setTimeout(() => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        setDraftMessage("Salvataggio bozza…");
        const result = await saveSessionXpDraftAction(selectedSessionId, draft, revisionRef.current[selectedSessionId]);
        if (result.success) {
          revisionRef.current[selectedSessionId] = result.data.revision;
          lastSavedRef.current[selectedSessionId] = signature;
          try {
            const raw = localStorage.getItem(sessionStateKey(campaignId,selectedSessionId));
            if (raw) localStorage.setItem(sessionStateKey(campaignId,selectedSessionId),JSON.stringify({...JSON.parse(raw),revision:result.data.revision}));
          } catch { /* Local recovery remains available when storage is full. */ }
          setDraftMessage("Bozza condivisa salvata");
        } else setDraftMessage("Bozza locale: " + result.error);
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [draftPaused,campaignId,selectedSessionId,hydratedSessionId,sessionCharacters,attendance,xpState,initiativeDraftState,elapsedHours,economyDraft,missionSelection]);

  const setSelectedSessionId = useCallback((sessionId: string | null) => {
    commandController.onSessionContextChange(sessionId);
    selectedSessionRef.current = sessionId;
    hydratedSessionRef.current = null;
    setHydratedSessionId(null);
    setSelectedSessionIdState(sessionId);
  }, [commandController]);

  const setAttendance = useCallback((playerId: string, value: LongSessionAttendanceStatus) => {
    setAttendanceState((current) => ({ ...current, [playerId]: value }));
  }, []);

  const setElapsedHours = useCallback((hours: number) => {
    setElapsedHoursState(Math.max(0, Math.trunc(hours)));
  }, []);

  const setCalendarBaseDate = useCallback(
    (date: FantasyCalendarDate) => {
      setCalendarBaseDateState(normalizeFantasyCalendarDate(date as never, calendarConfig));
    },
    [calendarConfig]
  );

  const setCalendarConfig = useCallback((config: FantasyCalendarConfig) => {
    const normalized = normalizeFantasyCalendarConfig(config as never);
    setCalendarConfigState(normalized);
    setCalendarBaseDateState((current) => normalizeFantasyCalendarDate(current as never, normalized));
  }, []);

  const saveCalendarSettings = useCallback(async () => {
    return saveLongCampaignCalendarBaseDate(campaignId, {
      baseDate: calendarBaseDate,
      months: calendarConfig.months,
    });
  }, [calendarBaseDate, calendarConfig.months, campaignId]);

  const setEconomyDraft = useCallback((draft: LongSessionEconomyDraft) => {
    setEconomyDraftState(draft);
  }, []);

  const setMissionSelection = useCallback((selection: LongSessionMissionSelection) => {
    setMissionSelectionState(sanitizeMissionSelection(selection));
  }, []);

  const clearSelectedSessionState = useCallback(() => {
    if (!selectedSessionId || typeof window === "undefined") return;
    try {
      localStorage.removeItem(sessionStateKey(campaignId, selectedSessionId));
    } catch {
      // ignore
    }
    setAttendanceState(buildDefaultAttendance(signups));
    commitInitiativeState(emptyInitiativeState);
    setXpState(emptyXpState);
    setElapsedHoursState(0);
    setEconomyDraftState(emptyEconomyDraft);
    setMissionSelectionState(emptyMissionSelection);
  }, [campaignId, selectedSessionId, signups, commitInitiativeState]);

  const updateCharacterCoinsLocally = useCallback(
    (
      characterId: string,
      next: { coins_gp: number; coins_sp: number; coins_cp: number }
    ) => {
      setAllCharacters((current) =>
        current.map((character) =>
          character.id === characterId
            ? {
                ...character,
                coins_gp: next.coins_gp,
                coins_sp: next.coins_sp,
                coins_cp: next.coins_cp,
              }
            : character
        )
      );
    },
    []
  );

  const selectedSessionLabel = useMemo(() => {
    const session = sessions.find((item) => item.id === selectedSessionId);
    return session ? formatSessionLabel(session) : undefined;
  }, [selectedSessionId, sessions]);

  const defaultAttendance = useMemo(() => buildDefaultAttendance(signups), [signups]);

  const hasUnsavedLocalState = useMemo(() => {
    if (!selectedSessionId) return false;
    const attendanceChanged = signups.some(
      (signup) => attendance[signup.player_id] !== defaultAttendance[signup.player_id]
    );
    const xpChanged =
      xpState.extraXpManual > 0 ||
      xpState.bankedMonsterXp > 0 ||
      Object.values(xpState.perCharacter).some(
        (value) => value.plus > 0 || value.minus > 0 || value.customXp != null
      );
    const hasEconomyDraft =
      economyDraft.payoutMissionId.length > 0 ||
      Object.values(economyDraft.payoutAlloc).some(
        (value) => value.gp.trim() || value.sp.trim() || value.cp.trim()
      );
    const hasMissionSelection = missionSelection.missionId.length > 0 || missionSelection.encounterId.length > 0;
    return (
      attendanceChanged ||
      initiativeState.entries.length > 0 ||
      xpChanged ||
      elapsedHours > 0 ||
      hasEconomyDraft ||
      hasMissionSelection
    );
  }, [
    attendance,
    defaultAttendance,
    economyDraft.payoutAlloc,
    economyDraft.payoutMissionId,
    elapsedHours,
    initiativeState.entries.length,
    missionSelection.encounterId,
    missionSelection.missionId,
    selectedSessionId,
    signups,
    xpState.extraXpManual,
    xpState.bankedMonsterXp,
    xpState.perCharacter,
  ]);

  const value = useMemo<LongSessionContextValue>(
    () => ({
      campaignId,
      setDraftPaused,
      concludeFight,
      draftMessage,
      sessions,
      loadingSessions,
      selectedSessionId,
      setSelectedSessionId,
      signups,
      loadingSignups,
      allCharacters,
      loadingCharacters,
      sessionCharacters,
      sessionCharactersMissingSheet,
      attendance,
      setAttendance,
      initiativeState,
      setInitiativeState: setInitiativeStateSafely,
      initiativeRemoteHandlers,
      remoteCombatCommand,
      handleRemoteCombatCommandRequest,
      handleRemoteCombatCommandConfirm,
      confirmRemoteCombatCommandOnPc,
      onRemoteSessionContextChange,
      xpState,
      setXpState,
      elapsedHours,
      setElapsedHours,
      calendarBaseDate,
      setCalendarBaseDate,
      calendarConfig,
      setCalendarConfig,
      saveCalendarSettings,
      economyDraft,
      setEconomyDraft,
      missionSelection,
      setMissionSelection,
      refreshSessions,
      refreshCharacters,
      updateCharacterCoinsLocally,
      clearSelectedSessionState,
      selectedSessionLabel,
      hasActiveSession: Boolean(selectedSessionId),
      hasUnsavedLocalState,
    }),
    [
      concludeFight,
      draftMessage,
      allCharacters,
      attendance,
      campaignId,
      clearSelectedSessionState,
      economyDraft,
      elapsedHours,
      calendarBaseDate,
      setCalendarBaseDate,
      calendarConfig,
      setCalendarConfig,
      saveCalendarSettings,
      hasUnsavedLocalState,
      initiativeState,
      initiativeRemoteHandlers,
      remoteCombatCommand,
      handleRemoteCombatCommandRequest,
      handleRemoteCombatCommandConfirm,
      confirmRemoteCombatCommandOnPc,
      onRemoteSessionContextChange,
      loadingCharacters,
      loadingSessions,
      loadingSignups,
      missionSelection,
      refreshCharacters,
      refreshSessions,
      selectedSessionId,
      selectedSessionLabel,
      sessionCharacters,
      sessionCharactersMissingSheet,
      sessions,
      setAttendance,
      setEconomyDraft,
      setElapsedHours,
      setInitiativeStateSafely,
      setMissionSelection,
      setSelectedSessionId,
      signups,
      updateCharacterCoinsLocally,
      xpState,
    ]
  );

  return <LongSessionContext.Provider value={value}>{children}</LongSessionContext.Provider>;
}

export function useGmScreenLongState() {
  const context = useContext(LongSessionContext);
  if (!context) {
    throw new Error("useGmScreenLongState must be used inside GmScreenLongStateProvider");
  }
  return context;
}

export function useGmScreenLongStateOptional() {
  return useContext(LongSessionContext);
}
