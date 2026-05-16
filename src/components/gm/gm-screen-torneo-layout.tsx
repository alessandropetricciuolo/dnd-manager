"use client";

import { useRef, useState } from "react";
import {
  InitiativeTracker,
  emptyInitiativeTrackerState,
  type InitiativeTrackerHandle,
  type InitiativeTrackerState,
} from "./initiative-tracker";
import { GmRemoteIntegration } from "./gm-remote-integration";
import { GmRemoteInitiativePublisher } from "./gm-remote-initiative-publisher";

type GmScreenTorneoLayoutProps = {
  campaignId: string;
  currentUserId: string;
  initialSessionId?: string | null;
};

/** GM Screen Torneo: initiative tracker a tutto schermo + telecomando. */
export function GmScreenTorneoLayout({ campaignId }: GmScreenTorneoLayoutProps) {
  const trackerRef = useRef<InitiativeTrackerHandle>(null);
  const [trackerState, setTrackerState] = useState<InitiativeTrackerState>(emptyInitiativeTrackerState());
  const [remoteSessionPublicId, setRemoteSessionPublicId] = useState<string | null>(null);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-600/20 px-4 py-2.5">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-amber-400">GM Screen · Torneo</h1>
          <p className="text-[11px] text-zinc-500">Initiative tracker · telecomando per turni e danni</p>
        </div>
        <GmRemoteIntegration
          campaignId={campaignId}
          initiativeHandleRef={trackerRef}
          initiativeState={trackerState}
          onSessionPublicIdChange={setRemoteSessionPublicId}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-hidden p-3 md:p-4">
        <InitiativeTracker
          ref={trackerRef}
          campaignId={campaignId}
          campaignType="torneo"
          onTrackerStateChange={setTrackerState}
        />
      </div>

      <GmRemoteInitiativePublisher
        campaignId={campaignId}
        sessionPublicId={remoteSessionPublicId}
        state={trackerState}
      />
    </div>
  );
}
