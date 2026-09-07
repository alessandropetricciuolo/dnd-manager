"use client";

import { useEffect, useState } from "react";
import { Stage } from "./scene-workspace-client";
import type { TacticalScene } from "@/lib/scene-runtime/types";
import { getTacticalPublicationAction } from "@/app/campaigns/tactical-scene-actions";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

export function TacticalProjectionClient({ sceneId, initialScene }: { sceneId: string; initialScene: TacticalScene }) {
  const [scene, setScene] = useState(initialScene);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(`tactical-publication-${sceneId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tactical_scene_publications", filter: `scene_id=eq.${sceneId}` }, async () => {
        const refreshed = await getTacticalPublicationAction(sceneId);
        if (refreshed.success) setScene(refreshed.data);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tactical_scene_fow_runtime", filter: `scene_id=eq.${sceneId}` }, async () => {
        // Re-read the publication after a runtime update; the draft is never queried here.
        const refreshed = await getTacticalPublicationAction(sceneId);
        if (refreshed.success) setScene(refreshed.data);
      });
    void channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [sceneId]);
  return <Stage scene={scene} projection />;
}
