"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  createFowRegion,
  deleteExplorationMap,
  deleteFowRegion,
  resetMapFog,
  setFowRegionRevealed,
  updateExplorationMapMeta,
  updateFowRegionPolygon,
  type ExplorationMapRow,
  type FowRegionRow,
} from "@/app/campaigns/exploration-map-actions";
import { getExplorationMapPublicUrl } from "@/lib/exploration/exploration-storage";
import type { NormPoint } from "@/lib/exploration/fow-geometry";
import { parsePolygonJson } from "@/lib/exploration/fow-geometry";
import {
  ExplorationMapStage,
  hitTestRegion,
  type FowRegionVm,
} from "@/components/exploration/exploration-map-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Trash2, Undo2 } from "lucide-react";

/** Mappe grandi: limite sotto 4 MB per la route API; output WebP come CompressedImageUpload. */
const MAP_UPLOAD_COMPRESSION = {
  maxSizeMB: 3.5,
  maxWidthOrHeight: 8192,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

const GRID_CM = 2.5;
const DEFAULT_PX_PER_CM = 37.7952755906;
const GRID_STORAGE_KEY = "exploration-grid-device-v1";

type Props = {
  campaignId: string;
  initialMaps: ExplorationMapRow[];
  initialRegions: FowRegionRow[];
};

function rowsToVm(rows: FowRegionRow[]): FowRegionVm[] {
  return rows.map((r) => ({
    id: r.id,
    polygon: parsePolygonJson(r.polygon),
    is_revealed: r.is_revealed,
  }));
}

export function VistaDallAltoClient({ campaignId, initialMaps, initialRegions }: Props) {
  const [maps, setMaps] = useState(initialMaps);
  const [regions, setRegions] = useState<FowRegionRow[]>(initialRegions);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(initialMaps[0]?.id ?? null);
  const [mode, setMode] = useState<"prepare" | "explore">("prepare");
  const [draftPoints, setDraftPoints] = useState<NormPoint[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [undoReveal, setUndoReveal] = useState<{ id: string; was: boolean }[]>([]);
  const [mapUploading, setMapUploading] = useState(false);
  const [mapCompressing, setMapCompressing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(0.45);
  const [pxPerCm, setPxPerCm] = useState(DEFAULT_PX_PER_CM);
  const [measuredCm, setMeasuredCm] = useState("2.5");
  const [offsetXCells, setOffsetXCells] = useState(0);
  const [offsetYCells, setOffsetYCells] = useState(0);
  const [savingGridAlign, setSavingGridAlign] = useState(false);
  const [imageNatural, setImageNatural] = useState<{ w: number; h: number } | null>(null);
  const [calibMode, setCalibMode] = useState(false);
  const [calibTarget, setCalibTarget] = useState<"anchor" | "x" | "y">("anchor");
  const [calibAnchor, setCalibAnchor] = useState<NormPoint | null>(null);
  const [calibXPoint, setCalibXPoint] = useState<NormPoint | null>(null);
  const [calibYPoint, setCalibYPoint] = useState<NormPoint | null>(null);
  const [calibCellsX, setCalibCellsX] = useState("5");
  const [calibCellsY, setCalibCellsY] = useState("5");
  const [savingMapScale, setSavingMapScale] = useState(false);

  const selectedMap = maps.find((m) => m.id === selectedMapId) ?? null;
  const regionsForMap = useMemo(
    () => regions.filter((r) => r.map_id === selectedMapId),
    [regions, selectedMapId]
  );
  const vm = useMemo(() => rowsToVm(regionsForMap), [regionsForMap]);

  const imageUrl = selectedMap ? getExplorationMapPublicUrl(selectedMap.image_path) : "";
  const gridCellPx = pxPerCm * GRID_CM;
  const sourceGridCellPxX = selectedMap?.grid_source_cell_px ?? null;
  const sourceGridCellPxY = selectedMap?.grid_source_cell_px_y ?? null;

  const mapCalib = useMemo(() => {
    if (!imageNatural || !calibAnchor || !calibXPoint || !calibYPoint) return null;
    const cellsX = Number.parseFloat(calibCellsX.replace(",", "."));
    const cellsY = Number.parseFloat(calibCellsY.replace(",", "."));
    if (!Number.isFinite(cellsX) || cellsX <= 0 || !Number.isFinite(cellsY) || cellsY <= 0) return null;
    const dx = Math.abs((calibXPoint.x - calibAnchor.x) * imageNatural.w);
    const dy = Math.abs((calibYPoint.y - calibAnchor.y) * imageNatural.h);
    if (dx <= 0 || dy <= 0) return null;
    const sourceCellPxX = dx / cellsX;
    const sourceCellPxY = dy / cellsY;
    if (!Number.isFinite(sourceCellPxX) || !Number.isFinite(sourceCellPxY)) return null;

    const anchorPxX = calibAnchor.x * imageNatural.w;
    const anchorPxY = calibAnchor.y * imageNatural.h;
    const frac = (v: number) => ((v % 1) + 1) % 1;
    const offsetX = frac(anchorPxX / sourceCellPxX);
    const offsetY = frac(anchorPxY / sourceCellPxY);
    return { sourceCellPxX, sourceCellPxY, offsetX, offsetY };
  }, [imageNatural, calibAnchor, calibXPoint, calibYPoint, calibCellsX, calibCellsY]);

  useEffect(() => {
    setMaps(initialMaps);
  }, [initialMaps]);

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
      // ignore corrupted local settings
    }
  }, []);

  useEffect(() => {
    const x = Number(selectedMap?.grid_offset_x_cells ?? 0);
    const y = Number(selectedMap?.grid_offset_y_cells ?? 0);
    setOffsetXCells(Number.isFinite(x) ? x : 0);
    setOffsetYCells(Number.isFinite(y) ? y : 0);
    setCalibMode(false);
    setCalibTarget("anchor");
    setCalibAnchor(null);
    setCalibXPoint(null);
    setCalibYPoint(null);
  }, [selectedMap?.id, selectedMap?.grid_offset_x_cells, selectedMap?.grid_offset_y_cells]);

  useEffect(() => {
    try {
      localStorage.setItem(
        GRID_STORAGE_KEY,
        JSON.stringify({ showGrid, gridOpacity, pxPerCm })
      );
    } catch {
      // ignore storage failures
    }
  }, [showGrid, gridOpacity, pxPerCm]);

  useEffect(() => {
    if (!selectedMapId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`fow-${selectedMapId}`)
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
  }, [selectedMapId]);

  const refreshFromServer = useCallback(async () => {
    const { listExplorationMaps, listFowRegions } = await import("@/app/campaigns/exploration-map-actions");
    const m = await listExplorationMaps(campaignId);
    if (m?.success && m.data) setMaps(m.data);
    if (selectedMapId) {
      const r = await listFowRegions(selectedMapId);
      if (r?.success && r.data) {
        setRegions((prev) => {
          const other = prev.filter((x) => x.map_id !== selectedMapId);
          return [...other, ...r.data!];
        });
      }
    }
  }, [campaignId, selectedMapId]);

  async function handleAddMap(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[name="image"]');
    const rawFile = fileInput?.files?.[0];
    const imageUrlRaw =
      (form.elements.namedItem("image_url") as HTMLInputElement | null)?.value?.trim() ?? "";
    if (!rawFile && !imageUrlRaw) {
      toast.error("Seleziona un'immagine oppure incolla un link Google Drive.");
      return;
    }

    let fileToSend: File | null = null;
    if (rawFile) {
      if (!rawFile.type.startsWith("image/")) {
        toast.error("Seleziona un file immagine (JPG, PNG, WebP, GIF).");
        return;
      }
      setMapCompressing(true);
      try {
        const compressed = await imageCompression(rawFile, MAP_UPLOAD_COMPRESSION);
        fileToSend = new File(
          [compressed],
          rawFile.name.replace(/\.[^.]+$/i, ".webp"),
          { type: "image/webp" }
        );
      } catch (err) {
        console.error(err);
        toast.error("Compressione fallita. Prova con un'immagine più piccola o un altro formato.");
        return;
      } finally {
        setMapCompressing(false);
      }
    }

    const formData = new FormData();
    formData.append(
      "floor_label",
      (form.elements.namedItem("floor_label") as HTMLInputElement | null)?.value ?? ""
    );
    formData.append(
      "sort_order",
      (form.elements.namedItem("sort_order") as HTMLInputElement | null)?.value ?? "0"
    );
    formData.append(
      "grid_cell_meters",
      (form.elements.namedItem("grid_cell_meters") as HTMLInputElement | null)?.value ?? ""
    );
    if (fileToSend) {
      formData.append("image", fileToSend);
    }
    if (imageUrlRaw) {
      formData.append("image_url", imageUrlRaw);
    }

    setMapUploading(true);
    try {
      const httpRes = await fetch(
        `/api/campaigns/${encodeURIComponent(campaignId)}/exploration-maps`,
        { method: "POST", body: formData }
      );
      type CreateMapJson = { success: boolean; error?: string; data?: { id: string } };
      let res: CreateMapJson;
      try {
        res = (await httpRes.json()) as CreateMapJson;
      } catch {
        toast.error(
          httpRes.status === 413
            ? "Richiesta ancora troppo grande (max ~4 MB). Prova un’immagine a risoluzione minore."
            : `Errore dal server (${httpRes.status}). Riprova.`
        );
        return;
      }
      if (!res || typeof res.success !== "boolean") {
        toast.error("Risposta dal server non valida. Ricarica la pagina.");
        return;
      }
      if (!res.success) {
        toast.error(res.error ?? "Caricamento non riuscito.");
        return;
      }
      toast.success("Mappa caricata.");
      form.reset();
      await refreshFromServer();
      if (res.data?.id) setSelectedMapId(res.data.id);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Errore durante il caricamento. Riprova."
      );
    } finally {
      setMapUploading(false);
    }
  }

  async function handleDeleteMap() {
    if (!selectedMapId || !confirm("Eliminare questa mappa e tutti i poligoni?")) return;
    const res = await deleteExplorationMap(campaignId, selectedMapId);
    if (res?.success) {
      toast.success("Mappa eliminata.");
      const deleted = selectedMapId;
      const nextMaps = maps.filter((x) => x.id !== deleted);
      setRegions((p) => p.filter((r) => r.map_id !== deleted));
      setMaps(nextMaps);
      setSelectedMapId(nextMaps[0]?.id ?? null);
    } else toast.error(res?.error ?? "Errore");
  }

  const onCanvasClick = useCallback(
    (n: NormPoint) => {
      if (calibMode) return;
      setDraftPoints((d) => [...d, n]);
    },
    [calibMode]
  );

  async function closeDraftPolygon() {
    if (draftPoints.length < 3) {
      toast.error("Servono almeno 3 vertici.");
      return;
    }
    if (!selectedMapId) return;
    const res = await createFowRegion(campaignId, selectedMapId, draftPoints);
    if (res?.success) {
      toast.success("Poligono salvato.");
      setDraftPoints([]);
      await refreshFromServer();
    } else toast.error(res?.error ?? "Errore");
  }

  async function handleVertexDragEnd(regionId: string, vi: number, n: NormPoint) {
    const row = regionsForMap.find((r) => r.id === regionId);
    if (!row) return;
    const poly = parsePolygonJson(row.polygon);
    if (vi < 0 || vi >= poly.length) return;
    const next = [...poly];
    next[vi] = { x: Math.min(1, Math.max(0, n.x)), y: Math.min(1, Math.max(0, n.y)) };
    const res = await updateFowRegionPolygon(campaignId, regionId, next);
    if (res?.success) {
      setRegions((prev) =>
        prev.map((r) =>
          r.id === regionId ? { ...r, polygon: next as unknown as FowRegionRow["polygon"] } : r
        )
      );
    } else toast.error(res?.error ?? "Errore");
  }

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
        toast.error(res?.error ?? "Errore");
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

  async function handleDeleteRegion() {
    if (!selectedRegionId) return;
    const res = await deleteFowRegion(campaignId, selectedRegionId);
    if (res?.success) {
      toast.success("Poligono eliminato.");
      setRegions((p) => p.filter((r) => r.id !== selectedRegionId));
      setSelectedRegionId(null);
    } else toast.error(res?.error ?? "Errore");
  }

  async function handleResetFog() {
    if (!selectedMapId || !confirm("Oscurare di nuovo tutta la mappa (rivelazioni annullate)?")) return;
    const res = await resetMapFog(campaignId, selectedMapId);
    if (res?.success) {
      toast.success("Nebbie ripristinate.");
      setUndoReveal([]);
      setRegions((prev) =>
        prev.map((r) => (r.map_id === selectedMapId ? { ...r, is_revealed: false } : r))
      );
    } else toast.error(res?.error ?? "Errore");
  }

  function applyCalibrationFromMeasuredCm() {
    const measured = Number.parseFloat(measuredCm.replace(",", "."));
    if (!Number.isFinite(measured) || measured <= 0) {
      toast.error("Inserisci una misura valida in cm.");
      return;
    }
    const samplePx = 100;
    const nextPxPerCm = samplePx / measured;
    if (!Number.isFinite(nextPxPerCm) || nextPxPerCm < 5) {
      toast.error("Calibrazione non valida.");
      return;
    }
    setPxPerCm(nextPxPerCm);
    toast.success("Calibrazione dispositivo salvata in questo browser.");
  }

  async function saveGridOffset() {
    if (!selectedMapId) return;
    setSavingGridAlign(true);
    const res = await updateExplorationMapMeta(campaignId, selectedMapId, {
      grid_offset_x_cells: Number(offsetXCells.toFixed(4)),
      grid_offset_y_cells: Number(offsetYCells.toFixed(4)),
    });
    setSavingGridAlign(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore salvataggio offset.");
      return;
    }
    setMaps((prev) =>
      prev.map((m) =>
        m.id === selectedMapId
          ? {
              ...m,
              grid_offset_x_cells: Number(offsetXCells.toFixed(4)),
              grid_offset_y_cells: Number(offsetYCells.toFixed(4)),
            }
          : m
      )
    );
    toast.success("Offset griglia salvato.");
  }

  const onMapCalibrationClick = useCallback(
    (n: NormPoint) => {
      if (!calibMode) return;
      if (calibTarget === "anchor") setCalibAnchor(n);
      else if (calibTarget === "x") setCalibXPoint(n);
      else setCalibYPoint(n);
    },
    [calibMode, calibTarget]
  );

  async function saveMapGridScaleFromCalibration() {
    if (!selectedMapId || !mapCalib) {
      toast.error("Calibrazione mappa incompleta.");
      return;
    }
    setOffsetXCells(mapCalib.offsetX);
    setOffsetYCells(mapCalib.offsetY);
    setSavingMapScale(true);
    const res = await updateExplorationMapMeta(campaignId, selectedMapId, {
      grid_source_cell_px: Number(mapCalib.sourceCellPxX.toFixed(4)),
      grid_source_cell_px_y: Number(mapCalib.sourceCellPxY.toFixed(4)),
      grid_offset_x_cells: Number(mapCalib.offsetX.toFixed(4)),
      grid_offset_y_cells: Number(mapCalib.offsetY.toFixed(4)),
    });
    setSavingMapScale(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore salvataggio scala mappa.");
      return;
    }
    setMaps((prev) =>
      prev.map((m) =>
        m.id === selectedMapId
          ? {
              ...m,
              grid_source_cell_px: Number(mapCalib.sourceCellPxX.toFixed(4)),
              grid_source_cell_px_y: Number(mapCalib.sourceCellPxY.toFixed(4)),
              grid_offset_x_cells: Number(mapCalib.offsetX.toFixed(4)),
              grid_offset_y_cells: Number(mapCalib.offsetY.toFixed(4)),
            }
          : m
      )
    );
    setCalibMode(false);
    toast.success("Scala griglia mappa salvata.");
  }

  return (
    <div className="flex min-h-[70vh] flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label>Piano / mappa</Label>
          <Select
            value={selectedMapId ?? ""}
            onValueChange={(v) => {
              setSelectedMapId(v);
              setDraftPoints([]);
              setSelectedRegionId(null);
              setUndoReveal([]);
            }}
          >
            <SelectTrigger className="w-[280px] border-barber-gold/30 bg-barber-dark">
              <SelectValue placeholder="Seleziona una mappa" />
            </SelectTrigger>
            <SelectContent>
              {maps.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.floor_label?.trim() || "Senza nome"} (ord. {m.sort_order})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedMapId && (
          <Button variant="outline" size="sm" asChild className="border-barber-gold/40">
            <a
              href={`/campaigns/${campaignId}/gm-only/vista-dall-alto/proiezione?mapId=${selectedMapId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Apri proiezione (2° schermo)
            </a>
          </Button>
        )}
      </div>

      <section className="rounded-xl border border-barber-gold/25 bg-barber-dark/50 p-4">
        <h3 className="mb-3 text-sm font-semibold text-barber-gold">Nuova mappa</h3>
        <form
          encType="multipart/form-data"
          onSubmit={(e) => void handleAddMap(e)}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="space-y-1">
            <Label htmlFor="f-floor">Nome piano</Label>
            <Input
              id="f-floor"
              name="floor_label"
              placeholder="es. Piano terra"
              className="w-56 border-barber-gold/30 bg-barber-dark"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-sort">Ordine</Label>
            <Input
              id="f-sort"
              name="sort_order"
              type="number"
              defaultValue={maps.length}
              className="w-20 border-barber-gold/30 bg-barber-dark"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-grid">Quadretto (m), opz.</Label>
            <Input
              id="f-grid"
              name="grid_cell_meters"
              type="text"
              placeholder="1.5"
              className="w-24 border-barber-gold/30 bg-barber-dark"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-img">Immagine</Label>
            <Input
              id="f-img"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={mapCompressing || mapUploading}
              className="max-w-xs text-sm text-barber-paper"
            />
            <p className="max-w-md text-xs text-barber-paper/60">
              Facoltativo: se scegli un file verrà compresso in WebP e caricato su Telegram.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-img-url">Oppure link Google Drive</Label>
            <Input
              id="f-img-url"
              name="image_url"
              type="url"
              placeholder="https://drive.google.com/..."
              disabled={mapCompressing || mapUploading}
              className="w-80 border-barber-gold/30 bg-barber-dark text-sm"
            />
            <p className="max-w-md text-xs text-barber-paper/60">
              Accetta link Google Drive/Googleusercontent; l&apos;immagine viene importata su Telegram.
            </p>
          </div>
          <Button
            type="submit"
            disabled={mapCompressing || mapUploading}
            className="bg-barber-red hover:bg-barber-red/90"
          >
            {mapCompressing ? "Compressione…" : mapUploading ? "Caricamento…" : "Carica"}
          </Button>
        </form>
      </section>

      {selectedMap && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-barber-gold/20 pb-3">
            <div className="mr-4 flex gap-1 rounded-lg border border-barber-gold/30 p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "prepare" ? "default" : "ghost"}
                className={mode === "prepare" ? "bg-barber-gold text-barber-dark" : ""}
                onClick={() => setMode("prepare")}
              >
                Prepara poligoni
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "explore" ? "default" : "ghost"}
                className={mode === "explore" ? "bg-barber-gold text-barber-dark" : ""}
                onClick={() => {
                  setMode("explore");
                  setDraftPoints([]);
                }}
              >
                Esplora (rivela)
              </Button>
            </div>
            {mode === "prepare" && (
              <>
                <Button type="button" size="sm" variant="secondary" onClick={() => setDraftPoints([])}>
                  Annulla bozza
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void closeDraftPolygon()}
                  disabled={draftPoints.length < 3}
                >
                  Chiudi poligono
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleDeleteRegion} disabled={!selectedRegionId}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Elimina poligono
                </Button>
              </>
            )}
            {mode === "explore" && (
              <>
                <Button type="button" size="sm" variant="outline" onClick={undoRevealAction} disabled={undoReveal.length === 0}>
                  <Undo2 className="mr-1 h-4 w-4" />
                  Undo rivelazione
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void handleResetFog()}>
                  Reset nebbia
                </Button>
              </>
            )}
            <Button type="button" size="sm" variant="destructive" onClick={() => void handleDeleteMap()}>
              Elimina mappa
            </Button>
          </div>

          <div className="mb-2 flex flex-wrap gap-4 text-sm text-barber-paper/80">
            <span>
              Poligoni: {regionsForMap.length} · Bozza: {draftPoints.length} vertici
            </span>
            {selectedMap.grid_cell_meters != null && (
              <span>Scala: 1 quadretto ≈ {String(selectedMap.grid_cell_meters)} m</span>
            )}
            <span>Display: 1 quadretto fisico = {GRID_CM} cm</span>
          </div>

          <section className="mb-3 rounded-lg border border-barber-gold/20 bg-barber-dark/40 p-3">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-barber-gold">
              Griglia overlay
            </h4>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Mostra griglia
              </label>
              <div className="space-y-1">
                <Label className="text-xs">Opacità</Label>
                <Input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={gridOpacity}
                  onChange={(e) => setGridOpacity(Number.parseFloat(e.target.value))}
                  className="w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Offset X (celle)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={offsetXCells}
                  onChange={(e) => {
                    const n = Number.parseFloat(e.target.value || "0");
                    setOffsetXCells(Number.isFinite(n) ? n : 0);
                  }}
                  className="h-8 w-28 border-barber-gold/30 bg-barber-dark text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Offset Y (celle)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={offsetYCells}
                  onChange={(e) => {
                    const n = Number.parseFloat(e.target.value || "0");
                    setOffsetYCells(Number.isFinite(n) ? n : 0);
                  }}
                  className="h-8 w-28 border-barber-gold/30 bg-barber-dark text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={savingGridAlign}
                onClick={() => void saveGridOffset()}
              >
                {savingGridAlign ? "Salvataggio…" : "Salva offset mappa"}
              </Button>
            </div>
            <div className="mt-3 border-t border-barber-gold/10 pt-3">
              <p className="mb-2 text-xs text-barber-paper/70">
                Calibrazione mappa precisa: seleziona origine, un punto sulla stessa riga (asse X) e un punto sulla stessa colonna (asse Y).
              </p>
              <div className="mb-2 flex flex-wrap items-end gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant={calibMode ? "secondary" : "outline"}
                  onClick={() => {
                    setCalibMode((v) => !v);
                    setCalibTarget("anchor");
                    setCalibAnchor(null);
                    setCalibXPoint(null);
                    setCalibYPoint(null);
                  }}
                >
                  {calibMode ? "Disattiva calibrazione mappa" : "Attiva calibrazione mappa"}
                </Button>
                {calibMode && (
                  <Select value={calibTarget} onValueChange={(v) => setCalibTarget(v as "anchor" | "x" | "y")}>
                    <SelectTrigger className="h-8 w-[210px] border-barber-gold/30 bg-barber-dark text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anchor">Punto origine (incrocio)</SelectItem>
                      <SelectItem value="x">Punto asse X (stessa riga)</SelectItem>
                      <SelectItem value="y">Punto asse Y (stessa colonna)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Celle asse X</Label>
                  <Input
                    value={calibCellsX}
                    onChange={(e) => setCalibCellsX(e.target.value)}
                    className="h-8 w-24 border-barber-gold/30 bg-barber-dark text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Celle asse Y</Label>
                  <Input
                    value={calibCellsY}
                    onChange={(e) => setCalibCellsY(e.target.value)}
                    className="h-8 w-24 border-barber-gold/30 bg-barber-dark text-xs"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!mapCalib || savingMapScale}
                  onClick={() => void saveMapGridScaleFromCalibration()}
                >
                  {savingMapScale ? "Salvataggio…" : "Salva scala mappa"}
                </Button>
                <span className="text-xs text-barber-paper/65">
                  origine: {calibAnchor ? "ok" : "—"} · X: {calibXPoint ? "ok" : "—"} · Y: {calibYPoint ? "ok" : "—"}
                </span>
              </div>
              {(sourceGridCellPxX || sourceGridCellPxY) && (
                <p className="mb-2 text-xs text-barber-paper/60">
                  Scala mappa salvata: X {Number(sourceGridCellPxX ?? 0).toFixed(2)} px/cella · Y{" "}
                  {Number(sourceGridCellPxY ?? sourceGridCellPxX ?? 0).toFixed(2)} px/cella
                </p>
              )}
              {mapCalib && (
                <p className="mb-2 text-xs text-barber-paper/60">
                  Preview calibrazione: X {mapCalib.sourceCellPxX.toFixed(2)} px/cella · Y{" "}
                  {mapCalib.sourceCellPxY.toFixed(2)} px/cella · offset X {mapCalib.offsetX.toFixed(3)} ·
                  offset Y {mapCalib.offsetY.toFixed(3)}
                </p>
              )}
            </div>
            <div className="mt-3 border-t border-barber-gold/10 pt-3">
              <p className="mb-2 text-xs text-barber-paper/70">
                Calibrazione dispositivo/browser: misura con un righello la linea da 100 px e inserisci i cm reali.
              </p>
              <div className="mb-2 h-2 w-[100px] rounded bg-white/90" />
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Lunghezza misurata (cm)</Label>
                  <Input
                    value={measuredCm}
                    onChange={(e) => setMeasuredCm(e.target.value)}
                    className="h-8 w-28 border-barber-gold/30 bg-barber-dark text-xs"
                  />
                </div>
                <Button type="button" size="sm" variant="outline" onClick={applyCalibrationFromMeasuredCm}>
                  Calibra 2,5 cm
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPxPerCm(DEFAULT_PX_PER_CM)}
                >
                  Reset calibrazione
                </Button>
                <span className="text-xs text-barber-paper/65">
                  cella attuale: {gridCellPx.toFixed(1)} px
                </span>
              </div>
            </div>
          </section>

          {mode === "prepare" && (
            <div className="mb-2 flex flex-wrap gap-2">
              <Label className="text-xs text-barber-paper/60">Seleziona poligono (modifica vertici)</Label>
              <Select
                value={selectedRegionId ?? "__none__"}
                onValueChange={(v) => setSelectedRegionId(v === "__none__" ? null : v)}
              >
                <SelectTrigger className="h-8 w-[220px] border-barber-gold/30 bg-barber-dark text-xs">
                  <SelectValue placeholder="Nessuno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Nessuno —</SelectItem>
                  {regionsForMap.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Poligono {r.sort_order + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <ExplorationMapStage
            imageUrl={imageUrl}
            imageAlt={selectedMap.floor_label || "Mappa"}
            regions={vm}
            mode={mode}
            draftPoints={draftPoints}
            selectedRegionId={selectedRegionId}
            onImageSized={(w, h) => setImageNatural({ w, h })}
            onCanvasClick={onCanvasClick}
            onMapClick={onMapCalibrationClick}
            onVertexDragEnd={handleVertexDragEnd}
            onRevealClick={mode === "explore" ? onRevealClick : undefined}
            showGrid={showGrid}
            gridOpacity={gridOpacity}
            gridCellPx={gridCellPx}
            gridCellSourcePxX={selectedMap.grid_source_cell_px}
            gridCellSourcePxY={selectedMap.grid_source_cell_px_y}
            gridOffsetXCells={offsetXCells}
            gridOffsetYCells={offsetYCells}
          />

          <p className="text-xs text-barber-paper/55">
            Preparazione: clic per vertici, «Chiudi poligono» per salvare; seleziona un poligono e trascina i punti
            gialli. Esplora: clic su un&apos;area per mostrarla ai giocatori (proiezione si aggiorna in tempo reale).
          </p>
        </>
      )}

      {maps.length === 0 && (
        <p className="text-sm text-barber-paper/70">Carica almeno un&apos;immagine per iniziare.</p>
      )}
    </div>
  );
}
