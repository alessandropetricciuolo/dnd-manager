"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { getExplorationMapPublicUrl } from "@/lib/exploration/exploration-storage";
import type { ExplorationMapRow, FowRegionRow } from "@/app/campaigns/exploration-map-actions";
import { parsePolygonJson } from "@/lib/exploration/fow-geometry";
import { ExplorationMapStage, type FowRegionVm } from "@/components/exploration/exploration-map-stage";

const GRID_CM = 2.5;
const DEFAULT_PX_PER_CM = 37.7952755906;
const GRID_STORAGE_KEY = "exploration-grid-device-v1";

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
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.45);
  const [pxPerCm, setPxPerCm] = useState(DEFAULT_PX_PER_CM);
  const imageUrl = getExplorationMapPublicUrl(mapRow.image_path);
  const vm = useMemo(() => rowsToVm(regions), [regions]);
  const gridCellPx = pxPerCm * GRID_CM;

  useEffect(() => {
    setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GRID_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { showGrid?: boolean; gridOpacity?: number; pxPerCm?: number };
      if (typeof parsed.showGrid === "boolean") setShowGrid(parsed.showGrid);
      if (typeof parsed.gridOpacity === "number") setGridOpacity(Math.min(1, Math.max(0, parsed.gridOpacity)));
      if (typeof parsed.pxPerCm === "number" && Number.isFinite(parsed.pxPerCm) && parsed.pxPerCm > 2) {
        setPxPerCm(parsed.pxPerCm);
      }
    } catch {
      // ignore
    }
  }, []);

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
    <div className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-black">
      <div className="min-h-0 flex-1">
        <ExplorationMapStage
          imageUrl={imageUrl}
          imageAlt={
            mapRow.floor_label?.trim()
              ? `Mappa: ${mapRow.floor_label}`
              : "Mappa vista dall'alto"
          }
          regions={vm}
          mode="explore"
          draftPoints={[]}
          selectedRegionId={null}
          readOnly
          fillViewport
          showGrid={showGrid}
          gridOpacity={gridOpacity}
          gridCellPx={gridCellPx}
          gridOffsetXCells={Number(mapRow.grid_offset_x_cells ?? 0)}
          gridOffsetYCells={Number(mapRow.grid_offset_y_cells ?? 0)}
        />
      </div>
    </div>
  );
}
