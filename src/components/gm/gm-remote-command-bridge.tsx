"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { applyRemoteAudioCommand } from "@/lib/gm-remote/apply-audio-command";
import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import { isRecord } from "@/lib/gm-remote/protocol";

type Props = {
  campaignId: string;
  sessionPublicId: string | null;
  forge: GmAudioForgeControls;
  onRealtimeStatus: (connected: boolean) => void;
};

export function GmRemoteCommandBridge({ campaignId, sessionPublicId, forge, onRealtimeStatus }: Props) {
  const seenRef = useRef(new Set<string>());
  const forgeRef = useRef(forge);
  forgeRef.current = forge;

  useEffect(() => {
    seenRef.current.clear();
  }, [sessionPublicId]);

  useEffect(() => {
    if (!sessionPublicId || !campaignId) {
      onRealtimeStatus(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`gm-remote-${campaignId}-${sessionPublicId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gm_remote_commands",
          filter: `session_public_id=eq.${sessionPublicId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const commandId = typeof row.command_id === "string" ? row.command_id : null;
          const type = typeof row.type === "string" ? row.type : null;
          if (!commandId || !type) return;
          if (seenRef.current.has(commandId)) return;
          seenRef.current.add(commandId);
          if (seenRef.current.size > 500) {
            seenRef.current = new Set([...seenRef.current].slice(-300));
          }
          const pl = isRecord(row.payload) ? row.payload : {};
          applyRemoteAudioCommand(forgeRef.current, type, pl);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onRealtimeStatus(true);
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          onRealtimeStatus(false);
        }
      });

    return () => {
      onRealtimeStatus(false);
      void supabase.removeChannel(channel);
    };
  }, [campaignId, sessionPublicId, onRealtimeStatus]);

  return null;
}
