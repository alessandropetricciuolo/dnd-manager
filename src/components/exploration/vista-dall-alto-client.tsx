"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  createFowRegion,
  deleteExplorationMap,
  deleteFowRegion,
  importExplorationScene,
  resetMapFog,
  setAllMapRegionsRevealed,
  setFowRegionRevealed,
  updateExplorationMapMeta,
  updateFowRegionPolygon,
  type ExplorationMapRow,
  type FowRegionRow,
} from "@/app/campaigns/exploration-map-actions";
import { getSceneFloorGmNotesAction } from "@/app/campaigns/scene-document-actions";
import { getExplorationMapPublicUrl } from "@/lib/exploration/exploration-storage";
import type { NormPoint } from "@/lib/exploration/fow-geometry";
import { parsePolygonJson } from "@/lib/exploration/fow-geometry";
import { sceneGmNotesToOverlay, type GmNoteOverlayVm } from "@/lib/map-core/viewer";
import {
  ExplorationMapStage,
  hitTestRegion,
  type FowRegionVm,
} from "@/components/exploration/exploration-map-stage";
import { useExplorationMapGrid } from "@/components/exploration/use-exploration-map-grid";
import { mapSourceLabel } from "@/lib/exploration/exploration-map-grid";
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
import { ExternalLink, ChevronDown, Map, Pencil, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Mappe FoW: sotto 4 MB per la route API.
 * Telegram sendPhoto: w+h ≤ 10000 e rapporto ≤ 20:1 — 8192px su entrambi i lati supera il limite.
 */
const MAP_UPLOAD_COMPRESSION = {
  maxSizeMB: 3.5,
  maxWidthOrHeight: 4096,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

const FIELD_CLASS = "border-white/10 bg-barber-dark/50 ring-1 ring-white/5";

function ToolDetails({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06]"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-barber-paper [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-barber-paper/40 transition-transform group-open:rotate-180" />
      </summary>
      {description ? (
        <p className="px-3 pb-1 text-xs leading-relaxed text-barber-paper/55">{description}</p>
      ) : null}
      <div className="space-y-3 border-t border-white/[0.06] px-3 py-3">{children}</div>
    </details>
  );
}

type Props = {
  campaignId: string;
  initialMaps: ExplorationMapRow[];
  initialRegions: FowRegionRow[];
  missionOptions?: { id: string; title: string }[];
};

function rowsToVm(rows: FowRegionRow[]): FowRegionVm[] {
  return rows.map((r) => ({
    id: r.id,
    polygon: parsePolygonJson(r.polygon),
    is_revealed: r.is_revealed,
  }));
}

export function VistaDallAltoClient({
  campaignId,
  initialMaps,
  initialRegions,
  missionOptions = [],
}: Props) {
  const [maps, setMaps] = useState(initialMaps);
  const [regions, setRegions] = useState<FowRegionRow[]>(initialRegions);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(initialMaps[0]?.id ?? null);
  const [mode, setMode] = useState<"prepare" | "explore">("prepare");
  const [draftPoints, setDraftPoints] = useState<NormPoint[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [undoReveal, setUndoReveal] = useState<{ id: string; was: boolean }[]>([]);
  const [mapUploading, setMapUploading] = useState(false);
  const [mapCompressing, setMapCompressing] = useState(false);
  const [importText, setImportText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [newMapMissionId, setNewMapMissionId] = useState<string>("none");
  const [selectedMapMissionId, setSelectedMapMissionId] = useState<string>("none");
  const [savingMapMission, setSavingMapMission] = useState(false);
  const [gridCellsW, setGridCellsW] = useState("");
  const [gridCellsH, setGridCellsH] = useState("");
  const [gridOffsetX, setGridOffsetX] = useState("0");
  const [gridOffsetY, setGridOffsetY] = useState("0");
  const [savingGrid, setSavingGrid] = useState(false);
  const [gmNotesOverlay, setGmNotesOverlay] = useState<GmNoteOverlayVm[]>([]);

  const selectedMap = maps.find((m) => m.id === selectedMapId) ?? null;
  const gridOverlay = useExplorationMapGrid(selectedMap);
  const regionsForMap = useMemo(
    () => regions.filter((r) => r.map_id === selectedMapId),
    [regions, selectedMapId]
  );
  const vm = useMemo(() => rowsToVm(regionsForMap), [regionsForMap]);

  const openProjectionFullscreenWindow = useCallback(() => {
    if (!selectedMapId) return;
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
      // Alcuni browser bloccano moveTo/resizeTo: la finestra resta comunque aperta.
    }
  }, [campaignId, selectedMapId]);

  const imageUrl = selectedMap
    ? getExplorationMapPublicUrl(selectedMap.image_path, selectedMap.updated_at)
    : "";

  useEffect(() => {
    setMaps(initialMaps);
  }, [initialMaps]);

  useEffect(() => {
    setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    if (!selectedMap) {
      setSelectedMapMissionId("none");
      setGridCellsW("");
      setGridCellsH("");
      setGridOffsetX("0");
      setGridOffsetY("0");
      return;
    }
    setSelectedMapMissionId(selectedMap.linked_mission_id ?? "none");
    setGridCellsW(selectedMap.grid_cells_w != null ? String(selectedMap.grid_cells_w) : "");
    setGridCellsH(selectedMap.grid_cells_h != null ? String(selectedMap.grid_cells_h) : "");
    setGridOffsetX(String(selectedMap.grid_offset_x_cells ?? 0));
    setGridOffsetY(String(selectedMap.grid_offset_y_cells ?? 0));
  }, [selectedMap]);

  useEffect(() => {
    if (
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
  }, [campaignId, selectedMap]);

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
    if (newMapMissionId !== "none") {
      formData.append("linked_mission_id", newMapMissionId);
    }
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
      setNewMapMissionId("none");
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

  const onCanvasClick = useCallback((n: NormPoint) => {
    setDraftPoints((d) => [...d, n]);
  }, []);

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

  async function handleDeleteRegionById(regionId: string) {
    const res = await deleteFowRegion(campaignId, regionId);
    if (!res?.success) {
      toast.error(res?.error ?? "Errore");
      return;
    }
    setRegions((p) => p.filter((r) => r.id !== regionId));
    if (selectedRegionId === regionId) setSelectedRegionId(null);
    toast.success("Poligono eliminato.");
  }

  async function handleShapeCreate(polygon: NormPoint[]) {
    if (!selectedMapId || polygon.length < 3) return;
    const res = await createFowRegion(campaignId, selectedMapId, polygon);
    if (!res?.success) {
      toast.error(res?.error ?? "Errore");
      return;
    }
    toast.success("Poligono salvato.");
    await refreshFromServer();
  }

  async function handleRegionPolygonChange(regionId: string, polygon: NormPoint[]) {
    if (polygon.length < 3) return;
    const res = await updateFowRegionPolygon(campaignId, regionId, polygon);
    if (!res?.success) {
      toast.error(res?.error ?? "Errore");
      return;
    }
    setRegions((prev) =>
      prev.map((r) =>
        r.id === regionId ? { ...r, polygon: polygon as unknown as FowRegionRow["polygon"] } : r
      )
    );
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

  async function handleImportSceneJson() {
    if (!selectedMapId) return;
    if (!importText.trim()) {
      toast.error("Incolla il JSON esportato da Dungeon Alchemist/Foundry.");
      return;
    }
    setImportLoading(true);
    const res = await importExplorationScene(campaignId, selectedMapId, importText, true);
    setImportLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "Import non riuscito.");
      return;
    }
    toast.success(`Import completato: ${res.data?.importedRegions ?? 0} zone FoW create.`);
    await refreshFromServer();
    setMode("explore");
    setDraftPoints([]);
    setSelectedRegionId(null);
    setUndoReveal([]);
  }

  async function handleBulkReveal(isRevealed: boolean) {
    if (!selectedMapId) return;
    const res = await setAllMapRegionsRevealed(campaignId, selectedMapId, isRevealed);
    if (!res.success) {
      toast.error(res.error ?? "Errore aggiornamento zone.");
      return;
    }
    setRegions((prev) =>
      prev.map((r) =>
        r.map_id === selectedMapId ? { ...r, is_revealed: isRevealed } : r
      )
    );
    if (!isRevealed) setUndoReveal([]);
    toast.success(isRevealed ? "Tutte le zone rivelate." : "Tutte le zone oscurate.");
  }

  async function handleToggleRegion(regionId: string, next: boolean) {
    const res = await setFowRegionRevealed(campaignId, regionId, next);
    if (!res.success) {
      toast.error(res.error ?? "Errore aggiornamento zona.");
      return;
    }
    setRegions((prev) => prev.map((r) => (r.id === regionId ? { ...r, is_revealed: next } : r)));
  }

  async function handleSaveMapMission() {
    if (!selectedMapId) return;
    setSavingMapMission(true);
    const res = await updateExplorationMapMeta(campaignId, selectedMapId, {
      linked_mission_id: selectedMapMissionId === "none" ? null : selectedMapMissionId,
    });
    setSavingMapMission(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore salvataggio missione.");
      return;
    }
    setMaps((prev) =>
      prev.map((m) =>
        m.id === selectedMapId
          ? { ...m, linked_mission_id: selectedMapMissionId === "none" ? null : selectedMapMissionId }
          : m
      )
    );
    toast.success("Missione collegata alla mappa.");
  }

  async function handleSaveGridCalibration() {
    if (!selectedMapId) return;
    const cw = gridCellsW.trim() ? Number(gridCellsW) : null;
    const ch = gridCellsH.trim() ? Number(gridCellsH) : null;
    if ((cw != null && (!Number.isFinite(cw) || cw <= 0)) || (ch != null && (!Number.isFinite(ch) || ch <= 0))) {
      toast.error("Celle griglia non valide.");
      return;
    }
    setSavingGrid(true);
    const res = await updateExplorationMapMeta(campaignId, selectedMapId, {
      grid_cells_w: cw,
      grid_cells_h: ch,
      grid_offset_x_cells: Number(gridOffsetX) || 0,
      grid_offset_y_cells: Number(gridOffsetY) || 0,
      grid_source_cell_px: null,
    });
    setSavingGrid(false);
    if (!res.success) {
      toast.error(res.error ?? "Errore salvataggio griglia.");
      return;
    }
    setMaps((prev) =>
      prev.map((m) =>
        m.id === selectedMapId
          ? {
              ...m,
              grid_cells_w: cw,
              grid_cells_h: ch,
              grid_offset_x_cells: Number(gridOffsetX) || 0,
              grid_offset_y_cells: Number(gridOffsetY) || 0,
              grid_source_cell_px: null,
            }
          : m
      )
    );
    toast.success("Calibrazione griglia salvata.");
  }


  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 lg:gap-3">
      <div className="shrink-0 rounded-2xl bg-barber-dark/35 p-3 ring-1 ring-inset ring-white/[0.06] sm:p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] text-barber-gold/75">Piano / mappa</Label>
              <Select
                value={selectedMapId ?? ""}
                onValueChange={(v) => {
                  setSelectedMapId(v);
                  setDraftPoints([]);
                  setSelectedRegionId(null);
                  setUndoReveal([]);
                }}
              >
                <SelectTrigger className={cn("w-full min-w-[220px] sm:w-[260px]", FIELD_CLASS)}>
                  <SelectValue placeholder="Seleziona una mappa" />
                </SelectTrigger>
                <SelectContent>
                  {maps.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.floor_label?.trim() || "Senza nome"} (ord. {m.sort_order})
                      {m.source_type === "generated_scene" ? " · generata" : ""}
                      {m.linked_mission_id ? " · missione" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMap ? (
              <div className="flex flex-wrap gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-inset ring-white/[0.06]">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "prepare" ? "default" : "ghost"}
                  className={cn("h-8 rounded-lg text-xs", mode === "prepare" && "bg-barber-gold text-barber-dark")}
                  onClick={() => setMode("prepare")}
                >
                  Prepara poligoni
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "explore" ? "default" : "ghost"}
                  className={cn("h-8 rounded-lg text-xs", mode === "explore" && "bg-barber-gold text-barber-dark")}
                  onClick={() => {
                    setMode("explore");
                    setDraftPoints([]);
                  }}
                >
                  Esplora (rivela)
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" asChild size="sm" variant="outline" className="h-8 border-white/10 text-xs ring-1 ring-white/5">
              <Link href={`/campaigns/${campaignId}/gm-only/scene-editor`}>
                <Map className="mr-1.5 h-3.5 w-3.5" />
                Scene Editor
              </Link>
            </Button>
            {selectedMapId ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-white/10 text-xs ring-1 ring-white/5"
                onClick={openProjectionFullscreenWindow}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Proiezione
              </Button>
            ) : null}
            {selectedMap?.source_type === "generated_scene" && selectedMap.scene_document_id ? (
              <Button type="button" variant="outline" size="sm" className="h-8 border-white/10 text-xs ring-1 ring-white/5" asChild>
                <Link href={`/campaigns/${campaignId}/gm-only/scene-editor/${selectedMap.scene_document_id}`}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Modifica scena
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        {selectedMap ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
            {mode === "prepare" ? (
              <>
                <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={() => setDraftPoints([])}>
                  Annulla bozza
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 text-xs"
                  onClick={() => void closeDraftPolygon()}
                  disabled={draftPoints.length < 3}
                >
                  Chiudi poligono
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 border-white/10 text-xs ring-1 ring-white/5" onClick={handleDeleteRegion} disabled={!selectedRegionId}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Elimina poligono
                </Button>
                <Select value={selectedRegionId ?? "__none__"} onValueChange={(v) => setSelectedRegionId(v === "__none__" ? null : v)}>
                  <SelectTrigger className={cn("h-8 w-[180px] text-xs", FIELD_CLASS)}>
                    <SelectValue placeholder="Poligono" />
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
              </>
            ) : (
              <>
                <Button type="button" size="sm" variant="outline" className="h-8 border-white/10 text-xs ring-1 ring-white/5" onClick={undoRevealAction} disabled={undoReveal.length === 0}>
                  <Undo2 className="mr-1 h-3.5 w-3.5" />
                  Undo
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 border-white/10 text-xs ring-1 ring-white/5" onClick={() => void handleBulkReveal(true)}>
                  Rivela tutto
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 border-white/10 text-xs ring-1 ring-white/5" onClick={() => void handleBulkReveal(false)}>
                  Oscura tutto
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 border-white/10 text-xs ring-1 ring-white/5" onClick={() => void handleResetFog()}>
                  Reset nebbia
                </Button>
              </>
            )}
            <Button type="button" size="sm" variant="destructive" className="ml-auto h-8 text-xs" onClick={() => void handleDeleteMap()}>
              Elimina mappa
            </Button>
          </div>
        ) : null}
      </div>

      {maps.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl bg-white/[0.02] p-8 text-center ring-1 ring-dashed ring-barber-gold/15">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-barber-gold/10 ring-1 ring-barber-gold/20">
              <Map className="h-7 w-7 text-barber-gold" />
            </div>
            <p className="font-serif text-base text-barber-paper">Nessuna mappa FoW</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-barber-paper/55">
              Crea una scena con lo Scene Editor oppure carica un&apos;immagine dal pannello a destra.
            </p>
          </div>
          <aside className="scrollbar-barber-y w-full shrink-0 space-y-2 overflow-y-auto lg:w-80">
            <NewMapPanel
              maps={maps}
              missionOptions={missionOptions}
              newMapMissionId={newMapMissionId}
              setNewMapMissionId={setNewMapMissionId}
              mapCompressing={mapCompressing}
              mapUploading={mapUploading}
              onSubmit={handleAddMap}
              defaultOpen
            />
          </aside>
        </div>
      ) : selectedMap ? (
        <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:gap-3">
          <div className="flex min-h-[min(52vh,520px)] min-w-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-barber-dark/45 via-barber-dark/60 to-barber-dark/80 ring-1 ring-barber-gold/10 lg:min-h-0">
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-xs text-barber-paper/75">
              <span className="rounded-md bg-barber-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-barber-gold">
                {mapSourceLabel(selectedMap.source_type ?? "uploaded_image")}
              </span>
              <span>
                {regionsForMap.length} zone · bozza {draftPoints.length} vertici
              </span>
              {gridOverlay.showGrid ? <span className="text-emerald-400/90">Griglia attiva</span> : null}
              {selectedMap.grid_cell_meters != null ? (
                <span>1 quadretto ≈ {String(selectedMap.grid_cell_meters)} m</span>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-2">
              <ExplorationMapStage
                imageUrl={imageUrl}
                imageAlt={selectedMap.floor_label || "Mappa"}
                regions={vm}
                mode={mode}
                draftPoints={draftPoints}
                selectedRegionId={selectedRegionId}
                onImageSized={gridOverlay.onImageSized}
                onCanvasClick={onCanvasClick}
                onShapeCreate={handleShapeCreate}
                onVertexDragEnd={handleVertexDragEnd}
                onRegionPolygonChange={handleRegionPolygonChange}
                onRegionDelete={handleDeleteRegionById}
                onRevealClick={mode === "explore" ? onRevealClick : undefined}
                fillViewport
                showGrid={gridOverlay.showGrid}
                gridCellSourcePxX={gridOverlay.gridCellSourcePxX}
                gridOffsetXCells={gridOverlay.gridOffsetXCells}
                gridOffsetYCells={gridOverlay.gridOffsetYCells}
                showGmNotes={gmNotesOverlay.length > 0}
                gmNotes={gmNotesOverlay}
              />
            </div>
            <p className="shrink-0 px-3 pb-2 text-[11px] leading-relaxed text-barber-paper/50">
              {mode === "prepare"
                ? "Clic per vertici, poi «Chiudi poligono». Tasto destro: menu radiale con forme rapide."
                : "Clic su un'area per rivelarla ai giocatori; la proiezione si aggiorna in tempo reale."}
            </p>
          </div>

          <aside className="scrollbar-barber-y flex min-h-0 flex-col gap-2 overflow-y-auto lg:max-h-none">
            <section className="rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06]">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-[11px] font-medium text-barber-gold/75">Zone FoW</h4>
                <span className="text-[10px] text-barber-paper/50">{regionsForMap.length}</span>
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto pr-0.5">
                {regionsForMap.map((r, idx) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2 py-1.5 text-xs ring-1 ring-inset ring-white/[0.04]"
                  >
                    <button
                      type="button"
                      className="truncate text-left text-barber-paper/90 hover:text-barber-gold"
                      onClick={() => setSelectedRegionId(r.id)}
                    >
                      Zona {idx + 1}
                    </button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[10px]"
                      onClick={() => void handleToggleRegion(r.id, !r.is_revealed)}
                    >
                      {r.is_revealed ? "Nascondi" : "Rivela"}
                    </Button>
                  </div>
                ))}
                {regionsForMap.length === 0 ? (
                  <p className="text-xs italic leading-relaxed text-barber-paper/55">
                    {selectedMap.source_type === "generated_scene"
                      ? "Salva la scena nello Scene Editor oppure disegna poligoni in «Prepara»."
                      : "Disegna poligoni o importa un JSON scena."}
                  </p>
                ) : null}
              </div>
            </section>

            {selectedMap.source_type !== "generated_scene" ? (
              <ToolDetails title="Calibrazione griglia" description="Celle Roll20 (W×H) come in Dungeon Alchemist / Foundry.">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Celle W</Label>
                    <Input value={gridCellsW} onChange={(e) => setGridCellsW(e.target.value)} type="number" min={1} className={cn("w-20 text-sm", FIELD_CLASS)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Celle H</Label>
                    <Input value={gridCellsH} onChange={(e) => setGridCellsH(e.target.value)} type="number" min={1} className={cn("w-20 text-sm", FIELD_CLASS)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Off. X</Label>
                    <Input value={gridOffsetX} onChange={(e) => setGridOffsetX(e.target.value)} type="number" className={cn("w-20 text-sm", FIELD_CLASS)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Off. Y</Label>
                    <Input value={gridOffsetY} onChange={(e) => setGridOffsetY(e.target.value)} type="number" className={cn("w-20 text-sm", FIELD_CLASS)} />
                  </div>
                  <Button type="button" size="sm" variant="outline" className="h-8 border-white/10 text-xs ring-1 ring-white/5" disabled={savingGrid} onClick={() => void handleSaveGridCalibration()}>
                    {savingGrid ? "Salvataggio…" : "Salva"}
                  </Button>
                </div>
              </ToolDetails>
            ) : (
              <p className="rounded-xl bg-white/[0.02] px-3 py-2 text-xs text-barber-paper/55 ring-1 ring-inset ring-white/[0.04]">
                Griglia gestita dallo Scene Editor.
              </p>
            )}

            {missionOptions.length > 0 ? (
              <ToolDetails title="Missione collegata">
                <div className="flex flex-wrap items-end gap-2">
                  <Select value={selectedMapMissionId} onValueChange={setSelectedMapMissionId}>
                    <SelectTrigger className={cn("w-full text-sm", FIELD_CLASS)}>
                      <SelectValue placeholder="Nessuna missione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuna missione</SelectItem>
                      {missionOptions.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" size="sm" variant="outline" className="h-8 border-white/10 text-xs ring-1 ring-white/5" disabled={savingMapMission} onClick={() => void handleSaveMapMission()}>
                    {savingMapMission ? "Salvataggio…" : "Salva missione"}
                  </Button>
                </div>
              </ToolDetails>
            ) : null}

            <ToolDetails title="Import scena JSON" description="Export Foundry / Dungeon Alchemist: genera zone FoW e griglia.">
              <Input
                type="file"
                accept=".json,application/json"
                className={cn("max-w-full text-sm", FIELD_CLASS)}
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  void file.text().then((txt) => setImportText(txt));
                }}
              />
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={5}
                className={cn("w-full rounded-md p-2 font-mono text-xs text-barber-paper", FIELD_CLASS)}
                placeholder='{"name":"Treno","width":...}'
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="h-8 bg-barber-gold text-barber-dark hover:bg-barber-gold/90" disabled={importLoading || !importText.trim()} onClick={() => void handleImportSceneJson()}>
                  {importLoading ? "Import…" : "Importa JSON"}
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-8" disabled={importLoading} onClick={() => setImportText("")}>
                  Svuota
                </Button>
              </div>
            </ToolDetails>

            <NewMapPanel
              maps={maps}
              missionOptions={missionOptions}
              newMapMissionId={newMapMissionId}
              setNewMapMissionId={setNewMapMissionId}
              mapCompressing={mapCompressing}
              mapUploading={mapUploading}
              onSubmit={handleAddMap}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function NewMapPanel({
  maps,
  missionOptions,
  newMapMissionId,
  setNewMapMissionId,
  mapCompressing,
  mapUploading,
  onSubmit,
  defaultOpen = false,
}: {
  maps: ExplorationMapRow[];
  missionOptions: { id: string; title: string }[];
  newMapMissionId: string;
  setNewMapMissionId: (v: string) => void;
  mapCompressing: boolean;
  mapUploading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  defaultOpen?: boolean;
}) {
  return (
    <ToolDetails
      title="Carica nuova mappa"
      description="Immagine o link Drive; opzionale missione e scala quadretto."
      defaultOpen={defaultOpen}
    >
      <form encType="multipart/form-data" onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="f-floor">Nome piano</Label>
            <Input id="f-floor" name="floor_label" placeholder="Piano terra" className={FIELD_CLASS} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-sort">Ordine</Label>
            <Input id="f-sort" name="sort_order" type="number" defaultValue={maps.length} className={FIELD_CLASS} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-grid">Quadretto (m)</Label>
            <Input id="f-grid" name="grid_cell_meters" placeholder="1.5" className={FIELD_CLASS} />
          </div>
          {missionOptions.length > 0 ? (
            <div className="space-y-1 sm:col-span-2">
              <Label>Missione</Label>
              <Select value={newMapMissionId} onValueChange={setNewMapMissionId}>
                <SelectTrigger className={FIELD_CLASS}>
                  <SelectValue placeholder="Nessuna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna missione</SelectItem>
                  {missionOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-img">Immagine</Label>
          <Input id="f-img" name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={mapCompressing || mapUploading} className={cn("text-sm", FIELD_CLASS)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-img-url">Oppure link Google Drive</Label>
          <Input id="f-img-url" name="image_url" type="url" placeholder="https://drive.google.com/..." disabled={mapCompressing || mapUploading} className={cn("text-sm", FIELD_CLASS)} />
        </div>
        <Button type="submit" disabled={mapCompressing || mapUploading} className="h-8 w-full bg-barber-red hover:bg-barber-red/90">
          {mapCompressing ? "Compressione…" : mapUploading ? "Caricamento…" : "Carica mappa"}
        </Button>
      </form>
    </ToolDetails>
  );
}
