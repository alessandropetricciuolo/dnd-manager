"use client";

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import { GmRemoteCommandBridge } from "./gm-remote-command-bridge";
import { GmRemoteControlModal } from "./gm-remote-control-modal";
import type { GmRemoteSessionCreated } from "@/app/campaigns/gm-remote-actions";

type Props = {
  campaignId: string;
  forge: GmAudioForgeControls;
};

export function GmRemoteIntegration({ campaignId, forge }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [session, setSession] = useState<GmRemoteSessionCreated | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  return (
    <>
      <GmRemoteCommandBridge
        campaignId={campaignId}
        sessionPublicId={session?.publicId ?? null}
        forge={forge}
        onRealtimeStatus={setRealtimeConnected}
      />
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
        session={session}
        onSessionChange={setSession}
        realtimeConnected={realtimeConnected}
      />
    </>
  );
}
