"use client";

import { useEffect, useRef, type RefObject } from "react";
import { publishGmRemoteInitiativeSnapshot } from "@/app/campaigns/gm-remote-actions";
import { saveTorneoMatchInitiativeAction } from "@/app/campaigns/torneo-live-actions";
import { loadTurnTimerState } from "@/lib/fight-mode/turn-timer";
import {
  initiativeRemoteSnapshotSignature,
  toInitiativeRemoteSnapshot,
  type InitiativeRemoteSnapshot,
} from "@/lib/gm-remote/initiative-commands";
import type { InitiativeTrackerHandle, InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import type { RemoteCombatCommandSnapshot } from "@/lib/gm-remote/combat-command-remote";

const HEARTBEAT_MS = 5_000;
const SAMPLE_MS = 400;
const MIN_PUBLISH_INTERVAL_MS = 500;

type Props = {
  campaignId: string;
  sessionPublicId: string | null;
  initiativeHandleRef?: RefObject<InitiativeTrackerHandle | null>;
  state?: InitiativeTrackerState;
  active?: boolean;
  sessionId?: string | null;
  sessionTitle?: string | null;
  torneoActiveMatch?: InitiativeRemoteSnapshot["activeMatch"];
  torneoMatchId?: string | null;
  combatCommand?: RemoteCombatCommandSnapshot | null;
};

/** Publishes the provider's authoritative tracker. Sampling catches rapid edits without
 * letting the change debounce starve; unchanged snapshots still carry a PC heartbeat. */
export function GmRemoteInitiativePublisher({
  campaignId,
  sessionPublicId,
  initiativeHandleRef,
  state,
  active = true,
  sessionId,
  sessionTitle,
  torneoActiveMatch,
  torneoMatchId,
  combatCommand,
}: Props) {
  const latestStateRef = useRef(state);
  latestStateRef.current = state;
  const latestMetadataRef = useRef({ sessionId, sessionTitle, torneoActiveMatch, torneoMatchId, combatCommand });
  latestMetadataRef.current = { sessionId, sessionTitle, torneoActiveMatch, torneoMatchId, combatCommand };

  useEffect(() => {
    if (!sessionPublicId || !active) return;

    let cancelled = false;
    let publishing = false;
    let pending = false;
    let lastSignature = "";
    let lastCommandSignature = "";
    let lastPublishedAt = 0;
    const publish = async () => {
      const current = initiativeHandleRef?.current?.getState() ?? latestStateRef.current;
      if (cancelled || !current) return;
      const metadata = latestMetadataRef.current;
      const timer = loadTurnTimerState(campaignId);
      const trackerState = metadata.torneoMatchId ? current : {
        ...current,
        isTurnTimerRunning: timer.isRunning,
        turnElapsedSeconds: timer.remainingSeconds,
      };
      const snapshot = toInitiativeRemoteSnapshot(
        trackerState,
        metadata.torneoActiveMatch ?? undefined,
        metadata.torneoMatchId ?? undefined,
        metadata.sessionId ?? null,
        metadata.sessionTitle ?? null,
        metadata.combatCommand ?? null
      );
      const signature = initiativeRemoteSnapshotSignature(snapshot);
      const commandSignature = JSON.stringify(snapshot.combatCommand ?? null);
      const changed = signature !== lastSignature || commandSignature !== lastCommandSignature;
      const heartbeatDue = Date.now() - lastPublishedAt >= HEARTBEAT_MS;
      if (!changed && !heartbeatDue) return;
      if (Date.now() - lastPublishedAt < MIN_PUBLISH_INTERVAL_MS) return;
      if (publishing) {
        pending = true;
        return;
      }
      publishing = true;
      try {
        const res = await publishGmRemoteInitiativeSnapshot(campaignId, sessionPublicId, snapshot);
        if (res.success) {
          lastSignature = signature;
          lastCommandSignature = commandSignature;
          lastPublishedAt = Date.now();
          if (metadata.torneoMatchId && changed) {
            await saveTorneoMatchInitiativeAction(campaignId, metadata.torneoMatchId, trackerState);
          }
        }
      } catch (error) {
        console.warn("[gm-remote] initiative_snapshot_publish_failed", error);
      } finally {
        publishing = false;
        if (pending && !cancelled) {
          pending = false;
          window.setTimeout(() => void publish(), MIN_PUBLISH_INTERVAL_MS);
        }
      }
    };

    void publish();
    const timer = window.setInterval(() => void publish(), SAMPLE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [
    active,
    campaignId,
    initiativeHandleRef,
    sessionPublicId,
  ]);

  return null;
}
