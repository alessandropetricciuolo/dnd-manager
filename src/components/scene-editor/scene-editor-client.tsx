"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Layers,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { saveSceneDocumentWithRastersAction } from "@/app/campaigns/scene-document-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { exportFloorRasterBlob } from "@/lib/map-core/raster-export/floor-raster";
import { sceneEditorNewId } from "@/lib/map-core/scene-editor/ids";
import { distancePointToSegment, snapPoint } from "@/lib/map-core/scene-editor/snap";
import { finalizeCorridorPolygon } from "@/lib/map-core/scene-editor/corridor-geometry";
import { pointInPolygon } from "@/lib/map-core/coordinates";
import {
  createDefaultLayer,
  getActiveLayer,
  normalizeSceneDocument,
  normalizeSceneFloor,
  prepareSceneDocumentForSave,
  rectangleAreaPolygon,
  SCENE_LAYER_PRESETS,
  SCENE_PROP_CATALOG,
  updateActiveLayer,
  type SceneDocumentV1,
  type SceneFloorV1,
  type SceneLayerPresetId,
  type SceneLayerV1,
  type ScenePropKindV1,
} from "@/lib/map-core/scene-schema";
import { scenePropCatalogEntry } from "@/lib/map-core/scene-schema/props-catalog";
import {
  SceneEditorCanvas,
  type SceneEditorTool,
} from "@/components/scene-editor/scene-editor-canvas";
import { SceneEditorToolOverlay } from "@/components/scene-editor/scene-editor-tool-overlay";

type MissionOption = { id: string; title: string };

type Props = {
  campaignId: string;
  sceneDocumentId: string;
  initialDocument: SceneDocumentV1;
  missionOptions?: MissionOption[];
};

function findAreaAt(layer: SceneLayerV1, floor: SceneFloorV1, x: number, y: number) {
  for (let i = layer.areas.length - 1; i >= 0; i--) {
    const a = layer.areas[i];
    const norm = a.polygon.map((p) => ({
      x: p.x / floor.width,
      y: p.y / floor.height,
    }));
    if (pointInPolygon(x / floor.width, y / floor.height, norm)) return a.id;
  }
  return null;
}

function findWallAt(layer: SceneLayerV1, x: number, y: number, threshold = 14) {
  let best: { id: string; dist: number } | null = null;
  for (const w of layer.walls) {
    const d = distancePointToSegment(x, y, w.x1, w.y1, w.x2, w.y2);
    if (d <= threshold && (!best || d < best.dist)) best = { id: w.id, dist: d };
  }
  return best?.id ?? null;
}

function findPropAt(floor: SceneFloorV1, x: number, y: number) {
  for (let i = (floor.props ?? []).length - 1; i >= 0; i--) {
    const p = floor.props[i];
    const entry = scenePropCatalogEntry(p.kind);
    const radius = (entry.baseSize * (p.scale ?? 1)) * 0.55;
    if (Math.hypot(x - p.x, y - p.y) <= radius) return p.id;
  }
  return null;
}

function findGmNoteAt(floor: SceneFloorV1, x: number, y: number) {
  for (let i = (floor.gmNotes ?? []).length - 1; i >= 0; i--) {
    const n = floor.gmNotes[i];
    const w = n.width ?? 180;
    const lines = n.text.trim() ? n.text.trim().split(/\n/).slice(0, 6) : ["(nota vuota)"];
    const h = lines.length * 14 + 12;
    if (x >= n.x && x <= n.x + w && y >= n.y && y <= n.y + h) return n.id;
  }
  return null;
}

