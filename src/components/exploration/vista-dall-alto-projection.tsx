"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { getExplorationMapPublicUrl } from "@/lib/exploration/exploration-storage";
import type { ExplorationMapRow, FowRegionRow } from "@/app/campaigns/exploration-map-actions";
import { parsePolygonJson } from "@/lib/exploration/fow-geometry";
import { ExplorationMapStage, type FowRegionVm } from "@/components/exploration/exploration-map-stage";
import { FowRadialMenu, type FowRadialMenuItem } from "@/components/exploration/fow-radial-menu";
import { Maximize2, Minimize2 } from "lucide-react";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [radial, setRadial] = useState<{
    open: boolean;
    x: number;
    y: number;
    /** Evita chiusura immediata del backdrop sullo stesso gesto che apre il menu */
    guardUntil: number;
  }>({ open: false, x: 0, y: 0, guardUntil: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const imageUrl = getExplorationMapPublicUrl(mapMeta.image_path);
  const vm = useMemo(() => rowsToVm(regions), [regions]);
  const radialItems = useMemo<FowRadialMenuItem[]>(
    () => [
      { id: "fullscreen", label: isFullscreen ? "Esci da schermo intero" : "Schermo intero" },
      { id: "close", label: "Chiudi menu" },
    ],
    [isFullscreen]
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await (rootRef.current ?? document.documentElement).requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Ignora errori browser/gesture: la proiezione resta funzionante.
    }
  }, []);

  useEffect(() => {
    setMapMeta(mapRow);
  }, [mapRow]);

  useEffect(() => {
    setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    const onFsChange = () => {
      const active = document.fullscreenElement;
      setIsFullscreen(Boolean(active && active === (rootRef.current ?? document.documentElement)));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

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

  const openProjectionRadial = useCallback((clientX: number, clientY: number) => {
    const guardUntil = performance.now() + 240;
    setRadial({ open: true, x: clientX, y: clientY, guardUntil });
  }, []);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-black"
      onContextMenuCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openProjectionRadial(e.clientX, e.clientY);
      }}
    >
      <button
        type="button"
        onClick={() => void toggleFullscreen()}
        className="fixed right-4 top-4 z-[1250] inline-flex items-center gap-2 rounded-md border border-white/25 bg-black/55 px-3 py-2 text-xs text-white/90 backdrop-blur-sm transition hover:bg-black/75"
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        {isFullscreen ? "Esci fullscreen" : "Fullscreen"}
      </button>
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
      <FowRadialMenu
        open={radial.open}
        x={radial.x}
        y={radial.y}
        ariaLabel="Menu proiezione"
        items={radialItems}
        variant="default"
        openingGuardUntil={radial.open ? radial.guardUntil : 0}
        onClose={() => setRadial((prev) => ({ ...prev, open: false, guardUntil: 0 }))}
        onSelect={(item) => {
          if (item.id === "fullscreen") {
            void toggleFullscreen();
            return;
          }
          if (item.id === "close") {
            return;
          }
        }}
      />
    </div>
  );
}
