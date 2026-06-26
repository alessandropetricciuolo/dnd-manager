"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
import { pointInPolygon } from "@/lib/map-core/coordinates";
import {
  rectangleAreaPolygon,
  SCENE_PROP_CATALOG,
  type SceneDocumentV1,
  type SceneFloorV1,
  type ScenePropKindV1,
} from "@/lib/map-core/scene-schema";
import { scenePropCatalogEntry } from "@/lib/map-core/scene-schema/props-catalog";
import {
  SceneEditorCanvas,
  type SceneEditorTool,
} from "@/components/scene-editor/scene-editor-canvas";

type MissionOption = { id: string; title: string };

type Props = {
  campaignId: string;
  sceneDocumentId: string;
  initialDocument: SceneDocumentV1;
  missionOptions?: MissionOption[];
};

const TOOLS: { id: SceneEditorTool; label: string }[] = [
  { id: "select", label: "Seleziona" },
  { id: "room", label: "Stanza" },
  { id: "corridor", label: "Corridoio" },
  { id: "wall", label: "Muro" },
  { id: "door", label: "Porta" },
  { id: "prop", label: "Prop" },
  { id: "gmNote", label: "Nota GM" },
  { id: "erase", label: "Elimina" },
];

function findAreaAt(floor: SceneFloorV1, x: number, y: number) {
  for (let i = floor.areas.length - 1; i >= 0; i--) {
    const a = floor.areas[i];
    const norm = a.polygon.map((p) => ({
      x: p.x / floor.width,
      y: p.y / floor.height,
    }));
    if (pointInPolygon(x / floor.width, y / floor.height, norm)) return a.id;
  }
  return null;
}

