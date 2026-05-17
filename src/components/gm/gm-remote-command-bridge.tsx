"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { applyRemoteAudioCommand } from "@/lib/gm-remote/apply-audio-command";
import { applyInitiativeRemoteCommand, isInitiativeRemoteType } from "@/lib/gm-remote/initiative-commands";
import { isRecord } from "@/lib/gm-remote/protocol";
import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import type { InitiativeTrackerHandle } from "@/components/gm/initiative-tracker";
type Props = {
  campaignId: string;
  sessionPublicId: string | null;
  forge?: GmAudioForgeControls | null;
  initiativeHandleRef?: React.RefObject<InitiativeTrackerHandle | null>;
  onRealtimeStatus: (connected: boolean) => void;
};

function parsePayloadCell(raw: unknown): Record<string, unknown> {
  if (isRecord(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p: unknown = JSON.parse(raw);
      return isRecord(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function GmRemoteCommandBridge({
  campaignId,
  sessionPublicId,
  forge,
  initiativeHandleRef,
  onRealtimeStatus,
}: Props) {
  const seenRef = useRef(new Set<string>());
  const forgeRef = useRef(forge);
  forgeRef.current = forge;
  const initiativeRef = useRef(initiativeHandleRef);
  initiativeRef.current = initiativeHandleRef;
  useEffect(() => {
    seenRef.current.clear();
  }, [sessionPublicId]);

  useEffect(() => {
    if (!sessionPublicId || !campaignId) {
      onRealtimeStatus(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    const channelRef: { current: ReturnType<typeof supabase.channel> | null } = { current: null };

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;

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
            const pl = parsePayloadCell(row.payload);

            if (isInitiativeRemoteType(type)) {
              const handle = initiativeRef.current?.current;
              if (handle) {
                applyInitiativeRemoteCommand(handle, type, pl);
              }
              return;
            }

            if (forgeRef.current) {
              applyRemoteAudioCommand(forgeRef.current, type, pl);
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn("[gm-remote] subscribe", err.message);
          }
          if (status === "SUBSCRIBED") onRealtimeStatus(true);
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            onRealtimeStatus(false);
          }
        });

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      onRealtimeStatus(false);
      const ch = channelRef.current;
      channelRef.current = null;
      if (ch) void supabase.removeChannel(ch);
    };
  }, [campaignId, sessionPublicId, onRealtimeStatus]);

  return null;
}
