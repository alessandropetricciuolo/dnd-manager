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
  const [mapMeta, setMapMeta] = useState<ExplorationMapRow>(mapRow);
  const imageUrl = getExplorationMapPublicUrl(mapMeta.image_path);
  const vm = useMemo(() => rowsToVm(regions), [regions]);

  useEffect(() => {
    setMapMeta(mapRow);
  }, [mapRow]);

  useEffect(() => {
    setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    async function reloadRegionsFromDb() {
      const { data } = await supabase
        .from("campaign_exploration_fow_regions")
        .select("*")
        .eq("map_id", mapMeta.id)
        .order("sort_order", { ascending: true });
      setRegions((data ?? []) as FowRegionRow[]);
    }
    const channel = supabase
      .channel(`fow-proj-${mapMeta.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_exploration_fow_regions",
          filter: `map_id=eq.${mapMeta.id}`,
        },
        (payload) => {
          void reloadRegionsFromDb();
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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_exploration_maps",
          filter: `id=eq.${mapMeta.id}`,
        },
        (payload) => {
          if (payload.new) {
            setMapMeta(payload.new as ExplorationMapRow);
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mapMeta.id]);

  return (
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-black">
      <div className="min-h-0 flex-1">
        <ExplorationMapStage
          imageUrl={imageUrl}
          imageAlt={
            mapMeta.floor_label?.trim()
              ? `Mappa: ${mapMeta.floor_label}`
              : "Mappa vista dall'alto"
          }
          regions={vm}
          mode="explore"
          draftPoints={[]}
          selectedRegionId={null}
          readOnly
          fillViewport
          showGrid={false}
        />
      </div>
    </div>
  );
}
