"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Grid3X3,
  Layers3,
  MonitorPlay,
  RotateCcw,
  Save,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addManualFow,
  applyFoundryFow,
  deleteFowRegion,
  hitTestFowRegion,
  makeFowPolygon,
  moveFowVertex,
  nearestVertexIndex,
  previewFoundryFow,
  resetFow,
  scalePolygonFromCenter,
  setAllFow,
  translatePolygon,
  updateFowRegion,
  type FowImportPreview,
  type FowTool,
} from "@/lib/scene-runtime/r6-6";
import {
  addWorkspaceOverlay,
  createLocalWorkspaceScene,
  discardWorkspaceRevision,
  editWorkspace,
  materializeWorkspaceFow,
  publishWorkspace,
  removeWorkspaceOverlay,
  rollbackWorkspacePublication,
  setWorkspaceLifecycle,
  updatePublishedFow,
  type TacticalWorkspaceState,
  type WorkspaceOverlayKind,
} from "@/lib/scene-runtime/workspace";
import type { TacticalScene } from "@/lib/scene-runtime/types";
import {
  archiveTacticalSceneAction,
  createTacticalSceneAction,
  discardPendingTacticalSceneMapAction,
  listTacticalMissionOptionsAction,
  publishTacticalSceneAction,
  renameTacticalSceneAction,
  rollbackTacticalScenePublicationAction,
  saveTacticalSceneRevisionAction,
  updateTacticalFowRuntimeAction,
  uploadTacticalSceneMapAction,
} from "@/app/campaigns/tactical-scene-actions";
import {
  addSceneFloor,
  removeSceneFloor,
  reorderSceneFloors,
  updateSceneFloorGrid,
} from "@/lib/scene-runtime/r6-5";
import {
  addSceneFeature,
  addSceneGmNote,
  addSceneLayer,
  addSceneProp,
  deriveSceneFloorPreview,
  generateSceneDungeon,
  removeSceneFeature,
  removeSceneProp,
  snapScenePoint,
  updateSceneFeature,
  updateSceneGmNote,
  removeSceneGmNote,
  updateSceneLayer,
} from "@/lib/scene-runtime/r6-7";
import { addProjectionEffect, makeEffectPolygon, removeProjectionEffect, setProjectionDayNight, updateProjectionEffect, type ProjectionEffectGeometry, type ProjectionEffectKind } from "@/lib/scene-runtime/r6-8";

type Props = {
  campaignId: string;
  campaignName: string;
  initialScene?: TacticalScene;
  report: { severity: string; code: string; message: string }[];
  persistedSceneId?: string;
  persistedRevisionId?: string;
};

const pointString = (points: { x: number; y: number }[]) =>
  points.map((point) => `${point.x * 100}% ${point.y * 100}%`).join(",");

export function Stage({
  scene,
  projection,
  activeFloorId,
  selectedRegionId,
  onEditorPointerDown,
  onEditorPointerMove,
  onEditorPointerUp,
}: {
  scene: TacticalScene;
  projection: boolean;
  activeFloorId?: string;
  selectedRegionId?: string;
  onEditorPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onEditorPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onEditorPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const maskId = useId().replace(/:/g, "");
  const [zoom, setZoom] = useState(1);
  const floor = scene.floors.find((item) => item.id === activeFloorId) ?? scene.floors[0];
  if (!floor)
    return (
      <div className="flex h-full items-center justify-center text-sm text-barber-paper/60">
        Nessun piano disponibile.
      </div>
    );
  const image =
    (floor.previewAsset?.storageKey ?? floor.asset.storageKey).startsWith("http") ||
    (floor.previewAsset?.storageKey ?? floor.asset.storageKey).startsWith("data:") ||
    (floor.previewAsset?.storageKey ?? floor.asset.storageKey).startsWith("/")
      ? (floor.previewAsset?.storageKey ?? floor.asset.storageKey)
      : null;
  const overlays = projection
    ? (scene.overlay.published ?? [])
    : scene.overlay.draft;
  const effects = scene.effects?.[projection ? "published" : "draft"] ?? [];
  const dayNight = scene.effects?.dayNight ?? "day";
  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-xl border border-barber-gold/25 bg-[#171313] shadow-2xl"
      aria-label={
        projection ? "Proiezione locale pubblicata" : "Anteprima scena in bozza"
      }
      onPointerDown={onEditorPointerDown}
      onPointerMove={onEditorPointerMove}
      onPointerUp={onEditorPointerUp}
      onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.max(.5, Math.min(2.5, value * (event.deltaY > 0 ? .92 : 1.08)))); }}
      onDoubleClick={() => setZoom(1)}
      style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#493729,#201917_62%,#110f0f)]"
        style={
          image
            ? {
                backgroundImage: `linear-gradient(#120e0e55,#120e0e55),url(${image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      />
      <div className={`pointer-events-none absolute inset-0 ${dayNight === "night" ? "bg-indigo-950/65" : "bg-amber-100/10"}`} />
      {floor.grid?.visible ? (
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#d9b36b33_1px,transparent_1px),linear-gradient(to_bottom,#d9b36b33_1px,transparent_1px)]"
          style={{
            backgroundSize: `${Math.max(12, (floor.grid.cellSize / floor.width) * 100)}% ${Math.max(12, (floor.grid.cellSize / floor.height) * 100)}%`,
          }}
        />
      ) : null}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-label="Nebbia di guerra"
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="1"
            height="1"
          >
            <rect width="1" height="1" fill="white" />
            {scene.fow.regions
              .filter((region) => region.floorId === floor.id && region.revealed)
              .map((region) => (
                <polygon
                  key={region.id}
                  points={region.polygon
                    .map((point) => `${point.x},${point.y}`)
                    .join(" ")}
                  fill="black"
                />
              ))}
          </mask>
        </defs>
        <rect
          width="1"
          height="1"
          fill="#050505"
          fillOpacity=".86"
          mask={`url(#${maskId})`}
        />
      </svg>
      {!projection ? (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Regioni FoW modificabili">
          {scene.fow.regions.filter((region) => region.floorId === floor.id).map((region) => (
            <g key={region.id}>
              <polygon points={region.polygon.map((point) => `${point.x},${point.y}`).join(" ")} fill={region.id === selectedRegionId ? "#eab30844" : "#60a5fa22"} stroke={region.id === selectedRegionId ? "#facc15" : "#93c5fd"} strokeWidth={region.id === selectedRegionId ? 0.006 : 0.003} vectorEffect="non-scaling-stroke" />
              {region.id === selectedRegionId ? region.polygon.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={0.009} fill="#facc15" stroke="#111827" strokeWidth={0.003} vectorEffect="non-scaling-stroke" />) : null}
            </g>
          ))}
        </svg>
      ) : null}
      {floor.layers.filter((layer) => layer.visible).flatMap((layer) => layer.features.filter((feature) => feature.visible).map((feature) => (
        <div key={`feature-${feature.id}`} className="pointer-events-none absolute border border-amber-200/60 bg-amber-300/10" style={{ inset: 0, clipPath: `polygon(${pointString(feature.geometry)})`, opacity: layer.opacity }} aria-label={`${feature.kind} ${feature.label ?? ""}`} />
      )))}
      {!projection ? (floor.props ?? []).map((prop) => (
        <span key={`prop-${prop.id}`} className="pointer-events-none absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-orange-200 bg-orange-800/80 text-[9px] text-orange-50" style={{ left: `${prop.x * 100}%`, top: `${prop.y * 100}%`, transform: `translate(-50%, -50%) rotate(${prop.rotation ?? 0}deg) scale(${prop.scale ?? 1})` }} aria-label={`Prop ${prop.kind}`}>{prop.kind.slice(0, 2)}</span>
      )) : null}
      {!projection ? (floor.gmNotes ?? []).map((note) => (
        <span key={`note-${note.id}`} className="pointer-events-none absolute max-w-[28%] rounded border border-sky-300/60 bg-sky-950/80 px-2 py-1 text-[10px] text-sky-100" style={{ left: `${note.x * 100}%`, top: `${note.y * 100}%` }}>{note.text}</span>
      )) : null}
      {overlays.filter((item) => item.visible !== false).map((item) =>
        item.type === "image" || item.type === "gif" ? (
          (item.src ?? scene.assets?.find((asset) => asset.id === item.assetId)?.storageKey) ? <img key={item.id} src={item.src ?? scene.assets?.find((asset) => asset.id === item.assetId)?.storageKey} alt="Overlay visuale" className="pointer-events-none absolute object-contain" style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.width * 100}%`, height: `${item.height * 100}%`, opacity: item.opacity ?? 1, transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg)` }} /> : null
        ) : item.type === "area" ? (
          <div
            key={item.id}
            className="absolute border border-amber-300/70"
            style={{
              inset: 0,
              clipPath: `polygon(${pointString(item.polygon)})`,
              background: item.color,
              opacity: item.opacity,
            }}
          />
        ) : item.type === "text" ? (
          <span
            key={item.id}
            className="absolute font-semibold drop-shadow-md"
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              color: item.color ?? "#f5d486",
              fontSize: `${Math.max(10, (item.size ?? 18) / 2)}px`,
            }}
          >
            {item.text}
          </span>
        ) : item.type === "marker" ? (
          <span
            key={item.id}
            className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-amber-200 bg-amber-600/80 text-xs font-bold text-black"
            style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }}
          >
            {item.label ?? "!"}
          </span>
        ) : item.type === "circle" || item.type === "measure" ? (
          <span
            key={item.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber-300/90"
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              width: `${item.radius * 200}%`,
              aspectRatio: "1",
            }}
          />
        ) : item.type === "timer" ? (
          <span
            key={item.id}
            className="absolute flex items-center gap-1 rounded bg-black/75 px-2 py-1 text-xs text-amber-100"
            style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }}
          >
            <Timer className="h-3 w-3" />
            {item.label ?? "Timer"}: {item.seconds}s
          </span>
        ) : null,
      )}
      {effects.filter((effect) => effect.floorId === floor.id && effect.visible).map((effect) => {
        const xs = effect.polygon.map((point) => point.x), ys = effect.polygon.map((point) => point.y);
        const left = Math.min(...xs), top = Math.min(...ys), width = Math.max(.01, Math.max(...xs) - left), height = Math.max(.01, Math.max(...ys) - top);
        return <div key={effect.id} className={`pointer-events-none absolute overflow-hidden ${effect.geometry === "circle" ? "rounded-full" : ""} ${effect.kind === "smoke" || effect.kind === "mist" || effect.kind === "fire" ? "animate-pulse blur-sm" : effect.kind === "lightning" ? "animate-pulse" : ""}`} style={{ left: `${left * 100}%`, top: `${top * 100}%`, width: `${width * 100 * effect.scale}%`, height: `${height * 100 * effect.scale}%`, clipPath: `polygon(${pointString(effect.polygon)})`, background: effect.kind === "darkness" ? "#020617" : `radial-gradient(circle, ${effect.color}cc, ${effect.color}22 68%, transparent)`, opacity: effect.opacity }} aria-label={`Effetto ${effect.kind}`} />;
      })}
      <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200">
        {projection ? "Proiezione locale" : "Bozza locale"}
      </span>
    </div>
  );
}