export function SceneEditorClient({
  campaignId,
  sceneDocumentId,
  initialDocument,
  missionOptions = [],
}: Props) {
  const router = useRouter();
  const [document, setDocument] = useState<SceneDocumentV1>(() =>
    normalizeSceneDocument(initialDocument)
  );
  const [activeFloorId, setActiveFloorId] = useState(initialDocument.floors[0]?.id ?? "");
  const [tool, setTool] = useState<SceneEditorTool>("select");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [selectedGmNoteId, setSelectedGmNoteId] = useState<string | null>(null);
  const [propKind, setPropKind] = useState<ScenePropKindV1>("barrel");
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );
  const [roomDragStart, setRoomDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draftCorridorCenterline, setDraftCorridorCenterline] = useState<
    Array<{ x: number; y: number }>
  >([]);
  const [draftCorridorCursor, setDraftCorridorCursor] = useState<{ x: number; y: number } | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  const activeFloor = useMemo(
    () => document.floors.find((f) => f.id === activeFloorId) ?? document.floors[0],
    [document.floors, activeFloorId]
  );

  const activeLayer = useMemo(
    () => (activeFloor ? getActiveLayer(activeFloor) : null),
    [activeFloor]
  );

  const updateFloor = useCallback((floorId: string, updater: (f: SceneFloorV1) => SceneFloorV1) => {
    setDocument((prev) => ({
      ...prev,
      floors: prev.floors.map((f) => (f.id === floorId ? updater(f) : f)),
    }));
  }, []);

  const resetCorridorDraft = useCallback(() => {
    setDraftCorridorCenterline([]);
    setDraftCorridorCursor(null);
  }, []);

  const commitCorridor = useCallback(
    (centerline: Array<{ x: number; y: number }>) => {
      if (!activeFloor || centerline.length < 2) return;
      const halfWidth = activeFloor.grid.cellPx / 2;
      const polygon = finalizeCorridorPolygon(centerline, halfWidth);
      if (!polygon || polygon.length < 4) {
        toast.error("Corridoio troppo corto.");
        return;
      }
      const id = sceneEditorNewId();
      updateFloor(activeFloor.id, (f) =>
        updateActiveLayer(f, (layer) => ({
          ...layer,
          areas: [...layer.areas, { id, kind: "corridor", polygon }],
        }))
      );
      resetCorridorDraft();
    },
    [activeFloor, resetCorridorDraft, updateFloor]
  );

  useEffect(() => {
    if (tool !== "corridor" || draftCorridorCenterline.length < 3) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitCorridor(draftCorridorCenterline);
      }
      if (e.key === "Escape") resetCorridorDraft();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tool, draftCorridorCenterline, commitCorridor, resetCorridorDraft]);

  const updateLayerOnFloor = useCallback(
    (floorId: string, layerId: string, updater: (layer: SceneLayerV1) => SceneLayerV1) => {
      updateFloor(floorId, (f) => {
        const normalized = normalizeSceneFloor(f);
        const layers = normalized.layers.map((layer) =>
          layer.id === layerId ? updater(layer) : layer
        );
        return {
          ...normalized,
          layers,
          areas: layers.filter((l) => l.visible).flatMap((l) => l.areas),
          walls: layers.filter((l) => l.visible).flatMap((l) => l.walls),
        };
      });
    },
    [updateFloor]
  );

  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        const prepared = prepareSceneDocumentForSave(document);
        const form = new FormData();
        form.append("document", JSON.stringify(prepared));
        for (const floor of prepared.floors) {
          const blob = await exportFloorRasterBlob(floor);
          form.append(`floor_raster_${floor.id}`, blob, `${floor.label || "piano"}.webp`);
        }
        const res = await saveSceneDocumentWithRastersAction(campaignId, sceneDocumentId, form);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success(
          "Scena salvata. Apri Vista dall'alto per vedere mappa e zone FoW aggiornate."
        );
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Salvataggio fallito.");
      }
    });
  }, [campaignId, document, sceneDocumentId, router]);

  const addFloor = () => {
    const id = sceneEditorNewId();
    const sortOrder = Math.max(-1, ...document.floors.map((f) => f.sortOrder)) + 1;
    const template = activeFloor ?? document.floors[0];
    const layer = createDefaultLayer("Layer 1", "rough_cavern");
    setDocument((prev) => ({
      ...prev,
      floors: [
        ...prev.floors,
        {
          id,
          label: `Piano ${prev.floors.length + 1}`,
          sortOrder,
          width: template?.width ?? 2000,
          height: template?.height ?? 1500,
          grid: { ...(template?.grid ?? { kind: "square", cellPx: 100, offsetX: 0, offsetY: 0 }) },
          layers: [layer],
          activeLayerId: layer.id,
          areas: [],
          walls: [],
          props: [],
          gmNotes: [],
        },
      ],
    }));
    setActiveFloorId(id);
  };

  const addLayer = () => {
    if (!activeFloor) return;
    const layer = createDefaultLayer(`Layer ${activeFloor.layers.length + 1}`, "classic_hatching");
    layer.sortOrder = Math.max(-1, ...activeFloor.layers.map((l) => l.sortOrder)) + 1;
    updateFloor(activeFloor.id, (f) => {
      const normalized = normalizeSceneFloor(f);
      const layers = [...normalized.layers, layer];
      return {
        ...normalized,
        layers,
        activeLayerId: layer.id,
        areas: layers.filter((l) => l.visible).flatMap((l) => l.areas),
        walls: layers.filter((l) => l.visible).flatMap((l) => l.walls),
      };
    });
  };

  const removeActiveLayer = () => {
    if (!activeFloor || activeFloor.layers.length <= 1) {
      toast.error("Serve almeno un layer sul piano.");
      return;
    }
    const layerId = activeFloor.activeLayerId;
    updateFloor(activeFloor.id, (f) => {
      const normalized = normalizeSceneFloor(f);
      const layers = normalized.layers.filter((l) => l.id !== layerId);
      const nextActive = layers[0]?.id ?? "";
      return {
        ...normalized,
        layers,
        activeLayerId: nextActive,
        areas: layers.filter((l) => l.visible).flatMap((l) => l.areas),
        walls: layers.filter((l) => l.visible).flatMap((l) => l.walls),
      };
    });
    setSelectedAreaId(null);
    setSelectedWallId(null);
  };

  const removeActiveFloor = () => {
    if (document.floors.length <= 1) {
      toast.error("Serve almeno un piano.");
      return;
    }
    const next = document.floors.filter((f) => f.id !== activeFloorId);
    setDocument((prev) => ({ ...prev, floors: next }));
    setActiveFloorId(next[0]?.id ?? "");
  };

  const moveFloor = (dir: -1 | 1) => {
    const idx = document.floors.findIndex((f) => f.id === activeFloorId);
    if (idx < 0) return;
    const target = idx + dir;
    if (target < 0 || target >= document.floors.length) return;
    const floors = [...document.floors];
    const [item] = floors.splice(idx, 1);
    floors.splice(target, 0, item);
    setDocument((prev) => ({
      ...prev,
      floors: floors.map((f, i) => ({ ...f, sortOrder: i })),
    }));
  };

  const onCanvasPoint = (x: number, y: number) => {
    if (!activeFloor || !activeLayer) return;
    const snapped = snapPoint(x, y, activeFloor);

    if (tool === "select") {
      const areaId = findAreaAt(activeLayer, activeFloor, x, y);
      const wallId = findWallAt(activeLayer, x, y);
      const propId = findPropAt(activeFloor, x, y);
      const noteId = findGmNoteAt(activeFloor, x, y);
      setSelectedAreaId(areaId);
      setSelectedWallId(wallId);
      setSelectedPropId(propId);
      setSelectedGmNoteId(noteId);
      return;
    }

    if (tool === "erase") {
      const areaId = findAreaAt(activeLayer, activeFloor, x, y);
      const wallId = findWallAt(activeLayer, x, y);
      const propId = findPropAt(activeFloor, x, y);
      const noteId = findGmNoteAt(activeFloor, x, y);
      if (areaId) {
        updateFloor(activeFloor.id, (f) =>
          updateActiveLayer(f, (layer) => ({
            ...layer,
            areas: layer.areas.filter((a) => a.id !== areaId),
          }))
        );
        setSelectedAreaId(null);
      } else if (wallId) {
        updateFloor(activeFloor.id, (f) =>
          updateActiveLayer(f, (layer) => ({
            ...layer,
            walls: layer.walls.map((w) =>
              w.id === wallId ? { ...w, door: undefined } : w
            ),
          }))
        );
        setSelectedWallId(null);
      } else if (propId) {
        updateFloor(activeFloor.id, (f) => ({
          ...f,
          props: f.props.filter((p) => p.id !== propId),
        }));
        setSelectedPropId(null);
      } else if (noteId) {
        updateFloor(activeFloor.id, (f) => ({
          ...f,
          gmNotes: f.gmNotes.filter((n) => n.id !== noteId),
        }));
        setSelectedGmNoteId(null);
      }
      return;
    }

    if (tool === "prop") {
      const id = sceneEditorNewId();
      updateFloor(activeFloor.id, (f) => ({
        ...f,
        props: [...f.props, { id, kind: propKind, x: snapped.x, y: snapped.y }],
      }));
      setSelectedPropId(id);
      return;
    }

    if (tool === "gmNote") {
      const id = sceneEditorNewId();
      updateFloor(activeFloor.id, (f) => ({
        ...f,
        gmNotes: [
          ...f.gmNotes,
          { id, x: snapped.x, y: snapped.y, text: "Nota GM", width: 180 },
        ],
      }));
      setSelectedGmNoteId(id);
      return;
    }

    if (tool === "room") {
      setRoomDragStart(snapped);
      setDraftRect({ x: snapped.x, y: snapped.y, w: 0, h: 0 });
      return;
    }

    if (tool === "corridor") {
      const nextCenterline = [...draftCorridorCenterline, snapped];
      if (nextCenterline.length === 2) {
        commitCorridor(nextCenterline);
        return;
      }
      setDraftCorridorCenterline(nextCenterline);
      return;
    }

    if (tool === "door") {
      const wallId = findWallAt(activeLayer, x, y, 22);
      if (!wallId) return;
      updateFloor(activeFloor.id, (f) =>
        updateActiveLayer(f, (layer) => ({
          ...layer,
          walls: layer.walls.map((w) => {
            if (w.id !== wallId) return w;
            const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
            if (len < 1) return w;
            const t =
              ((x - w.x1) * (w.x2 - w.x1) + (y - w.y1) * (w.y2 - w.y1)) / (len * len);
            const doorWidth = Math.min(len * 0.35, f.grid.cellPx * 1.2);
            return {
              ...w,
              door: { width: doorWidth, offset: Math.max(0, Math.min(1, t)) },
            };
          }),
        }))
      );
    }
  };

  const onCanvasMove = (x: number, y: number) => {
    if (!activeFloor) return;
    const snapped = snapPoint(x, y, activeFloor);
    if (tool === "room" && roomDragStart) {
      const x0 = Math.min(roomDragStart.x, snapped.x);
      const y0 = Math.min(roomDragStart.y, snapped.y);
      const w = Math.abs(snapped.x - roomDragStart.x);
      const h = Math.abs(snapped.y - roomDragStart.y);
      setDraftRect({ x: x0, y: y0, w, h });
    }
    if (tool === "corridor" && draftCorridorCenterline.length > 0) {
      setDraftCorridorCursor(snapped);
    }
  };

  const onCanvasUp = (x: number, y: number) => {
    if (!activeFloor || tool !== "room" || !roomDragStart) return;
    const snapped = snapPoint(x, y, activeFloor);
    const x0 = Math.min(roomDragStart.x, snapped.x);
    const y0 = Math.min(roomDragStart.y, snapped.y);
    const w = Math.abs(snapped.x - roomDragStart.x);
    const h = Math.abs(snapped.y - roomDragStart.y);
    setRoomDragStart(null);
    setDraftRect(null);
    if (w < activeFloor.grid.cellPx || h < activeFloor.grid.cellPx) return;
    const id = sceneEditorNewId();
    updateFloor(activeFloor.id, (f) =>
      updateActiveLayer(f, (layer) => ({
        ...layer,
        areas: [
          ...layer.areas,
          {
            id,
            kind: "room",
            polygon: rectangleAreaPolygon(x0, y0, w, h),
          },
        ],
      }))
    );
  };

  if (!activeFloor || !activeLayer) {
    return <p className="text-sm text-red-400">Nessun piano nella scena.</p>;
  }

  const sortedLayers = [...activeFloor.layers].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeLayerSettings =
    sortedLayers.find((l) => l.id === activeFloor.activeLayerId) ?? sortedLayers[0];

  const selectTool = (next: SceneEditorTool) => {
    setTool(next);
    resetCorridorDraft();
    setRoomDragStart(null);
    setDraftRect(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-sky-500/30 bg-sky-950/30 px-3 py-2 text-xs text-sky-100/90">
        Stile <strong>Dungeon Scrawl</strong>: stanze e corridoi generano i muri automaticamente.{" "}
        <strong>Rotella del mouse</strong> = zoom; <strong>click rotella</strong> = pan. La scena
        compare in Esplorazione e FoW solo dopo <strong>Salva scena</strong>.
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label htmlFor="scene-name">Nome scena</Label>
          <Input
            id="scene-name"
            value={document.name}
            onChange={(e) => setDocument((d) => ({ ...d, name: e.target.value }))}
            className="border-barber-gold/30 bg-barber-dark"
          />
        </div>
        {missionOptions.length > 0 ? (
          <div className="min-w-[220px] space-y-1">
            <Label>Missione</Label>
            <Select
              value={document.linkedMissionId ?? "none"}
              onValueChange={(v) =>
                setDocument((d) => ({
                  ...d,
                  linkedMissionId: v === "none" ? null : v,
                }))
              }
            >
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark">
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
        <Button
          type="button"
          className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
          disabled={pending}
          onClick={handleSave}
        >
          <Save className="mr-2 h-4 w-4" />
          {pending ? "Salvataggio..." : "Salva scena"}
        </Button>
        <Button type="button" variant="outline" asChild className="border-barber-gold/40">
          <Link href={`/campaigns/${campaignId}/gm-only/vista-dall-alto`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Vista dall&apos;alto
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-barber-gold">Piani</span>
        {document.floors
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((floor) => (
            <Button
              key={floor.id}
              type="button"
              size="sm"
              variant={floor.id === activeFloorId ? "default" : "outline"}
              className={
                floor.id === activeFloorId
                  ? "bg-barber-gold text-barber-dark"
                  : "border-barber-gold/30"
              }
              onClick={() => setActiveFloorId(floor.id)}
            >
              <Layers className="mr-1 h-3.5 w-3.5" />
              {floor.label || "Piano"}
            </Button>
          ))}
        <Button type="button" size="sm" variant="outline" onClick={addFloor}>
          <Plus className="mr-1 h-4 w-4" />
          Piano
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => moveFloor(-1)} aria-label="Su">
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button type="button" size="icon" variant="ghost" onClick={() => moveFloor(1)} aria-label="Giù">
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="destructive" onClick={removeActiveFloor}>
          <Trash2 className="mr-1 h-4 w-4" />
          Elimina piano
        </Button>
      </div>

      <div className="space-y-2">
        <div className="overflow-x-auto rounded-lg border border-barber-gold/25 bg-barber-dark/60">
          <div className="flex min-w-max flex-wrap items-end gap-x-4 gap-y-2 px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="floor-label" className="text-[10px] uppercase tracking-wide text-barber-gold/80">
                Piano
              </Label>
              <Input
                id="floor-label"
                value={activeFloor.label}
                onChange={(e) =>
                  updateFloor(activeFloor.id, (f) => ({ ...f, label: e.target.value }))
                }
                className="h-8 w-28 border-barber-gold/30 bg-barber-dark text-xs"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">L</Label>
              <Input
                type="number"
                min={256}
                max={8000}
                value={activeFloor.width}
                onChange={(e) => {
                  const w = Math.max(256, Math.min(8000, Number(e.target.value) || 2000));
                  updateFloor(activeFloor.id, (f) => ({ ...f, width: w }));
                }}
                className="h-8 w-20 border-barber-gold/30 bg-barber-dark text-xs"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">H</Label>
              <Input
                type="number"
                min={256}
                max={8000}
                value={activeFloor.height}
                onChange={(e) => {
                  const h = Math.max(256, Math.min(8000, Number(e.target.value) || 1500));
                  updateFloor(activeFloor.id, (f) => ({ ...f, height: h }));
                }}
                className="h-8 w-20 border-barber-gold/30 bg-barber-dark text-xs"
              />
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">Griglia</Label>
              <Input
                type="number"
                min={20}
                max={400}
                value={activeFloor.grid.cellPx}
                onChange={(e) => {
                  const cellPx = Math.max(20, Math.min(400, Number(e.target.value) || 100));
                  updateFloor(activeFloor.id, (f) => ({
                    ...f,
                    grid: { ...f.grid, cellPx },
                  }));
                }}
                className="h-8 w-16 border-barber-gold/30 bg-barber-dark text-xs"
              />
            </div>

            <div className="hidden h-8 w-px self-end bg-barber-gold/20 sm:block" aria-hidden />

            <div className="space-y-0.5">
              <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">Layer</Label>
              <div className="flex items-center gap-1">
                <Select
                  value={activeFloor.activeLayerId}
                  onValueChange={(layerId) =>
                    updateFloor(activeFloor.id, (f) => ({
                      ...normalizeSceneFloor(f),
                      activeLayerId: layerId,
                    }))
                  }
                >
                  <SelectTrigger className="h-8 w-32 border-barber-gold/30 bg-barber-dark text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedLayers.map((layer) => (
                      <SelectItem key={layer.id} value={layer.id}>
                        {layer.label || "Layer"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeLayerSettings ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label={activeLayerSettings.visible ? "Nascondi layer" : "Mostra layer"}
                    onClick={() =>
                      updateLayerOnFloor(activeFloor.id, activeLayerSettings.id, (l) => ({
                        ...l,
                        visible: !l.visible,
                      }))
                    }
                  >
                    {activeLayerSettings.visible ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </Button>
                ) : null}
                <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={addLayer}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {activeLayerSettings ? (
              <>
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">Nome</Label>
                  <Input
                    value={activeLayerSettings.label}
                    onChange={(e) =>
                      updateLayerOnFloor(activeFloor.id, activeLayerSettings.id, (l) => ({
                        ...l,
                        label: e.target.value,
                      }))
                    }
                    className="h-8 w-28 border-barber-gold/30 bg-barber-dark text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">Stile</Label>
                  <Select
                    value={activeLayerSettings.presetId}
                    onValueChange={(v) =>
                      updateLayerOnFloor(activeFloor.id, activeLayerSettings.id, (l) => ({
                        ...l,
                        presetId: v as SceneLayerPresetId,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-36 border-barber-gold/30 bg-barber-dark text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(SCENE_LAYER_PRESETS).map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">
                    Opac. {(activeLayerSettings.opacity * 100).toFixed(0)}%
                  </Label>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={activeLayerSettings.opacity}
                    onChange={(e) =>
                      updateLayerOnFloor(activeFloor.id, activeLayerSettings.id, (l) => ({
                        ...l,
                        opacity: Number(e.target.value),
                      }))
                    }
                    className="block h-8 w-24"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-8 px-2 text-xs"
                  onClick={removeActiveLayer}
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Layer
                </Button>
              </>
            ) : null}

            {tool === "corridor" && draftCorridorCenterline.length > 0 ? (
              <>
                <div className="hidden h-8 w-px self-end bg-barber-gold/20 sm:block" aria-hidden />
                <Button type="button" size="sm" variant="secondary" className="h-8 text-xs" onClick={resetCorridorDraft}>
                  Annulla corridoio
                </Button>
                {draftCorridorCenterline.length >= 3 ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 bg-barber-gold text-xs text-barber-dark hover:bg-barber-gold/90"
                    onClick={() => commitCorridor(draftCorridorCenterline)}
                  >
                    Completa curva
                  </Button>
                ) : null}
              </>
            ) : null}

            {tool === "prop" ? (
              <>
                <div className="hidden h-8 w-px self-end bg-barber-gold/20 sm:block" aria-hidden />
                <div className="space-y-0.5">
                  <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">Prop</Label>
                  <Select value={propKind} onValueChange={(v) => setPropKind(v as ScenePropKindV1)}>
                    <SelectTrigger className="h-8 w-32 border-barber-gold/30 bg-barber-dark text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCENE_PROP_CATALOG.map((p) => (
                        <SelectItem key={p.kind} value={p.kind}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            {selectedGmNoteId ? (
              <>
                <div className="hidden h-8 w-px self-end bg-barber-gold/20 sm:block" aria-hidden />
                <div className="min-w-[200px] flex-1 space-y-0.5">
                  <Label className="text-[10px] uppercase tracking-wide text-barber-gold/80">Nota GM</Label>
                  <Textarea
                    rows={1}
                    value={
                      activeFloor.gmNotes.find((n) => n.id === selectedGmNoteId)?.text ?? ""
                    }
                    onChange={(e) => {
                      const text = e.target.value;
                      updateFloor(activeFloor.id, (f) => ({
                        ...f,
                        gmNotes: f.gmNotes.map((n) =>
                          n.id === selectedGmNoteId ? { ...n, text } : n
                        ),
                      }));
                    }}
                    className="min-h-8 border-barber-gold/30 bg-barber-dark text-xs"
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="relative">
          <SceneEditorCanvas
            floor={activeFloor}
            tool={tool}
            drawOptions={{
              selectedAreaId,
              selectedWallId,
              selectedPropId,
              selectedGmNoteId,
              draftRect,
              draftCorridor:
                draftCorridorCenterline.length > 0
                  ? {
                      centerline: draftCorridorCenterline,
                      cursor: draftCorridorCursor,
                      halfWidth: activeFloor.grid.cellPx / 2,
                    }
                  : null,
              activeLayerId: activeFloor.activeLayerId,
            }}
            onCanvasPoint={onCanvasPoint}
            onCanvasMove={onCanvasMove}
            onCanvasUp={onCanvasUp}
          />
          <SceneEditorToolOverlay tool={tool} onToolChange={selectTool} />
        </div>
      </div>
    </div>
  );
}
