"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getCampaignCharacters, type CampaignCharacterRow } from "@/app/campaigns/character-actions";
import {
  getApprovedSignupsForSession,
  getLongCampaignCalendarState,
  saveLongCampaignCalendarBaseDate,
} from "@/app/campaigns/actions";
import { getCampaignSessionsForGm, type CampaignSessionOption } from "@/app/campaigns/gm-actions";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";
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

type InitiativeState = {
  entries: InitiativeEntry[];
  currentTurnIndex: number;
};

type StoredLongSessionState = {
  version: 2;
  attendance: Record<string, LongSessionAttendanceStatus>;
  initiative: InitiativeState;
  xp: LongSessionXpState;
  elapsedHours: number;
  economyDraft: LongSessionEconomyDraft;
  missionSelection: LongSessionMissionSelection;
};

type LongSessionContextValue = {
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
  setInitiativeState: (state: InitiativeState) => void;
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

const emptyInitiativeState: InitiativeState = {
  entries: [],
  currentTurnIndex: 0,
};

const emptyXpState: LongSessionXpState = {
  version: 2,
  extraXpManual: 0,
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
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
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
    perCharacter,
  };
}

function sanitizeInitiativeState(input: InitiativeState | null | undefined): InitiativeState {
  if (!input || !Array.isArray(input.entries)) return emptyInitiativeState;
  return {
    entries: input.entries,
    currentTurnIndex:
      input.entries.length > 0
        ? Math.max(0, Math.min(Math.trunc(input.currentTurnIndex ?? 0), input.entries.length - 1))
        : 0,
  };
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
  const [xpState, setXpState] = useState<LongSessionXpState>(emptyXpState);
  const [elapsedHours, setElapsedHoursState] = useState(0);
  const [calendarBaseDate, setCalendarBaseDateState] = useState<FantasyCalendarDate>(DEFAULT_FANTASY_BASE_DATE);
  const [calendarConfig, setCalendarConfigState] = useState<FantasyCalendarConfig>(DEFAULT_FANTASY_CALENDAR_CONFIG);
  const [economyDraft, setEconomyDraftState] = useState<LongSessionEconomyDraft>(emptyEconomyDraft);
  const [missionSelection, setMissionSelectionState] = useState<LongSessionMissionSelection>(emptyMissionSelection);
  const restoreRef = useRef(false);

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
    if (!selectedSessionId) {
      setSignups([]);
      setAttendanceState({});
      setInitiativeState(emptyInitiativeState);
      setXpState(emptyXpState);
      setElapsedHoursState(0);
      setEconomyDraftState(emptyEconomyDraft);
      setMissionSelectionState(emptyMissionSelection);
      return;
    }

    let cancelled = false;

    const loadSignups = async () => {
      setLoadingSignups(true);
      const result = await getApprovedSignupsForSession(selectedSessionId);
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
      const stored = readStoredSessionState(campaignId, selectedSessionId);

      setAttendanceState({ ...defaults, ...(stored?.attendance ?? {}) });
      setInitiativeState(sanitizeInitiativeState(stored?.initiative));
      setXpState(sanitizeXpState(stored?.xp, validCharacterIds));
      setElapsedHoursState(
        stored?.elapsedHours != null && Number.isFinite(stored.elapsedHours)
          ? Math.max(0, Math.trunc(stored.elapsedHours))
          : 0
      );
      setEconomyDraftState(sanitizeEconomyDraft(stored?.economyDraft, validCharacterIds));
      setMissionSelectionState(sanitizeMissionSelection(stored?.missionSelection));
    };

    void loadSignups();
    return () => {
      cancelled = true;
    };
  }, [allCharacters, campaignId, selectedSessionId]);

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
    if (!selectedSessionId) return;
    const validCharacterIds = sessionCharacters.map((character) => character.id);
    setXpState((current) => sanitizeXpState(current, validCharacterIds));
    setEconomyDraftState((current) => sanitizeEconomyDraft(current, validCharacterIds));
    setAttendanceState((current) => {
      const defaults = buildDefaultAttendance(signups);
      return { ...defaults, ...current };
    });
  }, [selectedSessionId, sessionCharacters, signups]);

  useEffect(() => {
    if (!selectedSessionId || typeof window === "undefined") return;
    try {
      const payload: StoredLongSessionState = {
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
  }, [attendance, campaignId, economyDraft, elapsedHours, initiativeState, missionSelection, selectedSessionId, xpState]);

  const setSelectedSessionId = useCallback((sessionId: string | null) => {
    setSelectedSessionIdState(sessionId);
  }, []);

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
    setInitiativeState(emptyInitiativeState);
    setXpState(emptyXpState);
    setElapsedHoursState(0);
    setEconomyDraftState(emptyEconomyDraft);
    setMissionSelectionState(emptyMissionSelection);
  }, [campaignId, selectedSessionId, signups]);

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
    xpState.perCharacter,
  ]);

  const value = useMemo<LongSessionContextValue>(
    () => ({
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
      setInitiativeState,
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
      allCharacters,
      attendance,
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
      setInitiativeState,
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
