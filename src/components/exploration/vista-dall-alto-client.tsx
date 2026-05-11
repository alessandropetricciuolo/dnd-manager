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

  const selectedMap = maps.find((m) => m.id === selectedMapId) ?? null;
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

  const imageUrl = selectedMap ? getExplorationMapPublicUrl(selectedMap.image_path) : "";

  useEffect(() => {
    setMaps(initialMaps);
  }, [initialMaps]);

  useEffect(() => {
    setRegions(initialRegions);
  }, [initialRegions]);

  useEffect(() => {
    if (!selectedMap) {
      setSelectedMapMissionId("none");
      return;
    }
    setSelectedMapMissionId(selectedMap.linked_mission_id ?? "none");
  }, [selectedMap]);

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
                  {m.linked_mission_id ? " · missione" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedMapId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-barber-gold/40"
            onClick={openProjectionFullscreenWindow}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Apri proiezione (2° schermo)
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
          {missionOptions.length > 0 ? (
            <div className="space-y-1">
              <Label>Missione collegata</Label>
              <Select value={newMapMissionId} onValueChange={setNewMapMissionId}>
                <SelectTrigger className="w-56 border-barber-gold/30 bg-barber-dark">
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
            </div>
          ) : null}
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
          <section className="rounded-xl border border-barber-gold/25 bg-barber-dark/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-barber-gold">
              Import scena (Treno-first)
            </h3>
            <p className="mb-3 text-xs text-barber-paper/70">
              Incolla il JSON export Foundry/Dungeon Alchemist. Verranno generate automaticamente
              le zone FoW e impostata la griglia della mappa.
            </p>
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept=".json,application/json"
                className="max-w-sm border-barber-gold/30 bg-barber-dark text-sm"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  void file.text().then((txt) => setImportText(txt));
                }}
              />
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={7}
                className="w-full rounded-md border border-barber-gold/30 bg-barber-dark p-2 font-mono text-xs text-barber-paper"
                placeholder='Incolla qui il JSON scena (es. {"name":"Treno","width":...})'
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                  disabled={importLoading || !importText.trim()}
                  onClick={() => void handleImportSceneJson()}
                >
                  {importLoading ? "Import in corso..." : "Importa JSON e rigenera FoW"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={importLoading}
                  onClick={() => setImportText("")}
                >
                  Svuota
                </Button>
              </div>
            </div>
          </section>

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
                <Button type="button" size="sm" variant="outline" onClick={() => void handleBulkReveal(true)}>
                  Rivela tutte le zone
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void handleBulkReveal(false)}>
                  Oscura tutte le zone
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
          </div>

          {missionOptions.length > 0 ? (
            <section className="mb-3 rounded-lg border border-barber-gold/20 bg-barber-dark/40 p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-barber-gold">
                Missione mappa FoW
              </h4>
              <div className="flex flex-wrap items-end gap-2">
                <Select value={selectedMapMissionId} onValueChange={setSelectedMapMissionId}>
                  <SelectTrigger className="w-72 border-barber-gold/30 bg-barber-dark text-sm">
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
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-barber-gold/40"
                  disabled={savingMapMission}
                  onClick={() => void handleSaveMapMission()}
                >
                  {savingMapMission ? "Salvataggio..." : "Salva missione"}
                </Button>
              </div>
            </section>
          ) : null}

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

          <section className="mb-2 rounded-lg border border-barber-gold/20 bg-barber-dark/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-barber-gold">
                Zone FoW
              </h4>
              <span className="text-xs text-barber-paper/65">{regionsForMap.length} zone</span>
            </div>
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {regionsForMap.map((r, idx) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded border border-barber-gold/15 px-2 py-1 text-xs"
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
                    className="h-7 px-2 text-xs"
                    onClick={() => void handleToggleRegion(r.id, !r.is_revealed)}
                  >
                    {r.is_revealed ? "Nascondi" : "Rivela"}
                  </Button>
                </div>
              ))}
              {regionsForMap.length === 0 ? (
                <p className="text-xs italic text-barber-paper/60">
                  Nessuna zona FoW: crea poligoni manuali o importa un JSON scena.
                </p>
              ) : null}
            </div>
          </section>

          <ExplorationMapStage
            imageUrl={imageUrl}
            imageAlt={selectedMap.floor_label || "Mappa"}
            regions={vm}
            mode={mode}
            draftPoints={draftPoints}
            selectedRegionId={selectedRegionId}
            onCanvasClick={onCanvasClick}
            onShapeCreate={handleShapeCreate}
            onVertexDragEnd={handleVertexDragEnd}
            onRegionPolygonChange={handleRegionPolygonChange}
            onRegionDelete={handleDeleteRegionById}
            onRevealClick={mode === "explore" ? onRevealClick : undefined}
            showGrid={false}
          />

          <p className="text-xs text-barber-paper/55">
            Preparazione: clic per vertici, «Chiudi poligono» per salvare; oppure tasto destro sulla mappa per menu
            radiale (forme rapide e azioni contestuali sposta/ridimensiona/elimina). Esplora: clic su un&apos;area
            per mostrarla ai giocatori (proiezione si aggiorna in tempo reale).
          </p>
        </>
      )}

      {maps.length === 0 && (
        <p className="text-sm text-barber-paper/70">Carica almeno un&apos;immagine per iniziare.</p>
      )}
    </div>
  );
}
