"use client";

import { useEffect, useRef } from "react";
import { publishGmRemoteInitiativeSnapshot } from "@/app/campaigns/gm-remote-actions";
import { saveTorneoMatchInitiativeAction } from "@/app/campaigns/torneo-live-actions";
import {
  toInitiativeRemoteSnapshot,
  type InitiativeRemoteSnapshot,
} from "@/lib/gm-remote/initiative-commands";
import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";

type Props = {
  campaignId: string;
  sessionPublicId: string | null;
  state: InitiativeTrackerState;
  torneoActiveMatch?: InitiativeRemoteSnapshot["activeMatch"];
  torneoMatchId?: string | null;
};

export function GmRemoteInitiativePublisher({
  campaignId,
  sessionPublicId,
  state,
  torneoActiveMatch,
  torneoMatchId,
}: Props) {
  const lastPublishedRef = useRef<string>("");

  useEffect(() => {
    if (!sessionPublicId || state.entries.length === 0) return;

    const snapshot: InitiativeRemoteSnapshot = toInitiativeRemoteSnapshot(
      state,
      torneoActiveMatch ?? undefined,
      torneoMatchId ?? undefined
    );
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastPublishedRef.current) return;

    const timer = window.setTimeout(() => {
      void publishGmRemoteInitiativeSnapshot(campaignId, sessionPublicId, snapshot).then((res) => {
        if (res.success) {
          lastPublishedRef.current = serialized;
          if (torneoMatchId) {
            void saveTorneoMatchInitiativeAction(campaignId, torneoMatchId, state);
          }
        }
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [campaignId, sessionPublicId, state, torneoActiveMatch, torneoMatchId]);

  return null;
}
