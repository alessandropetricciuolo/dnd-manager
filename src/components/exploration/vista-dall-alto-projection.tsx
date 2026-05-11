"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { getExplorationMapPublicUrl } from "@/lib/exploration/exploration-storage";
import type { ExplorationMapRow, FowRegionRow } from "@/app/campaigns/exploration-map-actions";
import { parsePolygonJson } from "@/lib/exploration/fow-geometry";
import { ExplorationMapStage, type FowRegionVm } from "@/components/exploration/exploration-map-stage";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Maximize2, Menu, Minimize2 } from "lucide-react";

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
  const [projectionEffect, setProjectionEffect] = useState<"none" | "fuoco" | "veleno">("none");
  const rootRef = useRef<HTMLDivElement>(null);
  const imageUrl = getExplorationMapPublicUrl(mapMeta.image_path);
  const vm = useMemo(() => rowsToVm(regions), [regions]);

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

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 flex min-h-0 flex-col overflow-hidden bg-black"
    >
      <div className="fixed right-4 top-4 z-[60000] flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/25 bg-black/55 text-white/90 hover:bg-black/75 hover:text-white"
            >
              <Menu className="mr-2 h-4 w-4" />
              Effetti
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="min-w-[220px]">
            <DropdownMenuLabel>Effetti visivi proiezione</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={projectionEffect}
              onValueChange={(v) => {
                if (v === "none" || v === "fuoco" || v === "veleno") setProjectionEffect(v);
              }}
            >
              <DropdownMenuRadioItem value="none">Nessuno</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="fuoco">Fuoco (bagliore)</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="veleno">Veleno (bagliore)</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void toggleFullscreen()}
          className="border-white/25 bg-black/55 text-white/90 hover:bg-black/75 hover:text-white"
        >
          {isFullscreen ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
          {isFullscreen ? "Esci" : "Fullscreen"}
        </Button>
      </div>
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
          projectionEffect={projectionEffect}
        />
      </div>
    </div>
  );
}
