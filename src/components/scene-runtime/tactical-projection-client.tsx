"use client";

import { useEffect, useState } from "react";
import { Stage } from "./scene-workspace-client";
import type { TacticalScene } from "@/lib/scene-runtime/types";
import { getTacticalPublicationAction } from "@/app/campaigns/tactical-scene-actions";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { classifyTacticalRealtimeStatus, type TacticalSyncStatus } from "@/lib/scene-runtime/r6-9";

export function TacticalProjectionClient({ sceneId, initialScene }: { sceneId: string; initialScene: TacticalScene }) {
  const [scene, setScene] = useState(initialScene);
  const [syncStatus, setSyncStatus] = useState<TacticalSyncStatus>("connecting");
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    const refreshSnapshot = async () => {
      // Realtime is only an invalidation hint: the publication/runtime row is
      // always re-read, so reconnect cannot leave a stale projection.
      const refreshed = await getTacticalPublicationAction(sceneId);
      if (!stopped && refreshed.success) setScene(refreshed.data);
    };
    const connect = () => {
      if (stopped) return;
      channel = supabase.channel(`tactical-publication-${sceneId}-${Date.now()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "tactical_scene_publications", filter: `scene_id=eq.${sceneId}` }, () => { void refreshSnapshot(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "tactical_scene_fow_runtime", filter: `scene_id=eq.${sceneId}` }, () => { void refreshSnapshot(); });
      void channel.subscribe((status) => {
        const next = classifyTacticalRealtimeStatus(status);
        if (!stopped) setSyncStatus(next.status);
        if (next.status === "connected") void refreshSnapshot();
        if (next.reloadRequired && !stopped) {
          void refreshSnapshot();
          retryTimer = setTimeout(() => { if (!stopped) { if (channel) void supabase.removeChannel(channel); connect(); } }, 1500);
        }
      });
    };
    void supabase.auth.getSession().then(({ data }) => {
      void supabase.realtime.setAuth(data.session?.access_token ?? "");
      connect();
    });
    return () => { stopped = true; if (retryTimer) clearTimeout(retryTimer); if (channel) void supabase.removeChannel(channel); };
  }, [sceneId]);
  return <div className="relative"><Stage scene={scene} projection /><span className="absolute right-4 top-4 rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-100" aria-live="polite">Live: {syncStatus}</span></div>;
}
