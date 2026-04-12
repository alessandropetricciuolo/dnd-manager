"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { getExplorationMapPublicUrl } from "@/lib/exploration/exploration-storage";
import type { ExplorationMapRow, FowRegionRow } from "@/app/campaigns/exploration-map-actions";
import { parsePolygonJson } from "@/lib/exploration/fow-geometry";
import { ExplorationMapStage, type FowRegionVm } from "@/components/exploration/exploration-map-stage";

type Props = {
  mapRow: ExplorationMapRow;
  initialRegions: FowRegionRow[];
};

function rowsToVm(rows: FowRegionRow[]): FowRegionVm[] {
  return rows.map((r) => ({
    id: r.id,
    polygon: parsePolygonJson(r.polygon),
    is_revealed: r.is_revealed,
  }));
}

export function VistaDallAltoProjection({ mapRow, initialRegions }: Props) {
  const [regions, setRegions] = useState<FowRegionRow[]>(initialRegions);
  const imageUrl = getExplorationMapPublicUrl(mapRow.image_path);
  const vm = useMemo(() => rowsToVm(regions), [regions]);

  useEffect(() => {
    setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`fow-proj-${mapRow.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_exploration_fow_regions",
          filter: `map_id=eq.${mapRow.id}`,
        },
        (payload) => {
          setRegions((prev) => {
            if (payload.eventType === "INSERT" && payload.new) {
              const row = payload.new as FowRegionRow;
              if (prev.some((r) => r.id === row.id)) return prev;
              return [...prev, row];
            }
            if (payload.eventType === "UPDATE" && payload.new) {
              const row = payload.new as FowRegionRow;
              return prev.map((r) => (r.id === row.id ? row : r));
            }
            if (payload.eventType === "DELETE" && payload.old) {
              const id = (payload.old as { id: string }).id;
              return prev.filter((r) => r.id !== id);
            }
            return prev;
          });
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mapRow.id]);

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      <header className="shrink-0 border-b border-barber-gold/20 px-4 py-2 text-center text-sm text-barber-paper/80">
        {mapRow.floor_label?.trim() || "Vista dall'alto"} · solo proiezione
      </header>
      <div className="min-h-0 flex-1 overflow-hidden p-2">
        <ExplorationMapStage
          imageUrl={imageUrl}
          imageAlt=""
          regions={vm}
          mode="explore"
          draftPoints={[]}
          selectedRegionId={null}
          readOnly
        />
      </div>
    </div>
  );
}