export function SceneWorkspaceClient({
  campaignId,
  campaignName,
  initialScene,
  report,
  persistedSceneId,
  persistedRevisionId,
}: Props) {
  const [state, setState] = useState<TacticalWorkspaceState>(() =>
    initialScene
      ? {
          draft: initialScene,
          published: null,
          history: [],
          discardedRevisionNos: [],
        }
      : createLocalWorkspaceScene(campaignId),
  );
  const [projection, setProjection] = useState(false);
  const [status, setStatus] = useState("Modifiche locali temporanee");
  const [overlayLabel, setOverlayLabel] = useState("");
  const [savedSceneId, setSavedSceneId] = useState(persistedSceneId);
  const [savedRevisionId, setSavedRevisionId] = useState(persistedRevisionId);
  const [savedRevisionNo, setSavedRevisionNo] = useState(
    initialScene?.revisionNo,
  );
  const [savedPublicationId, setSavedPublicationId] = useState<string>();
  const [gridVisible, setGridVisible] = useState(
    Boolean(state.draft.floors[0]?.grid?.visible),
  );
  const [activeFloorId, setActiveFloorId] = useState(state.draft.floors[0]?.id);
  const [sceneName, setSceneName] = useState(state.draft.name);
  const [missionOptions, setMissionOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [mapPreview, setMapPreview] = useState("");
  const [fowTool, setFowTool] = useState<FowTool | "select">("select");
  const [effectKind, setEffectKind] = useState<ProjectionEffectKind>("fire");
  const [effectGeometry, setEffectGeometry] = useState<ProjectionEffectGeometry>("circle");
  const [effectStart, setEffectStart] = useState<{x:number;y:number}>();
  const [effectMode, setEffectMode] = useState(false);
  const [selectedEffectId, setSelectedEffectId] = useState<string>();
  const [editorTool, setEditorTool] = useState<"select" | "room" | "corridor" | "wall" | "door">("select");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>();
  const [selectedPropId, setSelectedPropId] = useState<string>();
  const [selectedNoteId, setSelectedNoteId] = useState<string>();
  const editorDrag = useRef<{ start: {x:number;y:number}; featureId?: string; propId?: string; origin?: {x:number;y:number}; }>();
  const [editorStart, setEditorStart] = useState<{x:number;y:number}>();
  const [editorSeed, setEditorSeed] = useState("r6.7");
  const [editorRoomCount, setEditorRoomCount] = useState(6);
  const [editorRoomSize, setEditorRoomSize] = useState<"small"|"medium"|"large">("medium");
  const [editorPropTheme, setEditorPropTheme] = useState<"dungeon"|"taverna"|"caverna">("dungeon");
  const [editorAppend, setEditorAppend] = useState(false);
  const [editorWithDoors, setEditorWithDoors] = useState(true);
  const [editorWithProps, setEditorWithProps] = useState(true);
  const [fowStart, setFowStart] = useState<{x:number;y:number}>();
  const [polygonPoints, setPolygonPoints] = useState<{x:number;y:number}[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string>();
  const [fowUndo, setFowUndo] = useState<TacticalWorkspaceState[]>([]);
  const dragRef = useRef<{ regionId: string; start: {x:number;y:number}; polygon: {x:number;y:number}[]; vertexIndex?: number }>();
  const [importText, setImportText] = useState("");
  const [importPreview, setImportPreview] = useState<FowImportPreview>();
  const [importError, setImportError] = useState("");
  const [pendingUploadedMapId, setPendingUploadedMapId] = useState<string>();
  const floor =
    state.draft.floors.find((item) => item.id === activeFloorId) ??
    state.draft.floors[0];
  const regions = useMemo(
    () =>
      state.draft.fow.regions.filter((region) => region.floorId === floor?.id),
    [state.draft.fow.regions, floor?.id],
  );
  const runtimeReveal = (regionId: string, draftValue: boolean) => state.published?.fow.regions.find((region) => region.id === regionId)?.revealed ?? draftValue;

  const updateGrid = () => {
    if (!floor) return;
    const next = {
      ...state.draft,
      floors: state.draft.floors.map((candidate) =>
        candidate.id === floor.id
          ? {
              ...candidate,
              grid: candidate.grid
                ? { ...candidate.grid, visible: !gridVisible }
                : undefined,
            }
          : candidate,
      ),
    };
    try {
      setState(editWorkspace(state, next));
      setGridVisible(!gridVisible);
    } catch {
      setStatus("Modifica non valida");
    }
  };
  const run = (fn: () => TacticalWorkspaceState, message: string) => {
    try {
      setState(fn());
      setStatus(message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Modifica non valida");
    }
  };
  const updateScene = (next: TacticalScene, message: string) => {
    try {
      setState(editWorkspace(state, next));
      setStatus(message);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Modifica non valida");
    }
  };
  const rename = async () => {
    if (!savedSceneId) return setStatus("Salva prima la scena.");
    const result = await renameTacticalSceneAction(savedSceneId, sceneName);
    if (!result.success) return setStatus(result.error);
    updateScene({ ...state.draft, name: sceneName.trim() }, "Scena rinominata");
  };
  const archive = async () => {
    if (!savedSceneId) return setStatus("Salva prima la scena.");
    const result = await archiveTacticalSceneAction(savedSceneId);
    if (result.success)
      window.location.href = `/campaigns/${campaignId}/gm-only/scene-workspace`;
    else setStatus(result.error);
  };
  const upload = async (file?: File, url?: string) => {
    setUploadStatus("Validazione e caricamento…");
    if (file) {
      if (
        !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
          file.type,
        ) ||
        file.size > 4 * 1024 * 1024
      )
        return setUploadStatus("Formato non supportato o file oltre 4 MB.");
      setMapPreview(URL.createObjectURL(file));
    } else if (url) {
      try {
        setMapPreview(new URL(url).toString());
      } catch {
        return setUploadStatus("URL non valido.");
      }
    }
    const form = new FormData();
    if (file) form.set("image", file);
    if (url) form.set("image_url", url);
    form.set("floor_label", floor?.label ?? "Piano");
    const result = await uploadTacticalSceneMapAction(campaignId, form);
    if (!result.success) return setUploadStatus(result.error);
    if (!floor) return;
    if (pendingUploadedMapId) {
      await discardPendingTacticalSceneMapAction(
        campaignId,
        pendingUploadedMapId,
      );
    }
    setPendingUploadedMapId(result.data.id);
    setMapPreview(result.data.imagePath);
    const next = {
      ...state.draft,
      floors: state.draft.floors.map((item) =>
        item.id === floor.id
          ? {
              ...item,
              asset: {
                ...item.asset,
                origin: "upload" as const,
                storageKey: result.data.imagePath,
                mimeType: file?.type || "image/jpeg",
              },
            }
          : item,
      ),
    };
    updateScene(next, "Mappa caricata e applicata al piano");
    setUploadStatus("Mappa caricata");
  };
  const uploadProjectionAsset = async (file?: File) => {
    if (!file || !floor || !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 4 * 1024 * 1024) return setStatus("Asset proiezione non valido: usa JPG, PNG, WebP o GIF fino a 4 MB.");
    const form = new FormData(); form.set("image", file); form.set("floor_label", `Overlay ${file.name}`);
    const result = await uploadTacticalSceneMapAction(campaignId, form);
    if (!result.success) return setStatus(result.error);
    const asset = { id: `asset-${result.data.id}`, origin: "upload" as const, storageKey: result.data.imagePath, mimeType: file.type, width: floor.width, height: floor.height };
    const item = { id: `overlay-${crypto.randomUUID()}`, type: file.type === "image/gif" ? "gif" as const : "image" as const, x: .5, y: .5, width: .35, height: .35, assetId: asset.id, src: result.data.imagePath, opacity: 1 };
    updateScene({ ...state.draft, assets: [...(state.draft.assets ?? []), asset], overlay: { ...state.draft.overlay, draft: [...state.draft.overlay.draft, item] } }, "Asset immagine persistente aggiunto alla proiezione");
  };
  const loadMissions = async () => {
    const result = await listTacticalMissionOptionsAction(campaignId);
    if (result.success) setMissionOptions(result.data);
  };
  const pointFromEvent = (event: React.PointerEvent<HTMLDivElement>) => { const box = event.currentTarget.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX-box.left)/box.width)), y: Math.max(0, Math.min(1, (event.clientY-box.top)/box.height)) }; };
  const editorPoint = (event: React.PointerEvent<HTMLDivElement>) => snapScenePoint(pointFromEvent(event), floor ? { cellSize: floor.grid?.cellSize ?? 1, width: floor.width, height: floor.height } : undefined, snapEnabled);
  const pointerDownEditor = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (projection || fowTool !== "select") return;
    const point = editorPoint(event); setEditorStart(point); event.currentTarget.setPointerCapture(event.pointerId);
    if (editorTool !== "select") return;
    const candidate = floor?.layers.flatMap((layer) => layer.features).find((feature) => feature.geometry.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < .04));
    const prop = floor?.props?.find((item) => Math.hypot(item.x - point.x, item.y - point.y) < .04);
    setSelectedFeatureId(candidate?.id); setSelectedPropId(prop?.id);
    editorDrag.current = { start: point, featureId: candidate?.id, propId: prop?.id, origin: candidate ? undefined : prop ? { x: prop.x, y: prop.y } : undefined };
  };
  const pointerUpEditor = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (projection || !floor || fowTool !== "select") return;
    const point = editorPoint(event); const start = editorStart; setEditorStart(undefined); const drag = editorDrag.current; editorDrag.current = undefined;
    if (!start) return;
    if (editorTool !== "select") {
      const x1 = Math.min(start.x, point.x), x2 = Math.max(start.x, point.x), y1 = Math.min(start.y, point.y), y2 = Math.max(start.y, point.y);
      if (x2-x1 < .01 || y2-y1 < .01) return;
      const kind = editorTool === "room" || editorTool === "corridor" ? "area" : editorTool;
      updateScene(addSceneFeature(state.draft, floor.id, { kind, geometry: [{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}], label: editorTool === "corridor" ? "Corridoio" : editorTool === "room" ? "Stanza" : editorTool === "door" ? "Porta" : "Muro", visible: true }), `${editorTool} aggiunto`); setEditorTool("select"); return;
    }
    if (drag?.featureId && (point.x !== start.x || point.y !== start.y)) { const dx = point.x-start.x, dy = point.y-start.y; const feature = floor.layers.flatMap((layer) => layer.features).find((item) => item.id === drag.featureId); if (feature) updateScene(updateSceneFeature(state.draft, feature.id, { geometry: feature.geometry.map((p) => ({ x: Math.max(0, Math.min(1, p.x+dx)), y: Math.max(0, Math.min(1, p.y+dy)) })) }), "Feature spostata"); }
    if (drag?.propId && drag.origin) updateScene({ ...state.draft, floors: state.draft.floors.map((item) => item.id === floor.id ? { ...item, props: (item.props ?? []).map((prop) => prop.id === drag.propId ? { ...prop, x: point.x, y: point.y } : prop) } : item) }, "Prop spostato");
  };
  const pointerMoveEditor = () => { /* capture is used so movement is committed on pointer-up */ };
  const commitFow = (next: TacticalScene, message: string) => { setFowUndo((items) => [...items, structuredClone(state)]); updateScene(next, message); };
  const pointerDownFow = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!floor || projection) return;
    const point = pointFromEvent(event);
    if (fowTool === "polygon") { setPolygonPoints((points) => [...points, point]); return; }
    if (fowTool !== "select" && fowTool !== "vertex") { setFowStart(point); event.currentTarget.setPointerCapture(event.pointerId); return; }
    const selected = regions.find((region) => region.id === selectedRegionId);
    const selectedVertex = fowTool === "vertex" && selected ? nearestVertexIndex(selected.polygon, point) : -1;
    const hit = selectedVertex >= 0 ? selected : hitTestFowRegion(regions, point);
    setSelectedRegionId(hit?.id);
    if (!hit) return;
    const vertexIndex = fowTool === "vertex" ? nearestVertexIndex(hit.polygon, point) : -1;
    if (fowTool === "vertex" && vertexIndex < 0) return;
    dragRef.current = { regionId: hit.id, start: point, polygon: hit.polygon, vertexIndex: vertexIndex >= 0 ? vertexIndex : undefined };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerUpFow = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!floor || projection) return;
    const point = pointFromEvent(event);
    if (fowStart && fowTool !== "select" && fowTool !== "vertex" && fowTool !== "polygon") {
      commitFow(addManualFow(state.draft, floor.id, makeFowPolygon(fowTool, fowStart, point)), "Regione FoW aggiunta"); setFowStart(undefined); return;
    }
    const drag = dragRef.current; dragRef.current = undefined;
    if (!drag) return;
    const polygon = drag.vertexIndex === undefined ? translatePolygon(drag.polygon, point.x-drag.start.x, point.y-drag.start.y) : moveFowVertex(drag.polygon, drag.vertexIndex, point);
    if (JSON.stringify(polygon) !== JSON.stringify(drag.polygon)) commitFow(updateFowRegion(state.draft, drag.regionId, polygon), drag.vertexIndex === undefined ? "Regione FoW spostata" : "Vertice FoW modificato");
  };
  const pointerDownEffect = (event: React.PointerEvent<HTMLDivElement>) => { if (projection || !floor || !effectMode) return; const point = pointFromEvent(event); setEffectStart(point); event.currentTarget.setPointerCapture(event.pointerId); };
  const pointerUpEffect = (event: React.PointerEvent<HTMLDivElement>) => { if (projection || !floor || !effectStart) return; const point = pointFromEvent(event); updateScene(addProjectionEffect(state.draft, floor.id, effectKind, effectGeometry, makeEffectPolygon(effectGeometry, effectStart, point)), `${effectKind} aggiunto alla proiezione`); setEffectStart(undefined); };
  const finishPolygon = () => { if (!floor || polygonPoints.length < 3) return setStatus("Servono almeno tre punti."); commitFow(addManualFow(state.draft, floor.id, polygonPoints), "Poligono FoW aggiunto"); setPolygonPoints([]); };
  const previewImport = () => { try { const preview = previewFoundryFow(JSON.parse(importText)); setImportPreview(preview); setImportError(""); } catch (error) { setImportPreview(undefined); setImportError(error instanceof Error ? error.message : "Import non valido"); } };
  const applyImport = (mode: "merge" | "replace") => { if (!floor || !importPreview) return; commitFow(applyFoundryFow(state.draft, floor.id, importPreview, mode), mode === "merge" ? "Regioni importate e unite" : "Regioni del piano sostituite dall’import"); setImportPreview(undefined); };
  const undoFow = async () => { const previous = fowUndo.at(-1); if (!previous) return; if (previous.published && savedSceneId && savedPublicationId) { const result = await updateTacticalFowRuntimeAction(savedSceneId, savedPublicationId, savedRevisionNo ?? previous.published.revisionNo, JSON.stringify(previous.published)); if (!result.success) return setStatus(result.error); } setState(previous); setFowUndo((items) => items.slice(0,-1)); setSelectedRegionId(undefined); setStatus("Ultima operazione FoW annullata"); };
  const newScene = async () => {
    if (pendingUploadedMapId) {
      await discardPendingTacticalSceneMapAction(
        campaignId,
        pendingUploadedMapId,
      );
    }
    const fresh = createLocalWorkspaceScene(campaignId, "Nuova scena");
    setState(fresh);
    setSavedSceneId(undefined);
    setSavedRevisionId(undefined);
    setSavedRevisionNo(undefined);
    setSceneName(fresh.draft.name);
    setMapPreview("");
    setUploadStatus("");
    setPendingUploadedMapId(undefined);
    setActiveFloorId(fresh.draft.floors[0]?.id);
    setStatus("Nuova bozza: carica una mappa prima di pubblicare");
  };
  const persistDraft = async () => {
    const raw = JSON.stringify(state.draft);
    const result =
      savedSceneId && savedRevisionId && savedRevisionNo !== undefined
        ? await saveTacticalSceneRevisionAction(
            savedSceneId,
            savedRevisionNo,
            raw,
          )
        : await createTacticalSceneAction(campaignId, raw);
    if (!result.success) {
      setStatus(result.error);
      return false;
    }
    setSavedSceneId(
      "sceneId" in result.data ? result.data.sceneId : savedSceneId,
    );
    setSavedRevisionId(result.data.revisionId);
    setSavedRevisionNo(result.data.revisionNo);
    setState((current) =>
      "document" in result.data
        ? { ...current, draft: result.data.document }
        : current,
    );
    setPendingUploadedMapId(undefined);
    setStatus("Bozza salvata su R6.4");
    return true;
  };
  const publish = async () => {
    try {
      if (
        !savedSceneId ||
        !savedRevisionId ||
        savedRevisionNo === undefined ||
        state.draft.revisionNo !== savedRevisionNo
      ) {
        setStatus(
          "Salva prima la bozza R6.4: la pubblicazione richiede la revisione persistita esatta.",
        );
        return;
      }
      const result = await publishTacticalSceneAction(
        savedSceneId,
        savedRevisionId,
        savedRevisionNo,
      );
      if (!result.success) {
        setStatus(result.error);
        return;
      }
      const next = publishWorkspace(state);
      const published = result.data.document;
      setState({ ...next, draft: published, published });
      setSavedPublicationId(result.data.publicationId);
      setStatus("Pubblicata su R6.4 e pronta per la proiezione");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Pubblicazione non riuscita",
      );
    }
  };
  const toggleRegion = async (regionId: string, revealed: boolean) => {
    setFowUndo((items) => [...items, structuredClone(state)]);
    if (!state.published || !savedSceneId || !savedPublicationId) {
      updateScene({ ...state.draft, fow: { ...state.draft.fow, regions: state.draft.fow.regions.map((region) => region.id === regionId ? { ...region, revealed } : region) } }, revealed ? "Regione rivelata nella bozza" : "Regione nascosta nella bozza");
      return;
    }
    const next = updatePublishedFow(state, regionId, revealed);
    const result = await updateTacticalFowRuntimeAction(
      savedSceneId,
      savedPublicationId,
      savedRevisionNo ?? state.published.revisionNo,
      JSON.stringify(next.published),
    );
    if (result.success) {
      setState(next);
      setStatus(
        revealed
          ? "Regione rivelata nella proiezione"
          : "Regione nascosta nella proiezione",
      );
    } else { setFowUndo((items) => items.slice(0, -1)); setStatus(result.error); }
  };
  const toggleAllRegions = async (revealed: boolean) => {
    if (!floor) return;
    setFowUndo((items) => [...items, structuredClone(state)]);
    if (!state.published || !savedSceneId || !savedPublicationId) {
      updateScene(setAllFow(state.draft, revealed, floor.id), revealed ? "Tutte le regioni del piano rivelate" : "Tutte le regioni del piano nascoste");
      return;
    }
    const published = setAllFow(state.published, revealed, floor.id);
    const next = { ...state, published };
    const result = await updateTacticalFowRuntimeAction(savedSceneId, savedPublicationId, savedRevisionNo ?? published.revisionNo, JSON.stringify(published));
    if (result.success) { setState(next); setStatus(revealed ? "Piano rivelato nella proiezione" : "Piano nascosto nella proiezione"); }
    else { setFowUndo((items) => items.slice(0,-1)); setStatus(result.error); }
  };
  const resetFloorFow = async () => {
    if (!floor) return;
    setFowUndo((items) => [...items, structuredClone(state)]);
    if (!state.published || !savedSceneId || !savedPublicationId) { updateScene(resetFow(state.draft, floor.id), "FoW del piano resettata"); return; }
    const published = resetFow(state.published, floor.id);
    const result = await updateTacticalFowRuntimeAction(savedSceneId, savedPublicationId, savedRevisionNo ?? published.revisionNo, JSON.stringify(published));
    if (result.success) { setState({ ...state, published }); setStatus("FoW del piano resettata nella proiezione"); }
    else { setFowUndo((items) => items.slice(0,-1)); setStatus(result.error); }
  };
  const rollbackPublished = async () => {
    if (savedSceneId) {
      const result = await rollbackTacticalScenePublicationAction(savedSceneId);
      if (!result.success) {
        setStatus(result.error);
        return;
      }
    }
    setSavedPublicationId(undefined);
    setProjection(false);
    run(() => rollbackWorkspacePublication(state), "Pubblicazione ritirata");
  };

  const overlayKinds: { type: WorkspaceOverlayKind; label: string }[] = [
    { type: "text", label: "Testo" },
    { type: "marker", label: "Marker" },
    { type: "area", label: "Area" },
    { type: "circle", label: "Cerchio" },
    { type: "measure", label: "Misura" },
    { type: "timer", label: "Timer" },
  ];
  const updateOverlay = (overlayId: string, patch: Record<string, unknown>, message: string) => updateScene({ ...state.draft, overlay: { ...state.draft.overlay, draft: state.draft.overlay.draft.map((item) => item.id === overlayId ? { ...item, ...patch } : item) } }, message);
  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 p-3 text-barber-paper sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-barber-gold">
            Workspace tattico · R6.3
          </p>
          <h1 className="mt-1 font-serif text-2xl text-barber-paper">
            {state.draft.name}
          </h1>
          <p className="mt-1 text-sm text-barber-paper/55">
            {campaignName} · solo GM/Admin · revisione locale{" "}
            {state.draft.revisionNo}
          </p>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100">
          {status}
        </span>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="flex min-h-[60vh] flex-col rounded-2xl border border-barber-gold/20 bg-black/20 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-barber-paper/75">
              <Layers3 className="h-4 w-4 text-barber-gold" />
              {floor?.label ?? "Piano principale"}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={updateGrid}>
                <Grid3X3 className="mr-1.5 h-3.5 w-3.5" />
                {gridVisible ? "Nascondi griglia" : "Mostra griglia"}
              </Button>
              <Button
                size="sm"
                variant={projection ? "default" : "outline"}
                onClick={() => setProjection(!projection)}
                disabled={!state.published}
              >
                <MonitorPlay className="mr-1.5 h-3.5 w-3.5" />
                {projection ? "Torna alla bozza" : "Proietta"}
              </Button>
            </div>
          </div>
            <div className="mb-2 flex flex-wrap gap-1">
              {(["select","vertex","rectangle","circle","spray","polygon"] as const).map((tool) => <Button key={tool} size="sm" variant={fowTool === tool ? "default" : "outline"} onClick={() => { setFowTool(tool); setPolygonPoints([]); }}>{tool}</Button>)}
              {fowTool === "polygon" ? <Button size="sm" disabled={polygonPoints.length < 3} onClick={finishPolygon}>Chiudi poligono ({polygonPoints.length})</Button> : null}
              <Button size="sm" variant="outline" onClick={() => void toggleAllRegions(true)}>Rivela tutti</Button>
              <Button size="sm" variant="outline" onClick={() => void toggleAllRegions(false)}>Nascondi tutti</Button>
              <Button size="sm" variant="outline" onClick={() => void resetFloorFow()}>Reset</Button>
              <Button size="sm" variant="outline" disabled={!fowUndo.length} onClick={() => void undoFow()}>Undo FoW</Button>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-1 border-t border-white/10 pt-2">
              <span className="mr-1 text-xs text-barber-paper/55">Effetti:</span>
              <select aria-label="Tipo effetto" value={effectKind} onChange={(event) => setEffectKind(event.target.value as ProjectionEffectKind)} className="rounded bg-black/30 px-1 py-1 text-xs">
                {([["fire","Fuoco"],["poison","Veleno"],["smoke","Fumo"],["mist","Fumini"],["ice","Ghiaccio"],["lightning","Fulmine"],["darkness","Oscurità"]] as const).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select aria-label="Geometria effetto" value={effectGeometry} onChange={(event) => setEffectGeometry(event.target.value as ProjectionEffectGeometry)} className="rounded bg-black/30 px-1 py-1 text-xs"><option value="square">Quadrato</option><option value="circle">Cerchio</option><option value="spray">Spray</option><option value="polygon">Poligono</option></select>
              <Button size="sm" variant={effectMode ? "default" : "outline"} onClick={() => { setEffectMode(!effectMode); setEffectStart(undefined); setFowTool("select"); }}>{effectMode ? "Disegna effetto…" : "Disegna effetto"}</Button>
              <Button size="sm" variant="outline" onClick={() => updateScene(setProjectionDayNight(state.draft, state.draft.effects?.dayNight === "night" ? "day" : "night"), state.draft.effects?.dayNight === "night" ? "Giorno" : "Notte")}>{state.draft.effects?.dayNight === "night" ? "Giorno" : "Notte"}</Button>
              <Button size="sm" variant="outline" onClick={() => { const next = { ...state.draft, effects: { ...(state.draft.effects ?? { draft: [], published: null, dayNight: "day" as const }), draft: [] } }; updateScene(next, "Effetti puliti"); }}>Pulisci</Button>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <div className="aspect-video w-full touch-none" onPointerDown={(event) => { if (effectMode) pointerDownEffect(event); else pointerDownFow(event); }} onPointerUp={(event) => { if (effectMode) pointerUpEffect(event); else pointerUpFow(event); }}>
                <Stage
                  scene={projection && state.published ? state.published : state.draft}
                  projection={projection}
                  activeFloorId={floor?.id}
                  selectedRegionId={selectedRegionId}
                  onEditorPointerDown={pointerDownEditor}
                  onEditorPointerMove={pointerMoveEditor}
                  onEditorPointerUp={pointerUpEditor}
                />
              </div>
          </div>
          <p className="mt-3 text-xs text-barber-paper/45">
            {projection
              ? "Questa superficie mostra esclusivamente l’istantanea pubblicata. Il draft GM non viene esposto."
              : "Bozza locale non persistente: nessuna modifica viene scritta nel database."}
          </p>
        </section>
        <aside className="space-y-3">
          <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4">
            <h2 className="font-serif text-lg">Identità e mappa</h2>
            <input
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value)}
              className="mt-2 w-full rounded border border-white/10 bg-black/20 px-2 py-1 text-sm"
              aria-label="Nome scena"
            />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void newScene()}
              >
                Nuova scena
              </Button>
              <Button
                size="sm"
                onClick={() => void rename()}
                disabled={!savedSceneId}
              >
                Rinomina
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void archive()}
                disabled={!savedSceneId}
              >
                Archivia
              </Button>
            </div>
            <select
              className="mt-3 w-full rounded border border-white/10 bg-black/30 p-2 text-sm"
              value={state.draft.linkedMissionId ?? ""}
              onFocus={() => void loadMissions()}
              onChange={(e) =>
                updateScene(
                  { ...state.draft, linkedMissionId: e.target.value || null },
                  "Missione aggiornata",
                )
              }
              aria-label="Missione collegata"
            >
              <option value="">Nessuna missione</option>
              {missionOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            <label className="mt-3 block text-xs text-barber-paper/60">
              Carica mappa
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="mt-1 block w-full text-xs"
                onChange={(e) => void upload(e.target.files?.[0])}
              />
            </label>
            <input
              placeholder="URL Google Drive"
              className="mt-2 w-full rounded border border-white/10 bg-black/20 px-2 py-1 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  void upload(undefined, e.currentTarget.value);
              }}
              aria-label="URL mappa"
            />
            {uploadStatus ? (
              <p className="mt-2 text-xs text-amber-200">{uploadStatus}</p>
            ) : null}
            {mapPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob or validated remote preview
              <img
                src={mapPreview}
                alt="Anteprima mappa"
                className="mt-3 aspect-video w-full rounded-lg object-cover"
              />
            ) : null}
          </section>
          <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4">
            <h2 className="font-serif text-lg">Editor scena</h2>
            <p className="mt-1 text-xs text-barber-paper/50">Layer, stanze, prop e note GM private sul piano attivo.</p>
            <div className="mt-3 space-y-1">
              {(floor?.layers ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder).map((layer) => (
                <div key={layer.id} className="flex items-center gap-2 rounded border border-white/10 px-2 py-1.5 text-xs">
                  <button type="button" className="text-left" onClick={() => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => item.id === floor.id ? { ...item, layers: item.layers.map((candidate) => candidate.id === layer.id ? { ...candidate, visible: !candidate.visible } : candidate) } : item) }, "Visibilità layer aggiornata")}>{layer.visible ? "◉" : "○"}</button>
                  <input aria-label={`Nome ${layer.label}`} className="min-w-0 flex-1 rounded border border-white/10 bg-black/20 px-1" value={layer.label} onChange={(event) => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => item.id === floor.id ? updateSceneLayer(item, layer.id, { label: event.target.value }) : item) }, "Nome layer aggiornato")} />
                  <select aria-label={`Stile ${layer.label}`} className="w-20 rounded bg-black/30" value={layer.style ?? "classic"} onChange={(event) => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => item.id === floor.id ? updateSceneLayer(item, layer.id, { style: event.target.value }) : item) }, "Stile layer aggiornato")}><option value="classic">Classico</option><option value="blueprint">Blueprint</option><option value="ink">Inchiostro</option></select>
                  <input aria-label={`Opacità ${layer.label}`} type="range" min="0" max="1" step="0.05" value={layer.opacity} onChange={(event) => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => item.id === floor.id ? updateSceneLayer(item, layer.id, { opacity: Number(event.target.value) }) : item) }, "Opacità layer aggiornata")} className="w-20" />
                  <button type="button" aria-label={`Layer ${layer.label} su`} onClick={() => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => { if (item.id !== floor.id) return item; const ordered = [...item.layers].sort((a,b) => a.sortOrder-b.sortOrder); const index = ordered.findIndex((candidate) => candidate.id === layer.id); if (index <= 0) return item; [ordered[index-1], ordered[index]] = [ordered[index]!, ordered[index-1]!]; return { ...item, layers: ordered.map((candidate, sortOrder) => ({ ...candidate, sortOrder })) }; }) }, "Layer spostato")}>↑</button>
                  <button type="button" aria-label={`Layer ${layer.label} giù`} onClick={() => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => { if (item.id !== floor.id) return item; const ordered = [...item.layers].sort((a,b) => a.sortOrder-b.sortOrder); const index = ordered.findIndex((candidate) => candidate.id === layer.id); if (index < 0 || index >= ordered.length-1) return item; [ordered[index], ordered[index+1]] = [ordered[index+1]!, ordered[index]!]; return { ...item, layers: ordered.map((candidate, sortOrder) => ({ ...candidate, sortOrder })) }; }) }, "Layer spostato")}>↓</button>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {(["select", "room", "corridor", "wall", "door"] as const).map((tool) => <Button key={tool} size="sm" variant={editorTool === tool ? "default" : "outline"} onClick={() => { setFowTool("select"); setEditorTool(tool); }}>{tool === "select" ? "Seleziona" : tool === "room" ? "Stanza" : tool === "corridor" ? "Corridoio" : tool === "wall" ? "Muro" : "Porta"}</Button>)}
              <Button size="sm" variant="outline" onClick={() => floor && selectedFeatureId && updateScene(removeSceneFeature(state.draft, selectedFeatureId), "Feature eliminata")}>Elimina feature</Button>
              <Button size="sm" variant="outline" onClick={() => floor && selectedPropId && updateScene(removeSceneProp(state.draft, floor.id, selectedPropId), "Prop eliminato")}>Elimina prop</Button>
              <Button size="sm" variant={snapEnabled ? "default" : "outline"} onClick={() => setSnapEnabled(!snapEnabled)}>Snap griglia</Button>
              <Button size="sm" variant="outline" onClick={() => floor && updateScene(addSceneProp(state.draft, floor.id, { kind: "prop", x: .5, y: .5, label: "Prop" }), "Prop aggiunto")}>Prop</Button>
              <Button size="sm" variant="outline" onClick={() => floor && updateScene(addSceneGmNote(state.draft, floor.id, { x: .55, y: .18, text: "Nota GM" }), "Nota GM aggiunta")}>Nota GM</Button>
              <Button size="sm" variant="outline" onClick={() => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => item.id === floor.id ? deriveSceneFloorPreview(item) : item) }, "Anteprima piano generata")}>Anteprima piano</Button>
              <Button size="sm" variant="outline" onClick={() => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => item.id === floor.id ? addSceneLayer(item) : item) }, "Layer aggiunto")}>Nuovo layer</Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              <label>Stanze<input type="number" min="2" max="14" value={editorRoomCount} onChange={(e) => setEditorRoomCount(Number(e.target.value))} className="w-full rounded bg-black/20 px-1" /></label>
              <label>Seed<input value={editorSeed} onChange={(e) => setEditorSeed(e.target.value)} className="w-full rounded bg-black/20 px-1" /></label>
              <label>Dimensione<select value={editorRoomSize} onChange={(e) => setEditorRoomSize(e.target.value as typeof editorRoomSize)} className="w-full rounded bg-black/20 px-1"><option value="small">Piccole</option><option value="medium">Medie</option><option value="large">Grandi</option></select></label>
              <label>Tema prop<select value={editorPropTheme} onChange={(e) => setEditorPropTheme(e.target.value as typeof editorPropTheme)} className="w-full rounded bg-black/20 px-1"><option value="dungeon">Dungeon</option><option value="taverna">Taverna</option><option value="caverna">Caverna</option></select></label>
              <label><input type="checkbox" checked={editorAppend} onChange={(e) => setEditorAppend(e.target.checked)} /> Append</label><label><input type="checkbox" checked={editorWithDoors} onChange={(e) => setEditorWithDoors(e.target.checked)} /> Porte</label><label><input type="checkbox" checked={editorWithProps} onChange={(e) => setEditorWithProps(e.target.checked)} /> Prop</label>
              <Button size="sm" onClick={() => floor && updateScene({ ...state.draft, floors: state.draft.floors.map((item) => item.id === floor.id ? generateSceneDungeon(item, { roomCount: editorRoomCount, seed: editorSeed, roomSize: editorRoomSize, propTheme: editorPropTheme, append: editorAppend, withDoors: editorWithDoors, withProps: editorWithProps }) : item) }, "Dungeon generato")}>Genera dungeon</Button>
            </div>
            <p className="mt-2 text-[11px] text-barber-paper/45">Le note GM e gli strumenti dell’editor sono esclusi dalla proiezione pubblicata.</p>
            <div className="mt-3 space-y-1">
              {(floor?.gmNotes ?? []).map((note) => <div key={note.id} className="rounded border border-sky-300/20 p-1.5 text-xs"><button type="button" className="w-full text-left" onClick={() => setSelectedNoteId(note.id)}>✎ {note.text}</button>{selectedNoteId === note.id ? <div className="mt-1 grid gap-1"><input aria-label="Testo nota GM" value={note.text} onChange={(event) => floor && updateScene(updateSceneGmNote(state.draft, floor.id, note.id, { text: event.target.value }), "Nota GM modificata")} className="rounded bg-black/30 px-1" /><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => floor && updateScene(updateSceneGmNote(state.draft, floor.id, note.id, { x: Math.min(1, note.x + .05), y: Math.min(1, note.y + .05) }), "Nota GM spostata")}>Sposta</Button><Button size="sm" variant="outline" onClick={() => floor && updateScene(removeSceneGmNote(state.draft, floor.id, note.id), "Nota GM eliminata")}>Elimina</Button></div></div> : null}</div>)}
            </div>
          </section>
          <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4">
            <h2 className="font-serif text-lg">Piani</h2>
            <select
              className="mt-2 w-full rounded border border-white/10 bg-black/30 p-2 text-sm"
              value={floor?.id ?? ""}
              onChange={(e) => setActiveFloorId(e.target.value)}
              aria-label="Piano attivo"
            >
              {state.draft.floors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <div className="mt-2 flex gap-1">
              <Button
                size="sm"
                onClick={() => {
                  const id = `floor-${crypto.randomUUID()}`;
                  updateScene(
                    addSceneFloor(state.draft, {
                      id,
                      label: `Piano ${state.draft.floors.length + 1}`,
                      sortOrder: state.draft.floors.length,
                      width: 1600,
                      height: 900,
                      asset: floor!.asset,
                      layers: [],
                    }),
                    "Piano aggiunto",
                  );
                  setActiveFloorId(id);
                }}
              >
                Aggiungi
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!floor || state.draft.floors.length < 2}
                onClick={() => {
                  const i = state.draft.floors.findIndex(
                    (x) => x.id === floor?.id,
                  );
                  if (i > 0)
                    updateScene(
                      reorderSceneFloors(
                        state.draft,
                        state.draft.floors
                          .map((x) => x.id)
                          .toSpliced(
                            i - 1,
                            2,
                            state.draft.floors[i].id,
                            state.draft.floors[i - 1].id,
                          ),
                      ),
                      "Piano spostato",
                    );
                }}
              >
                Su
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!floor || state.draft.floors.length < 2}
                onClick={() => {
                  const i = state.draft.floors.findIndex(
                    (x) => x.id === floor?.id,
                  );
                  if (i < state.draft.floors.length - 1)
                    updateScene(
                      reorderSceneFloors(
                        state.draft,
                        state.draft.floors
                          .map((x) => x.id)
                          .toSpliced(
                            i,
                            2,
                            state.draft.floors[i + 1].id,
                            state.draft.floors[i].id,
                          ),
                      ),
                      "Piano spostato",
                    );
                }}
              >
                Giù
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!floor || state.draft.floors.length < 2}
                onClick={() => {
                  if (floor) {
                    const next = removeSceneFloor(state.draft, floor.id);
                    setActiveFloorId(next.floors[0].id);
                    updateScene(next, "Piano eliminato");
                  }
                }}
              >
                Elimina
              </Button>
            </div>
            {floor ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <input
                  value={floor.label}
                  onChange={(e) =>
                    updateScene(
                      {
                        ...state.draft,
                        floors: state.draft.floors.map((x) =>
                          x.id === floor.id
                            ? { ...x, label: e.target.value }
                            : x,
                        ),
                      },
                      "Piano aggiornato",
                    )
                  }
                  aria-label="Nome piano"
                />
                <input
                  type="number"
                  value={floor.width}
                  onChange={(e) =>
                    updateScene(
                      {
                        ...state.draft,
                        floors: state.draft.floors.map((x) =>
                          x.id === floor.id
                            ? { ...x, width: Number(e.target.value) }
                            : x,
                        ),
                      },
                      "Dimensioni aggiornate",
                    )
                  }
                  aria-label="Larghezza piano"
                />
                <input
                  type="number"
                  value={floor.height}
                  onChange={(e) =>
                    updateScene(
                      {
                        ...state.draft,
                        floors: state.draft.floors.map((x) =>
                          x.id === floor.id
                            ? { ...x, height: Number(e.target.value) }
                            : x,
                        ),
                      },
                      "Dimensioni aggiornate",
                    )
                  }
                  aria-label="Altezza piano"
                />
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(floor.grid?.visible)}
                    onChange={() =>
                      updateScene(
                        updateSceneFloorGrid(state.draft, floor.id, {
                          ...(floor.grid ?? {
                            kind: "square" as const,
                            cellSize: 80,
                            offsetX: 0,
                            offsetY: 0,
                          }),
                          visible: !floor.grid?.visible,
                        }),
                        "Griglia aggiornata",
                      )
                    }
                  />{" "}
                  Griglia
                </label>
                <input
                  type="number"
                  value={floor.grid?.cellSize ?? 80}
                  onChange={(e) =>
                    updateScene(
                      updateSceneFloorGrid(state.draft, floor.id, {
                        ...(floor.grid ?? {
                          kind: "square" as const,
                          visible: true,
                          offsetX: 0,
                          offsetY: 0,
                        }),
                        cellSize: Number(e.target.value),
                      }),
                      "Cella aggiornata",
                    )
                  }
                  aria-label="Dimensione cella"
                />
                <input
                  type="number"
                  value={floor.grid?.offsetX ?? 0}
                  onChange={(e) =>
                    updateScene(
                      updateSceneFloorGrid(state.draft, floor.id, {
                        ...(floor.grid ?? {
                          kind: "square" as const,
                          visible: true,
                          cellSize: 80,
                          offsetY: 0,
                        }),
                        offsetX: Number(e.target.value),
                      }),
                      "Offset X aggiornato",
                    )
                  }
                  aria-label="Offset X griglia"
                />
                <input
                  type="number"
                  value={floor.grid?.offsetY ?? 0}
                  onChange={(e) =>
                    updateScene(
                      updateSceneFloorGrid(state.draft, floor.id, {
                        ...(floor.grid ?? {
                          kind: "square" as const,
                          visible: true,
                          cellSize: 80,
                          offsetX: 0,
                        }),
                        offsetY: Number(e.target.value),
                      }),
                      "Offset Y aggiornato",
                    )
                  }
                  aria-label="Offset Y griglia"
                />
              </div>
            ) : null}
          </section>
          <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4">
            <h2 className="font-serif text-lg">Controllo scena</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  run(
                    () => setWorkspaceLifecycle(state, "ready"),
                    "Scena pronta localmente",
                  )
                }
                disabled={state.draft.lifecycle !== "draft"}
              >
                Pronta
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void persistDraft()}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Salva bozza
              </Button>
              <Button
                size="sm"
                onClick={() => void publish()}
                disabled={
                  state.draft.lifecycle !== "ready" &&
                  state.draft.lifecycle !== "live"
                }
              >
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Pubblica
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setProjection(false);
                  run(
                    () => discardWorkspaceRevision(state),
                    "Ultima revisione locale scartata",
                  );
                }}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Scarta
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void rollbackPublished()}
                disabled={!state.published}
              >
                Rollback
              </Button>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-barber-paper/60">
              La bozza e la pubblicazione sono revisioni separate. Salva prima
              di pubblicare; il runtime FoW viene aggiornato senza mutare la
              revisione.
            </p>
          </section>
          <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4">
            <h2 className="font-serif text-lg">FoW</h2>
            <p className="mt-1 text-xs text-barber-paper/50">
              Origine:{" "}
              {state.draft.fow.regions.some((r) => r.origin === "imported")
                ? "Foundry importato"
                : state.draft.fow.regions.some((r) => r.origin === "derived")
                  ? "Derivato"
                  : "Manuale"}
            </p>
            <div className="mt-3 space-y-2">
              {regions.length ? (
                regions.map((region) => (
                  <div
                    key={region.id}
                    className={`rounded-lg border px-2 py-1.5 text-xs ${selectedRegionId === region.id ? "border-amber-300 bg-amber-300/10" : "border-white/10"}`}
                    onClick={() => setSelectedRegionId(region.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>Regione {region.id.slice(0, 8)} · {region.origin}</span>
                      <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); void toggleRegion(region.id, !runtimeReveal(region.id, region.revealed)); }} aria-label={runtimeReveal(region.id, region.revealed) ? "Nascondi regione" : "Rivela regione"}>
                        {runtimeReveal(region.id, region.revealed) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {selectedRegionId === region.id ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" onClick={() => commitFow(updateFowRegion(state.draft, region.id, scalePolygonFromCenter(region.polygon, 0.9)), "Regione ridotta")}>Riduci</Button>
                        <Button size="sm" variant="outline" onClick={() => commitFow(updateFowRegion(state.draft, region.id, scalePolygonFromCenter(region.polygon, 1.1)), "Regione ingrandita")}>Ingrandisci</Button>
                        <Button size="sm" variant="outline" onClick={() => { commitFow(deleteFowRegion(state.draft, region.id), "Regione eliminata"); setSelectedRegionId(undefined); }}>Elimina</Button>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-xs text-barber-paper/45">
                  Nessuna regione disponibile. Puoi importarla nel percorso
                  legacy e rivederla qui in sola lettura.
                </p>
              )}
            </div>
            <div className="mt-4 border-t border-white/10 pt-3">
              <label className="block text-xs text-barber-paper/60">Import Foundry / Dungeon Alchemist
                <input type="file" accept="application/json,.json" className="mt-1 block w-full" onChange={(event) => { const file = event.target.files?.[0]; if (file) void file.text().then((text) => { setImportText(text); try { setImportPreview(previewFoundryFow(JSON.parse(text))); setImportError(""); } catch (error) { setImportPreview(undefined); setImportError(error instanceof Error ? error.message : "Import non valido"); } }); }} />
              </label>
              <textarea value={importText} onChange={(event) => { setImportText(event.target.value); setImportPreview(undefined); }} rows={5} placeholder="Incolla qui il JSON della scena" className="mt-2 w-full rounded border border-white/10 bg-black/20 p-2 text-xs" />
              <Button className="mt-2" size="sm" variant="outline" onClick={previewImport}>Genera anteprima</Button>
              {importError ? <p className="mt-2 text-xs text-red-300">{importError}</p> : null}
              {importPreview ? (
                <div className="mt-2 rounded border border-amber-300/30 bg-amber-300/5 p-2 text-xs">
                  <p>{importPreview.sceneName}: {importPreview.regions.length} regioni · {importPreview.width}×{importPreview.height} · griglia {importPreview.grid}</p>
                  <svg className="mt-2 aspect-video w-full bg-black/30" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Anteprima import FoW">{importPreview.regions.map((region, index) => <polygon key={index} points={region.polygon.map((point) => `${point.x},${point.y}`).join(" ")} fill="#60a5fa33" stroke="#93c5fd" strokeWidth=".004" />)}</svg>
                  <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => applyImport("merge")}>Merge</Button><Button size="sm" variant="outline" onClick={() => applyImport("replace")}>Sostituisci piano</Button></div>
                </div>
              ) : null}
            </div>
            <Button
              className="mt-3 w-full"
              size="sm"
              variant="outline"
              onClick={() =>
                run(
                  () => materializeWorkspaceFow(state),
                  "FoW materializzata localmente",
                )
              }
              disabled={Boolean(state.published)}
            >
              Applica reveal locali
            </Button>
          </section>
          <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4">
            <h2 className="font-serif text-lg">Effetti proiezione</h2>
            <p className="mt-1 text-xs text-barber-paper/50">Effetti atmosferici effimeri nella sessione; la bozza mantiene la configurazione fino alla pubblicazione.</p>
            <div className="mt-2 space-y-1">
              {(state.draft.effects?.draft ?? []).filter((effect) => effect.floorId === floor?.id).map((effect) => <div key={effect.id} className={`rounded border px-2 py-1.5 text-xs ${selectedEffectId === effect.id ? "border-amber-300 bg-amber-300/10" : "border-white/10"}`} onClick={() => setSelectedEffectId(effect.id)}><div className="flex items-center justify-between"><span>{effect.kind} · {effect.geometry}</span><button type="button" onClick={(event) => { event.stopPropagation(); updateScene(updateProjectionEffect(state.draft, effect.id, { visible: !effect.visible }), effect.visible ? "Effetto nascosto" : "Effetto mostrato"); }}>{effect.visible ? "Nascondi" : "Mostra"}</button></div>{selectedEffectId === effect.id ? <div className="mt-1 flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => updateScene(updateProjectionEffect(state.draft, effect.id, { scale: effect.scale * 1.15 }), "Effetto ingrandito")}>Ridimensiona +</Button><Button size="sm" variant="outline" onClick={() => updateScene(updateProjectionEffect(state.draft, effect.id, { scale: effect.scale * .87 }), "Effetto ridotto")}>Ridimensiona −</Button><Button size="sm" variant="outline" onClick={() => updateScene(updateProjectionEffect(state.draft, effect.id, { polygon: effect.polygon.map((point) => ({ x: Math.min(1, point.x + .03), y: Math.min(1, point.y + .03) })) }), "Effetto spostato")}>Sposta</Button><Button size="sm" variant="outline" onClick={() => { updateScene(removeProjectionEffect(state.draft, effect.id), "Effetto eliminato"); setSelectedEffectId(undefined); }}>Elimina</Button></div> : null}</div>)}
              {!(state.draft.effects?.draft ?? []).length ? <p className="text-xs text-barber-paper/45">Nessun effetto. Seleziona geometria e tipo sopra, poi disegna sulla mappa.</p> : null}
            </div>
          </section>
          <section className="rounded-2xl border border-barber-gold/20 bg-black/20 p-4">
            <h2 className="font-serif text-lg">Overlay</h2>
            <p className="mt-1 text-xs leading-relaxed text-barber-paper/50">
              Aggiungi elementi alla bozza; la pubblicazione ne cattura
              un’istantanea indipendente.
            </p>
            <input
              value={overlayLabel}
              onChange={(event) => setOverlayLabel(event.target.value)}
              placeholder="Etichetta opzionale"
              className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-barber-paper outline-none focus:border-barber-gold/60"
              aria-label="Etichetta overlay"
            />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {overlayKinds.map(({ type, label }) => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    run(
                      () => addWorkspaceOverlay(state, type, overlayLabel),
                      `${label} aggiunto alla bozza`,
                    )
                  }
                >
                  {label}
                </Button>
              ))}
            </div>
            <label className="mt-3 block text-xs text-barber-paper/60">Asset immagine/GIF sulla proiezione
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="mt-1 block w-full text-xs" onChange={(event) => void uploadProjectionAsset(event.target.files?.[0])} />
            </label>
            <div className="mt-3 space-y-1">
              {state.draft.overlay.draft.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded border border-white/10 px-2 py-1 text-xs"
                >
                  <span>
                    {item.type}
                    {"text" in item
                      ? ` · ${item.text}`
                      : "label" in item
                        ? ` · ${item.label ?? ""}`
                        : ""}
                  </span>
                  <div className="flex items-center gap-1"><Button size="sm" variant="ghost" onClick={() => updateOverlay(item.id, { visible: item.visible === false }, item.visible === false ? "Overlay mostrato" : "Overlay nascosto")}>{item.visible === false ? "Mostra" : "Nascondi"}</Button><Button size="sm" variant="ghost" onClick={() => {
                    if (item.type === "area") updateOverlay(item.id, { polygon: item.polygon.map((point) => ({ x: Math.min(1, point.x + .03), y: Math.min(1, point.y + .03) })) }, "Overlay spostato");
                    else if ("x" in item && "y" in item) updateOverlay(item.id, { x: Math.min(1, item.x + .03), y: Math.min(1, item.y + .03) }, "Overlay spostato");
                  }}>Sposta</Button><Button size="sm" variant="ghost" onClick={() => {
                    if (item.type === "image" || item.type === "gif") updateOverlay(item.id, { width: Math.min(1, item.width * 1.15), height: Math.min(1, item.height * 1.15) }, "Overlay ridimensionato");
                    else if (item.type === "circle" || item.type === "measure") updateOverlay(item.id, { radius: Math.min(1, item.radius * 1.15) }, "Overlay ridimensionato");
                    else if (item.type === "area") { const cx = item.polygon.reduce((sum, point) => sum + point.x, 0) / item.polygon.length, cy = item.polygon.reduce((sum, point) => sum + point.y, 0) / item.polygon.length; updateOverlay(item.id, { polygon: item.polygon.map((point) => ({ x: Math.max(0, Math.min(1, cx + (point.x - cx) * 1.15)), y: Math.max(0, Math.min(1, cy + (point.y - cy) * 1.15)) })) }, "Overlay ridimensionato"); }
                  }}>Ridimensiona</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-barber-paper/60"
                    onClick={() =>
                      run(
                        () => removeWorkspaceOverlay(state, item.id),
                        "Overlay rimosso dalla bozza",
                      )
                    }
                  >
                    Rimuovi
                  </Button></div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-barber-paper/45">
              Le condizioni e le pedine digitali restano fuori da R6.3.
            </p>
          </section>
          {report.length ? (
            <section className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
              <h2 className="font-serif text-lg">Report legacy</h2>
              <div className="mt-2 max-h-48 space-y-2 overflow-auto text-xs text-amber-100/70">
                {report.map((entry, index) => (
                  <p key={`${entry.code}-${index}`}>
                    <strong className="text-amber-200">{entry.severity}</strong>{" "}
                    · {entry.message}
                  </p>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
