"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Layers, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  listExplorationMaps,
  listFowRegions,
  setAllMapRegionsRevealed,
  setFowRegionRevealed,
  type ExplorationMapRow,
  type FowRegionRow,
} from "@/app/campaigns/exploration-map-actions";
import { getSceneFloorGmNotesAction } from "@/app/campaigns/scene-document-actions";
import { getExplorationMapPublicUrl } from "@/lib/exploration/exploration-storage";
import { parsePolygonJson } from "@/lib/exploration/fow-geometry";
import { sceneGmNotesToOverlay, type GmNoteOverlayVm } from "@/lib/map-core/viewer";
import {
  ExplorationMapStage,
  hitTestRegion,
  type FowRegionVm,
} from "@/components/exploration/exploration-map-stage";
import { useExplorationMapGrid } from "@/components/exploration/use-exploration-map-grid";
import { mapSourceLabel } from "@/lib/exploration/exploration-map-grid";
import type { NormPoint } from "@/lib/exploration/fow-geometry";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
};

function rowsToVm(rows: FowRegionRow[]): FowRegionVm[] {
  return rows.map((r) => ({
    id: r.id,
    polygon: parsePolygonJson(r.polygon),
    is_revealed: r.is_revealed,
  }));
}

export function GmExplorationFowSheet({ open, onOpenChange, campaignId }: Props) {
  const [maps, setMaps] = useState<ExplorationMapRow[]>([]);
  const [regions, setRegions] = useState<FowRegionRow[]>([]);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [undoReveal, setUndoReveal] = useState<{ id: string; was: boolean }[]>([]);
  const [projectionMapId, setProjectionMapId] = useState<string | null>(null);
  const [gmNotesOverlay, setGmNotesOverlay] = useState<GmNoteOverlayVm[]>([]);

  const selectedMap = maps.find((m) => m.id === selectedMapId) ?? null;
  const gridOverlay = useExplorationMapGrid(selectedMap);
  const regionsForMap = useMemo(
    () => regions.filter((r) => r.map_id === selectedMapId),
    [regions, selectedMapId]
  );
  const vm = useMemo(() => rowsToVm(regionsForMap), [regionsForMap]);
  const imageUrl = selectedMap
    ? getExplorationMapPublicUrl(selectedMap.image_path, selectedMap.updated_at)
    : "";

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void listExplorationMaps(campaignId).then((res) => {
      if (res.success && res.data) {
        setMaps(res.data);
        setSelectedMapId((prev) => {
          if (prev && res.data!.some((m) => m.id === prev)) return prev;
          return res.data![0]?.id ?? null;
        });
      } else {
        setMaps([]);
        setSelectedMapId(null);
      }
      setLoading(false);
    });
  }, [open, campaignId]);

  useEffect(() => {
    if (!open || !selectedMapId) {
      setRegions([]);
      return;
    }
    void listFowRegions(selectedMapId).then((res) => {
      if (res.success && res.data) {
        setRegions((prev) => {
          const others = prev.filter((r) => r.map_id !== selectedMapId);
          return [...others, ...res.data!];
        });
      }
    });
  }, [open, selectedMapId]);

  useEffect(() => {
    if (
      !open ||
      !selectedMap ||
      selectedMap.source_type !== "generated_scene" ||
      !selectedMap.scene_document_id ||
      !selectedMap.scene_floor_id
    ) {
      setGmNotesOverlay([]);
      return;
    }
    let cancelled = false;
    void getSceneFloorGmNotesAction(
      campaignId,
      selectedMap.scene_document_id,
      selectedMap.scene_floor_id
    ).then((res) => {
      if (cancelled) return;
      if (!res.success || !res.data) {
        setGmNotesOverlay([]);
        return;
      }
      setGmNotesOverlay(
        sceneGmNotesToOverlay(res.data.notes, res.data.floorWidth, res.data.floorHeight)
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, campaignId, selectedMap]);

  useEffect(() => {
    if (!open || !selectedMapId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`gm-fow-sheet-${selectedMapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_exploration_fow_regions",
          filter: `map_id=eq.${selectedMapId}`,
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
  }, [open, selectedMapId]);

  const onRevealClick = useCallback(
    async (norm: NormPoint) => {
      const id = hitTestRegion(norm, vm);
      if (!id) return;
      const row = regionsForMap.find((r) => r.id === id);
      if (!row) return;
      const next = !row.is_revealed;
      setUndoReveal((u) => [...u, { id, was: row.is_revealed }]);
      const res = await setFowRegionRevealed(campaignId, id, next);
      if (!res?.success) {
        toast.error(res?.error ?? "Errore rivelazione.");
        setUndoReveal((u) => u.slice(0, -1));
        return;
      }
      setRegions((prev) => prev.map((r) => (r.id === id ? { ...r, is_revealed: next } : r)));
    },
    [campaignId, regionsForMap, vm]
  );

  function undoRevealAction() {
    const last = undoReveal[undoReveal.length - 1];
    if (!last) return;
    void (async () => {
      const res = await setFowRegionRevealed(campaignId, last.id, last.was);
      if (res?.success) {
        setUndoReveal((u) => u.slice(0, -1));
        setRegions((prev) =>
          prev.map((r) => (r.id === last.id ? { ...r, is_revealed: last.was } : r))
        );
      } else toast.error(res?.error ?? "Errore");
    })();
  }

  async function handleBulkReveal(isRevealed: boolean) {
    if (!selectedMapId) return;
    const res = await setAllMapRegionsRevealed(campaignId, selectedMapId, isRevealed);
    if (!res.success) {
      toast.error(res.error ?? "Errore aggiornamento zone.");
      return;
    }
    setRegions((prev) =>
      prev.map((r) => (r.map_id === selectedMapId ? { ...r, is_revealed: isRevealed } : r))
    );
    if (!isRevealed) setUndoReveal([]);
    toast.success(isRevealed ? "Tutte le zone rivelate." : "Tutte le zone oscurate.");
  }

  const openProjectionWindow = useCallback(() => {
    if (!selectedMapId) return;
    setProjectionMapId(selectedMapId);
    const url = `/campaigns/${campaignId}/gm-only/vista-dall-alto/proiezione?mapId=${selectedMapId}`;
    const width = Math.max(window.screen.availWidth || 1920, 1024);
    const height = Math.max(window.screen.availHeight || 1080, 720);
    const features = `width=${width},height=${height},left=0,top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=no`;
    const popup = window.open(url, "FowProjectionWindow", features);
    if (!popup) {
      toast.error("Impossibile aprire la proiezione. Consenti i popup per questo sito.");
      return;
    }
    try {
      popup.moveTo(0, 0);
      popup.resizeTo(width, height);
    } catch {
      // Browser may block moveTo/resizeTo.
    }
  }, [campaignId, selectedMapId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-3xl flex-col border-amber-600/30 bg-zinc-950 p-0 text-zinc-100 sm:max-w-3xl"
      >
        <SheetHeader className="shrink-0 space-y-2 border-b border-amber-600/20 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-left text-amber-200">
            <Layers className="h-5 w-5 text-amber-400" />
            Esplorazione e FOW
          </SheetTitle>
          <p className="text-left text-xs text-zinc-400">
            Clicca le zone per rivelare la nebbia. La proiezione sul secondo schermo si aggiorna in tempo reale.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 border-amber-600/40 text-xs text-amber-100 hover:bg-amber-600/10"
          >
            <Link href={`/campaigns/${campaignId}/gm-only/vista-dall-alto`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Configura mappe FoW (editor)
            </Link>
          </Button>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
          <div className="space-y-1">
            <Label className="text-xs text-amber-200/80">Piano / mappa</Label>
            <Select
              value={selectedMapId ?? ""}
              onValueChange={(v) => {
                setSelectedMapId(v);
                setUndoReveal([]);
              }}
              disabled={loading || maps.length === 0}
            >
              <SelectTrigger className="border-amber-600/30 bg-zinc-900 text-zinc-100">
                <SelectValue placeholder={loading ? "Caricamento…" : "Seleziona mappa"} />
              </SelectTrigger>
              <SelectContent className="border-amber-600/20 bg-zinc-900">
                {maps.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-zinc-200 focus:bg-amber-600/20">
                    {m.floor_label?.trim() || "Senza nome"} (ord. {m.sort_order})
                    {" · "}
                    {mapSourceLabel(m.source_type ?? "uploaded_image")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {maps.length === 0 && !loading ? (
            <p className="py-8 text-center text-xs text-zinc-500">
              Nessuna mappa FoW. Configurale dall&apos;editor Esplorazione e FOW.
            </p>
          ) : selectedMap ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-600/40 text-xs text-amber-100"
                  onClick={openProjectionWindow}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Proiezione 2° schermo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-600/40 text-xs"
                  onClick={undoRevealAction}
                  disabled={undoReveal.length === 0}
                >
                  <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                  Undo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-600/40 text-xs"
                  onClick={() => void handleBulkReveal(true)}
                >
                  Rivela tutto
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-amber-600/40 text-xs"
                  onClick={() => void handleBulkReveal(false)}
                >
                  Oscura tutto
                </Button>
                {projectionMapId === selectedMapId ? (
                  <span className="text-[10px] text-emerald-400/90">Proiezione attiva</span>
                ) : null}
                {gridOverlay.showGrid ? (
                  <span className="text-[10px] text-emerald-400/90">Griglia attiva</span>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-amber-600/25 bg-black">
                <div className="h-full min-h-[280px] md:min-h-[360px]">
                  <ExplorationMapStage
                    imageUrl={imageUrl}
                    imageAlt={selectedMap.floor_label?.trim() || "Esplorazione e FOW"}
                    regions={vm}
                    mode="explore"
                    draftPoints={[]}
                    selectedRegionId={null}
                    onImageSized={gridOverlay.onImageSized}
                    onRevealClick={(n) => void onRevealClick(n)}
                    readOnly
                    showGrid={gridOverlay.showGrid}
                    gridCellSourcePxX={gridOverlay.gridCellSourcePxX}
                    gridOffsetXCells={gridOverlay.gridOffsetXCells}
                    gridOffsetYCells={gridOverlay.gridOffsetYCells}
                    showGmNotes={gmNotesOverlay.length > 0}
                    gmNotes={gmNotesOverlay}
                  />
                </div>
              </div>

              <p className="text-[10px] text-zinc-500">
                {regionsForMap.length} zone FoW · clicca una zona per rivelare o oscurare
              </p>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
