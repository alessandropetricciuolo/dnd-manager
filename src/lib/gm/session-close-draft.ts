"use client";

import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";
import {
  computeSessionXpAwards,
  type StoredXpState,
} from "@/components/gm/player-session-tracker";

const LONG_SESSION_PREFIX = "gm-screen-long-session-";
const LEGACY_XP_PREFIX = "gm-screen-session-xp-";
const LEGACY_INITIATIVE_PREFIX = "gm-screen-initiative-";

export type SessionCloseDraft = {
  attendance?: Record<string, "attended" | "absent">;
  xpState?: StoredXpState;
  elapsedHours?: number;
  initiativeEntries?: InitiativeEntry[];
};

export function readSessionCloseDraft(
  campaignId: string,
  sessionId: string
): SessionCloseDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(`${LONG_SESSION_PREFIX}${campaignId}-${sessionId}`);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        attendance?: Record<string, "attended" | "absent">;
        xp?: StoredXpState;
        elapsedHours?: number;
        initiative?: { entries?: InitiativeEntry[] };
      };
      return {
        attendance: parsed.attendance,
        xpState: parsed.xp,
        elapsedHours:
          parsed.elapsedHours != null && Number.isFinite(parsed.elapsedHours)
            ? Math.max(0, Math.trunc(parsed.elapsedHours))
            : undefined,
        initiativeEntries: parsed.initiative?.entries,
      };
    }
  } catch {
    // ignore malformed storage
  }

  try {
    const legacyXpRaw = localStorage.getItem(`${LEGACY_XP_PREFIX}${campaignId}`);
    const legacyInitRaw = localStorage.getItem(`${LEGACY_INITIATIVE_PREFIX}${campaignId}`);
    if (!legacyXpRaw && !legacyInitRaw) return null;

    let xpState: StoredXpState | undefined;
    if (legacyXpRaw) {
      const parsed = JSON.parse(legacyXpRaw) as StoredXpState;
      if (parsed && typeof parsed === "object") xpState = parsed;
    }

    let initiativeEntries: InitiativeEntry[] | undefined;
    if (legacyInitRaw) {
      const parsed = JSON.parse(legacyInitRaw) as { entries?: InitiativeEntry[] };
      if (Array.isArray(parsed?.entries)) initiativeEntries = parsed.entries;
    }

    return { xpState, initiativeEntries };
  } catch {
    return null;
  }
}

export function computeSessionCloseXpFromDraft(
  draft: SessionCloseDraft | null,
  characters: CampaignCharacterRow[]
): {
  initialXpGained?: number;
  perPlayerXpAwards?: { playerId: string; xp: number }[];
  initialAttendance?: Record<string, "attended" | "absent">;
  initialElapsedHours?: number;
} {
  if (!draft?.xpState) {
    return {
      initialAttendance: draft?.attendance,
      initialElapsedHours: draft?.elapsedHours,
    };
  }

  const awards = computeSessionXpAwards({
    characters,
    attendance: draft.attendance,
    xpState: draft.xpState,
    initiativeEntries: draft.initiativeEntries,
  });

  return {
    initialXpGained: awards.basePerPlayer,
    perPlayerXpAwards: awards.awards,
    initialAttendance: draft.attendance,
    initialElapsedHours: draft.elapsedHours,
  };
}
