"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import { GmRemoteCommandBridge } from "./gm-remote-command-bridge";
import { GmRemoteControlModal } from "./gm-remote-control-modal";
import { GmRemoteInitiativePublisher } from "./gm-remote-initiative-publisher";
import { GmRemoteSfxPadPublisher } from "./gm-remote-sfx-pad-publisher";
import type { GmRemoteSessionCreated } from "@/app/campaigns/gm-remote-actions";
import type { InitiativeTrackerHandle, InitiativeTrackerState } from "./initiative-tracker";

type Props = {
  campaignId: string;
  forge?: GmAudioForgeControls | null;
  initiativeHandleRef?: RefObject<InitiativeTrackerHandle | null>;
  initiativeState?: InitiativeTrackerState | null;
  onSessionPublicIdChange?: (publicId: string | null) => void;
};

type BridgeSnapshot = { publicId: string; expiresAt: string };

function bridgeStorageKey(campaignId: string): string {
  return `gm-remote-bridge:${campaignId}`;
}

export function GmRemoteIntegration({
  campaignId,
  forge,
  initiativeHandleRef,
  initiativeState,
  onSessionPublicIdChange,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSession, setModalSession] = useState<GmRemoteSessionCreated | null>(null);
  const [bridgeSession, setBridgeSession] = useState<BridgeSnapshot | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => {
    const key = bridgeStorageKey(campaignId);
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const o = JSON.parse(raw) as unknown;
      if (typeof o !== "object" || o === null) return;
      const rec = o as Record<string, unknown>;
      const publicId = typeof rec.publicId === "string" ? rec.publicId.trim() : "";
      const expiresAt = typeof rec.expiresAt === "string" ? rec.expiresAt.trim() : "";
      if (!publicId || !expiresAt) return;
      if (Date.now() >= Date.parse(expiresAt)) {
        sessionStorage.removeItem(key);
        return;
      }
      setBridgeSession({ publicId, expiresAt });
    } catch {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  }, [campaignId]);

  const persistBridgeSnapshot = useCallback((snap: BridgeSnapshot | null) => {
    const key = bridgeStorageKey(campaignId);
    try {
      if (!snap) {
        sessionStorage.removeItem(key);
        return;
      }
      sessionStorage.setItem(key, JSON.stringify(snap));
    } catch {
      /* ignore */
    }
  }, [campaignId]);

  const onRemoteSessionChange = useCallback(
    (next: GmRemoteSessionCreated | null) => {
      setModalSession(next);
      if (next) {
        const snap = { publicId: next.publicId, expiresAt: next.expiresAt };
        setBridgeSession(snap);
        persistBridgeSnapshot(snap);
      } else {
        setBridgeSession(null);
        persistBridgeSnapshot(null);
      }
    },
    [persistBridgeSnapshot]
  );

  const sessionPublicId = modalSession?.publicId ?? bridgeSession?.publicId ?? null;

  useEffect(() => {
    onSessionPublicIdChange?.(sessionPublicId);
  }, [onSessionPublicIdChange, sessionPublicId]);

  return (
    <>
      <GmRemoteCommandBridge
        campaignId={campaignId}
        sessionPublicId={sessionPublicId}
        forge={forge}
        initiativeHandleRef={initiativeHandleRef}
        onRealtimeStatus={setRealtimeConnected}
      />
      {initiativeState && !onSessionPublicIdChange ? (
        <GmRemoteInitiativePublisher
          campaignId={campaignId}
          sessionPublicId={sessionPublicId}
          state={initiativeState}
        />
      ) : null}
      {forge ? (
        <GmRemoteSfxPadPublisher
          campaignId={campaignId}
          sessionPublicId={sessionPublicId}
          sfxPad={forge.library.sfxPad}
        />
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
        title="Telecomando"
        aria-label="Apri telecomando"
        onClick={() => setModalOpen(true)}
      >
        <Smartphone className="h-5 w-5" />
      </Button>
      <GmRemoteControlModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        campaignId={campaignId}
        session={modalSession}
        listeningRestored={!!bridgeSession && !modalSession}
        bridgeExpiresAt={bridgeSession?.expiresAt ?? null}
        onSessionChange={onRemoteSessionChange}
        realtimeConnected={realtimeConnected}
      />
    </>
  );
}