function findWallAt(floor: SceneFloorV1, x: number, y: number, threshold = 14) {
  let best: { id: string; dist: number } | null = null;
  for (const w of floor.walls) {
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
  const [document, setDocument] = useState<SceneDocumentV1>(initialDocument);
  const [activeFloorId, setActiveFloorId] = useState(initialDocument.floors[0]?.id ?? "");
  const [tool, setTool] = useState<SceneEditorTool>("room");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [selectedGmNoteId, setSelectedGmNoteId] = useState<string | null>(null);
  const [propKind, setPropKind] = useState<ScenePropKindV1>("barrel");
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; w: number; h: number } | null>(
    null
  );
  const [roomDragStart, setRoomDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draftCorridor, setDraftCorridor] = useState<Array<{ x: number; y: number }>>([]);
  const [wallStart, setWallStart] = useState<{ x: number; y: number } | null>(null);
  const [draftWall, setDraftWall] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(
    null
  );
  const [pending, startTransition] = useTransition();

  const activeFloor = useMemo(
    () => document.floors.find((f) => f.id === activeFloorId) ?? document.floors[0],
    [document.floors, activeFloorId]
  );

  const updateFloor = useCallback((floorId: string, updater: (f: SceneFloorV1) => SceneFloorV1) => {
    setDocument((prev) => ({
      ...prev,
      floors: prev.floors.map((f) => (f.id === floorId ? updater(f) : f)),
    }));
  }, []);

  const handleSave = useCallback(() => {
    startTransition(async () => {
      try {
        const form = new FormData();
        form.append("document", JSON.stringify(document));
        for (const floor of document.floors) {
          const blob = await exportFloorRasterBlob(floor);
          form.append(`floor_raster_${floor.id}`, blob, `${floor.label || "piano"}.webp`);
        }
        const res = await saveSceneDocumentWithRastersAction(campaignId, sceneDocumentId, form);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        toast.success("Scena salvata: documento, raster e FoW aggiornati.");
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
          areas: [],
          walls: [],
          props: [],
          gmNotes: [],
        },
      ],
    }));
    setActiveFloorId(id);
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
    if (!activeFloor) return;
    const snapped = snapPoint(x, y, activeFloor);

    if (tool === "select") {
      const areaId = findAreaAt(activeFloor, x, y);
      const wallId = findWallAt(activeFloor, x, y);
      const propId = findPropAt(activeFloor, x, y);
      const noteId = findGmNoteAt(activeFloor, x, y);
      setSelectedAreaId(areaId);
      setSelectedWallId(wallId);
      setSelectedPropId(propId);
      setSelectedGmNoteId(noteId);
      return;
    }

    if (tool === "erase") {
      const areaId = findAreaAt(activeFloor, x, y);
      const wallId = findWallAt(activeFloor, x, y);
      const propId = findPropAt(activeFloor, x, y);
      const noteId = findGmNoteAt(activeFloor, x, y);
      if (areaId) {
        updateFloor(activeFloor.id, (f) => ({
          ...f,
          areas: f.areas.filter((a) => a.id !== areaId),
        }));
        setSelectedAreaId(null);
      } else if (wallId) {
        updateFloor(activeFloor.id, (f) => ({
          ...f,
          walls: f.walls.filter((w) => w.id !== wallId),
        }));
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
      if (draftCorridor.length >= 3) {
        const first = draftCorridor[0];
        if (Math.hypot(snapped.x - first.x, snapped.y - first.y) < activeFloor.grid.cellPx) {
          const id = sceneEditorNewId();
          updateFloor(activeFloor.id, (f) => ({
            ...f,
            areas: [...f.areas, { id, kind: "corridor", polygon: [...draftCorridor] }],
          }));
          setDraftCorridor([]);
          return;
        }
      }
      setDraftCorridor((prev) => [...prev, snapped]);
      return;
    }

    if (tool === "wall") {
      if (!wallStart) {
        setWallStart(snapped);
        setDraftWall({ x1: snapped.x, y1: snapped.y, x2: snapped.x, y2: snapped.y });
        return;
      }
      const len = Math.hypot(snapped.x - wallStart.x, snapped.y - wallStart.y);
      if (len >= activeFloor.grid.cellPx * 0.5) {
        updateFloor(activeFloor.id, (f) => ({
          ...f,
          walls: [
            ...f.walls,
            {
              id: sceneEditorNewId(),
              x1: wallStart.x,
              y1: wallStart.y,
              x2: snapped.x,
              y2: snapped.y,
            },
          ],
        }));
      }
      setWallStart(null);
      setDraftWall(null);
      return;
    }

    if (tool === "door") {
      const wallId = findWallAt(activeFloor, x, y, 18);
      if (!wallId) return;
      updateFloor(activeFloor.id, (f) => ({
        ...f,
        walls: f.walls.map((w) => {
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
      }));
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
    if (tool === "wall" && wallStart) {
      setDraftWall({ x1: wallStart.x, y1: wallStart.y, x2: snapped.x, y2: snapped.y });
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
    updateFloor(activeFloor.id, (f) => ({
      ...f,
      areas: [
        ...f.areas,
        {
          id,
          kind: "room",
          polygon: rectangleAreaPolygon(x0, y0, w, h),
        },
      ],
    }));
  };

  if (!activeFloor) {
    return <p className="text-sm text-red-400">Nessun piano nella scena.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
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

      {activeFloor ? (
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <SceneEditorCanvas
            floor={activeFloor}
            tool={tool}
            drawOptions={{
              selectedAreaId,
              selectedWallId,
              selectedPropId,
              selectedGmNoteId,
              draftRect,
              draftCorridor: draftCorridor.length ? draftCorridor : null,
              draftWall,
            }}
            onCanvasPoint={onCanvasPoint}
            onCanvasMove={onCanvasMove}
            onCanvasUp={onCanvasUp}
          />
          <aside className="space-y-4 rounded-lg border border-barber-gold/25 bg-barber-dark/60 p-3">
            <div className="space-y-1">
              <Label htmlFor="floor-label">Etichetta piano</Label>
              <Input
                id="floor-label"
                value={activeFloor.label}
                onChange={(e) =>
                  updateFloor(activeFloor.id, (f) => ({ ...f, label: e.target.value }))
                }
                className="border-barber-gold/30 bg-barber-dark text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Larghezza px</Label>
                <Input
                  type="number"
                  min={256}
                  max={8000}
                  value={activeFloor.width}
                  onChange={(e) => {
                    const w = Math.max(256, Math.min(8000, Number(e.target.value) || 2000));
                    updateFloor(activeFloor.id, (f) => ({ ...f, width: w }));
                  }}
                  className="border-barber-gold/30 bg-barber-dark text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Altezza px</Label>
                <Input
                  type="number"
                  min={256}
                  max={8000}
                  value={activeFloor.height}
                  onChange={(e) => {
                    const h = Math.max(256, Math.min(8000, Number(e.target.value) || 1500));
                    updateFloor(activeFloor.id, (f) => ({ ...f, height: h }));
                  }}
                  className="border-barber-gold/30 bg-barber-dark text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cella griglia (px)</Label>
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
                className="border-barber-gold/30 bg-barber-dark text-sm"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-barber-gold">Strumenti</p>
              <div className="flex flex-col gap-1">
                {TOOLS.map((t) => (
                  <Button
                    key={t.id}
                    type="button"
                    size="sm"
                    variant={tool === t.id ? "default" : "outline"}
                    className={
                      tool === t.id
                        ? "justify-start bg-barber-gold text-barber-dark"
                        : "justify-start border-barber-gold/25"
                    }
                    onClick={() => {
                      setTool(t.id);
                      setDraftCorridor([]);
                      setWallStart(null);
                      setDraftWall(null);
                      setRoomDragStart(null);
                      setDraftRect(null);
                    }}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            {tool === "corridor" && draftCorridor.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setDraftCorridor([])}
              >
                Annulla corridoio
              </Button>
            ) : null}
            {tool === "prop" ? (
              <div className="space-y-1">
                <Label className="text-xs">Tipo prop</Label>
                <Select value={propKind} onValueChange={(v) => setPropKind(v as ScenePropKindV1)}>
                  <SelectTrigger className="border-barber-gold/30 bg-barber-dark text-sm">
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
                <p className="text-[10px] text-barber-paper/50">Clicca sul piano per posizionare.</p>
              </div>
            ) : null}
            {tool === "gmNote" ? (
              <p className="text-[10px] text-barber-paper/50">
                Clicca per aggiungere una nota GM (visibile solo a te, non in proiezione).
              </p>
            ) : null}
            {selectedGmNoteId ? (
              <div className="space-y-1">
                <Label className="text-xs">Testo nota GM</Label>
                <Textarea
                  rows={4}
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
                  className="border-barber-gold/30 bg-barber-dark text-sm"
                />
              </div>
            ) : null}
            <p className="text-[11px] leading-relaxed text-barber-paper/55">
              Corridoio: clic per vertici, clic sul primo punto per chiudere. Porta: clic su un muro.
              Props compaiono nel raster proiezione; le note GM solo in Vista dall&apos;alto.
            </p>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
