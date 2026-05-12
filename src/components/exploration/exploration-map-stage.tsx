"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { cn } from "@/lib/utils";
import type { NormPoint } from "@/lib/exploration/fow-geometry";
import {
  clampNormPoint,
  intrinsicNormToElementPx,
  intrinsicNormToSvgUserUnits,
  pointInPolygon,
} from "@/lib/exploration/fow-geometry";
import { FowRadialMenu, type FowRadialMenuItem } from "@/components/exploration/fow-radial-menu";
import {
  generateShapePolygon,
  centroid,
  scalePolygonFromCenter,
  translatePolygon,
  type FowShapeKind,
  sprayStrokeToNormPolygon,
  EFFECT_SPRAY_HALF_WIDTH_NORM,
} from "@/lib/exploration/fow-shape-tools";
import {
  createPixiSmokeRuntime,
  destroyPixiSmokeRuntime,
  drawPixiSmokeSprites,
  ensurePixiSmokeSystems,
  renderPixiSmokeFrame,
  resizePixiSmokeRuntime,
  syncPixiSmokeLayers,
  tickPixiSmokeSystem,
  type PixiSmokeRuntime,
  type PixiSmokeSystem,
} from "@/lib/exploration/pixi-smoke-effects";
import {
  drawParticles,
  isCanvasParticleElement,
  tickParticleSystem,
  type ParticleElement,
  type ParticleSystem,
} from "@/lib/exploration/polygon-particles";

export type FowRegionVm = {
  id: string;
  polygon: NormPoint[];
  is_revealed: boolean;
};

type ExplorationMapStageProps = {
  imageUrl: string;
  imageAlt: string;
  regions: FowRegionVm[];
  mode: "prepare" | "explore";
  draftPoints: NormPoint[];
  selectedRegionId: string | null;
  onImageSized?: (width: number, height: number) => void;
  onCanvasClick?: (norm: NormPoint) => void;
  onShapeCreate?: (polygon: NormPoint[]) => void | Promise<void>;
  onVertexDragEnd?: (regionId: string, vertexIndex: number, norm: NormPoint) => void;
  onRegionPolygonChange?: (regionId: string, polygon: NormPoint[]) => void | Promise<void>;
  onRegionDelete?: (regionId: string) => void | Promise<void>;
  onRevealClick?: (norm: NormPoint) => void;
  readOnly?: boolean;
  /** Proiezione: mappa a tutto lo spazio disponibile (senza max-height GM). */
  fillViewport?: boolean;
  showGrid?: boolean;
  gridOpacity?: number;
  gridCellPx?: number | null;
  gridCellSourcePxX?: number | null;
  gridOffsetXCells?: number;
  gridOffsetYCells?: number;
  /** Solo proiezione: abilita motore "effetti" stile overlacchio (effimeri, client-only). */
  effectsEnabled?: boolean;
};

const FOG_RGBA = "rgba(8, 6, 4, 0.82)";
/** In proiezione la nebbia deve coprire del tutto (niente map visibile sotto). */
const FOG_RGBA_OPAQUE = "rgba(0, 0, 0, 1)";

const RADIAL_MAIN_ITEMS: FowRadialMenuItem[] = [
  { id: "manual", label: "Vertici manuali" },
  { id: "forme", label: "Forme" },
];

const RADIAL_SHAPE_ITEMS: FowRadialMenuItem[] = [
  { id: "quadrato", label: "Quadrato" },
  { id: "cerchio", label: "Cerchio" },
  { id: "spray", label: "Spray" },
  { id: "poligono-libero", label: "Poligono libero" },
  { id: "indietro", label: "← Menu" },
];

const RADIAL_CONTEXT_ITEMS: FowRadialMenuItem[] = [
  { id: "sposta", label: "Sposta" },
  { id: "ridimensiona", label: "Ridimensiona" },
  { id: "elimina", label: "Elimina" },
];

const EFFECT_RADIAL_MAIN_ITEMS_BASE: FowRadialMenuItem[] = [
  { id: "pulisci", label: "Pulisci" },
  { id: "mostra", label: "Mostra" },
  { id: "giorno", label: "Giorno" },
  { id: "notte", label: "Notte" },
  { id: "forme", label: "Forme" },
];

const EFFECT_RADIAL_SHAPE_ITEMS: FowRadialMenuItem[] = [
  { id: "quadrato", label: "Quadrato (base)" },
  { id: "cerchio", label: "Cerchio" },
  { id: "spray", label: "Spray" },
  { id: "poligono-libero", label: "Poligono libero" },
  { id: "indietro", label: "← Menu" },
];

const EFFECT_RADIAL_ELEMENT_ITEMS: FowRadialMenuItem[] = [
  { id: "fuoco", label: "Fuoco" },
  { id: "veleno", label: "Veleno" },
  { id: "fumo", label: "Fumo" },
  { id: "fumini", label: "Fumini" },
  { id: "ghiaccio", label: "Ghiaccio" },
  { id: "fulmine", label: "Fulmine" },
  { id: "oscurità", label: "Oscurità" },
  { id: "indietro", label: "← Menu" },
];

const EFFECT_ELEMENT_MENU_IDS = new Set([
  "fuoco",
  "veleno",
  "fumo",
  "fumini",
  "ghiaccio",
  "fulmine",
  "oscurità",
]);

const EFFECT_RADIAL_CONTEXT_ITEMS: FowRadialMenuItem[] = [
  { id: "sposta", label: "Sposta" },
  { id: "ridimensiona", label: "Ridimensiona" },
  { id: "elimina", label: "Elimina" },
];

function effectElementDraftStyle(element: ParticleElement): { fill: string; stroke: string } {
  switch (element) {
    case "fuoco":
      return { fill: "rgba(255, 92, 64, 0.12)", stroke: "rgba(255, 92, 64, 0.95)" };
    case "veleno":
      return { fill: "rgba(78, 207, 125, 0.12)", stroke: "rgba(78, 207, 125, 0.95)" };
    case "fumo":
      return { fill: "rgba(190, 198, 210, 0.14)", stroke: "rgba(210, 218, 230, 0.9)" };
    case "fumini":
      return { fill: "rgba(140, 190, 235, 0.12)", stroke: "rgba(120, 185, 240, 0.92)" };
    case "ghiaccio":
      return { fill: "rgba(186, 230, 253, 0.16)", stroke: "rgba(224, 242, 254, 0.92)" };
    case "fulmine":
      return { fill: "rgba(250, 250, 255, 0.14)", stroke: "rgba(224, 231, 255, 0.95)" };
    case "oscurità":
      return { fill: "rgba(30, 20, 55, 0.35)", stroke: "rgba(120, 90, 160, 0.75)" };
    default:
      return { fill: "rgba(255, 255, 255, 0.1)", stroke: "rgba(255, 255, 255, 0.85)" };
  }
}

function drawFog(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  revealed: NormPoint[][],
  fogFill: string,
  naturalW: number,
  naturalH: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = fogFill;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-out";
  for (const poly of revealed) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    const [x0, y0] = intrinsicNormToElementPx(poly[0].x, poly[0].y, w, h, naturalW, naturalH);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < poly.length; i++) {
      const [xi, yi] = intrinsicNormToElementPx(poly[i].x, poly[i].y, w, h, naturalW, naturalH);
      ctx.lineTo(xi, yi);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}

export function ExplorationMapStage({
  imageUrl,
  imageAlt,
  regions,
  mode,
  draftPoints,
  selectedRegionId,
  onImageSized,
  onCanvasClick,
  onShapeCreate,
  onVertexDragEnd,
  onRegionPolygonChange,
  onRegionDelete,
  onRevealClick,
  readOnly = false,
  fillViewport = false,
  showGrid = false,
  gridOpacity = 0.45,
  gridCellPx = null,
  gridCellSourcePxX = null,
  gridOffsetXCells = 0,
  gridOffsetYCells = 0,
  effectsEnabled = false,
}: ExplorationMapStageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  /** Box della mappa (img + overlay): stesso sistema di coordinate di SVG/canvas. */
  const mapSurfaceRef = useRef<HTMLDivElement>(null);
  const fogRef = useRef<HTMLCanvasElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  /** Dimensioni layout dell'img (per SVG allineato al bitmap con object-contain). */
  const [layoutSize, setLayoutSize] = useState<{ w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<{ regionId: string; vi: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<NormPoint | null>(null);
  const dragPreviewRef = useRef<NormPoint | null>(null);
  const openingGuardUntilRef = useRef(0);
  const [shapeTool, setShapeTool] = useState<"manual" | FowShapeKind>("manual");
  const [radial, setRadial] = useState({ open: false, x: 0, y: 0 });
  const [radialItems, setRadialItems] = useState<FowRadialMenuItem[]>(RADIAL_MAIN_ITEMS);
  const [radialVariant, setRadialVariant] = useState<"default" | "context">("default");
  const [contextRegionId, setContextRegionId] = useState<string | null>(null);
  const [shapeDrag, setShapeDrag] = useState<{ start: NormPoint; current: NormPoint } | null>(null);
  const [freeShapeDraft, setFreeShapeDraft] = useState<NormPoint[]>([]);
  const [regionTransform, setRegionTransform] = useState<{
    kind: "move" | "resize";
    regionId: string;
    start: NormPoint | null;
    base: NormPoint[];
    preview: NormPoint[];
  } | null>(null);

  // --- Effetti "overlacchio" (solo proiezione, effimeri) ---
  const effectsCanvasRef = useRef<HTMLCanvasElement>(null);
  const nightOverlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixiHostRef = useRef<HTMLDivElement>(null);
  const pixiSmokeRtRef = useRef<PixiSmokeRuntime | null>(null);
  const particleSystemsRef = useRef<ParticleSystem[]>([]);
  const pixiSmokeSystemsRef = useRef<PixiSmokeSystem[]>([]);

  type EffectPolygon = { element: ParticleElement; points: NormPoint[] };
  const [effectPolygons, setEffectPolygons] = useState<EffectPolygon[]>([]);
  const [effectIsNight, setEffectIsNight] = useState(false);
  const [effectIsVisible, setEffectIsVisible] = useState(true);
  const [effectPolygonElement, setEffectPolygonElement] = useState<ParticleElement | null>(null);
  const [effectDrawShape, setEffectDrawShape] = useState<FowShapeKind>("quadrato");
  const [effectFreeDraftVertices, setEffectFreeDraftVertices] = useState<NormPoint[]>([]);
  const [effectRectDrag, setEffectRectDrag] = useState<{
    element: ParticleElement;
    shape: FowShapeKind;
    start: NormPoint;
    current: NormPoint;
  } | null>(null);
  /** Pennellata spray (punti normalizzati); null = non in disegno. */
  const [effectSprayStroke, setEffectSprayStroke] = useState<NormPoint[] | null>(null);
  const effectSprayStrokeRef = useRef<NormPoint[]>([]);
  const [effectTransform, setEffectTransform] = useState<{
    mode: "move" | "resize";
    idx: number;
    last: NormPoint;
    basePoints: NormPoint[];
    center: NormPoint;
    startDist: number;
  } | null>(null);

  const [effectInteractionMode, setEffectInteractionMode] = useState<"move" | "resize" | null>(null);
  const [effectSelectedIdx, setEffectSelectedIdx] = useState<number | null>(null);

  const [effectRadial, setEffectRadial] = useState<{
    open: boolean;
    x: number;
    y: number;
    variant: "default" | "context";
    items: FowRadialMenuItem[];
    contextIdx: number | null;
    guardUntil: number;
  }>({
    open: false,
    x: 0,
    y: 0,
    variant: "default",
    items: EFFECT_RADIAL_MAIN_ITEMS_BASE,
    contextIdx: null,
    guardUntil: 0,
  });

  const effectMainItems = useMemo(() => {
    return EFFECT_RADIAL_MAIN_ITEMS_BASE.map((item) => {
      if (item.id === "mostra") return { ...item, label: effectIsVisible ? "Mostra: ON" : "Mostra: OFF" };
      if (item.id === "giorno") return { ...item, label: effectIsNight ? "Giorno" : "Giorno · attivo" };
      if (item.id === "notte") return { ...item, label: effectIsNight ? "Notte · attivo" : "Notte" };
      return item;
    });
  }, [effectIsVisible, effectIsNight]);

  const effectRectDragRef = useRef(effectRectDrag);
  const effectTransformRef = useRef(effectTransform);
  useEffect(() => {
    effectRectDragRef.current = effectRectDrag;
  }, [effectRectDrag]);
  useEffect(() => {
    effectTransformRef.current = effectTransform;
  }, [effectTransform]);

  const revealedPolys = useMemo(
    () => regions.filter((r) => r.is_revealed).map((r) => r.polygon),
    [regions]
  );

  const effectPolygonsRef = useRef(effectPolygons);
  const effectIsNightRef = useRef(effectIsNight);
  const effectIsVisibleRef = useRef(effectIsVisible);

  useEffect(() => {
    effectPolygonsRef.current = effectPolygons;
  }, [effectPolygons]);

  const effectPolygonElementRef = useRef(effectPolygonElement);
  const effectFreeDraftVerticesRef = useRef(effectFreeDraftVertices);
  const effectDblCloseGuardRef = useRef(0);
  useEffect(() => {
    effectPolygonElementRef.current = effectPolygonElement;
  }, [effectPolygonElement]);
  useEffect(() => {
    effectFreeDraftVerticesRef.current = effectFreeDraftVertices;
  }, [effectFreeDraftVertices]);

  const effectDrawShapeRef = useRef(effectDrawShape);
  const effectInteractionModeRef = useRef(effectInteractionMode);
  useEffect(() => {
    effectDrawShapeRef.current = effectDrawShape;
  }, [effectDrawShape]);
  useEffect(() => {
    effectInteractionModeRef.current = effectInteractionMode;
  }, [effectInteractionMode]);
  useEffect(() => {
    effectIsNightRef.current = effectIsNight;
  }, [effectIsNight]);
  useEffect(() => {
    effectIsVisibleRef.current = effectIsVisible;
  }, [effectIsVisible]);

  useEffect(() => {
    if (!effectsEnabled) return;
    const sys = particleSystemsRef.current;
    while (sys.length < effectPolygons.length) sys.push({ particles: [] });
    sys.length = effectPolygons.length;
    ensurePixiSmokeSystems(pixiSmokeSystemsRef.current, effectPolygons.length);
  }, [effectsEnabled, effectPolygons.length]);

  useEffect(() => {
    if (!effectsEnabled) {
      destroyPixiSmokeRuntime(pixiSmokeRtRef.current);
      pixiSmokeRtRef.current = null;
    }
  }, [effectsEnabled]);

  useEffect(() => {
    if (!effectsEnabled || !layoutSize || layoutSize.w < 2 || layoutSize.h < 2) return;
    const host = pixiHostRef.current;
    if (!host) return;
    let cancelled = false;
    const w = layoutSize.w;
    const h = layoutSize.h;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    void (async () => {
      if (!pixiSmokeRtRef.current) {
        try {
          const rt = await createPixiSmokeRuntime(host, w, h, dpr);
          if (cancelled) {
            destroyPixiSmokeRuntime(rt);
            return;
          }
          pixiSmokeRtRef.current = rt;
        } catch (err) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[effetti] PixiJS fumo/fumini non inizializzato:", err);
          }
        }
      } else {
        resizePixiSmokeRuntime(pixiSmokeRtRef.current, w, h, dpr);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effectsEnabled, layoutSize]);

  function tracePolygonPathPx(
    ctx: CanvasRenderingContext2D,
    poly: NormPoint[],
    w: number,
    h: number,
    naturalW: number,
    naturalH: number
  ) {
    if (poly.length < 3) return;
    const [x0, y0] = intrinsicNormToElementPx(poly[0].x, poly[0].y, w, h, naturalW, naturalH);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    for (let i = 1; i < poly.length; i++) {
      const [xi, yi] = intrinsicNormToElementPx(poly[i].x, poly[i].y, w, h, naturalW, naturalH);
      ctx.lineTo(xi, yi);
    }
    ctx.closePath();
  }

  useEffect(() => {
    if (!effectsEnabled) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const img = imgRef.current;
      const naturalW = natural?.w ?? 0;
      const naturalH = natural?.h ?? 0;
      if (!img || naturalW <= 0 || naturalH <= 0) {
        raf = requestAnimationFrame(tick);
        return;
      }

      const w = img.offsetWidth;
      const h = img.offsetHeight;
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      const fxCv = effectsCanvasRef.current;
      const fxCtx = fxCv?.getContext("2d") ?? null;
      if (fxCv && fxCtx && w > 0 && h > 0) {
        fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        fxCtx.clearRect(0, 0, w, h);

        if (effectIsVisibleRef.current) {
          const polys = effectPolygonsRef.current;
          for (let i = 0; i < polys.length; i++) {
            const poly = polys[i];
            if (!isCanvasParticleElement(poly.element)) continue;
            const sys = particleSystemsRef.current[i];
            tickParticleSystem(poly.points, poly.element, sys, dt, { w, h }, naturalW, naturalH);
            fxCtx.save();
            tracePolygonPathPx(fxCtx, poly.points, w, h, naturalW, naturalH);
            fxCtx.clip();
            drawParticles(fxCtx, sys?.particles ?? [], poly.element);
            fxCtx.restore();
          }
        }
      }

      const nightCv = nightOverlayCanvasRef.current;
      const nightCtx = nightCv?.getContext("2d") ?? null;
      if (nightCv && nightCtx && w > 0 && h > 0) {
        nightCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        nightCtx.clearRect(0, 0, w, h);
        if (effectIsVisibleRef.current && effectIsNightRef.current) {
          nightCtx.fillStyle = "rgba(0, 0, 0, 0.75)";
          nightCtx.fillRect(0, 0, w, h);
          nightCtx.globalCompositeOperation = "destination-out";
          const polys = effectPolygonsRef.current;
          for (const poly of polys) {
            if (poly.element !== "fuoco") continue;
            tracePolygonPathPx(nightCtx, poly.points, w, h, naturalW, naturalH);
            nightCtx.fill();
          }
          nightCtx.globalCompositeOperation = "source-over";
        }
      }

      const rt = pixiSmokeRtRef.current;
      if (rt && w > 0 && h > 0 && naturalW > 0 && naturalH > 0) {
        rt.root.visible = effectIsVisibleRef.current;
        if (effectIsVisibleRef.current) {
          const polys = effectPolygonsRef.current;
          const pixiSys = pixiSmokeSystemsRef.current;
          for (let i = 0; i < polys.length; i++) {
            const el = polys[i].element;
            if (el === "fumo" || el === "fumini") {
              tickPixiSmokeSystem(polys[i].points, el, pixiSys[i]!, dt, { w, h }, naturalW, naturalH);
            }
          }
          syncPixiSmokeLayers(rt, polys, naturalW, naturalH, w, h);
          drawPixiSmokeSprites(rt, polys, pixiSys);
        }
        renderPixiSmokeFrame(rt);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [effectsEnabled, natural]);

  const fogFill = readOnly ? FOG_RGBA_OPAQUE : FOG_RGBA;

  const syncFog = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    if (w < 2 || h < 2) return;
    setLayoutSize((prev) => (prev?.w === w && prev?.h === h ? prev : { w, h }));
    const cv = fogRef.current;
    if (cv) {
      drawFog(
        cv,
        w,
        h,
        mode === "explore" || readOnly ? revealedPolys : [],
        fogFill,
        img.naturalWidth,
        img.naturalHeight
      );
    }
    // Effetti: sincronizza dimensioni canvas anche se il canvas nebbia non è ancora montato
    if (effectsEnabled) {
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const fx = effectsCanvasRef.current;
      if (fx) {
        fx.width = Math.max(1, Math.floor(w * dpr));
        fx.height = Math.max(1, Math.floor(h * dpr));
        fx.style.width = `${w}px`;
        fx.style.height = `${h}px`;
      }
      const night = nightOverlayCanvasRef.current;
      if (night) {
        night.width = Math.max(1, Math.floor(w * dpr));
        night.height = Math.max(1, Math.floor(h * dpr));
        night.style.width = `${w}px`;
        night.style.height = `${h}px`;
      }
    }
  }, [revealedPolys, mode, readOnly, fogFill, effectsEnabled]);

  /** Immagine in cache: onLoad può non partire; allinea SVG/canvas alla stessa geometria di drawFog. */
  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img?.naturalWidth || !img.naturalHeight) return;
    setNatural((prev) => {
      const next = { w: img.naturalWidth, h: img.naturalHeight };
      if (prev?.w === next.w && prev?.h === next.h) return prev;
      return next;
    });
    onImageSized?.(img.naturalWidth, img.naturalHeight);
  }, [imageUrl, onImageSized]);

  useEffect(() => {
    syncFog();
  }, [syncFog, imageUrl, natural]);

  useEffect(() => {
    const ro = new ResizeObserver(() => syncFog());
    const el = imgRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [syncFog]);

  const normFromEvent = useCallback((clientX: number, clientY: number): NormPoint | null => {
    const img = imgRef.current;
    const surface = mapSurfaceRef.current;
    const box = surface ?? img;
    if (!img || !box) return null;
    const sr = box.getBoundingClientRect();
    const W = box.clientWidth;
    const H = box.clientHeight;
    const naturalW = img.naturalWidth || 0;
    const naturalH = img.naturalHeight || 0;
    if (naturalW <= 0 || naturalH <= 0 || W <= 0 || H <= 0 || sr.width <= 0 || sr.height <= 0) return null;
    const pxRaw = ((clientX - sr.left) / sr.width) * W;
    const pyRaw = ((clientY - sr.top) / sr.height) * H;
    /** Fuori dal box mappa (padding flex ecc.): ignora. Vicini ai bordi: clamp per drag continuo. */
    const slack = 12;
    if (pxRaw < -slack || pxRaw > W + slack || pyRaw < -slack || pyRaw > H + slack) return null;
    const px = Math.min(W, Math.max(0, pxRaw));
    const py = Math.min(H, Math.max(0, pyRaw));
    const scaleGeom = Math.min(W / naturalW, H / naturalH);
    const dw = naturalW * scaleGeom;
    const dh = naturalH * scaleGeom;
    const ox = (W - dw) / 2;
    const oy = (H - dh) / 2;
    const x = (px - ox) / dw;
    const y = (py - oy) / dh;
    return clampNormPoint({ x, y });
  }, []);

  useEffect(() => {
    if (mode !== "prepare") {
      setShapeDrag(null);
      setFreeShapeDraft([]);
      setRegionTransform(null);
      setRadial((p) => ({ ...p, open: false }));
    }
  }, [mode]);

  const hitRegionIdAtPoint = useCallback(
    (n: NormPoint): string | null => {
      for (let i = regions.length - 1; i >= 0; i--) {
        if (pointInPolygon(n.x, n.y, regions[i].polygon)) return regions[i].id;
      }
      return null;
    },
    [regions]
  );

  const closeRadial = useCallback(() => {
    setRadial((prev) => ({ ...prev, open: false }));
    setRadialItems(RADIAL_MAIN_ITEMS);
    setRadialVariant("default");
    setContextRegionId(null);
  }, []);

  const onStageContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (mode !== "prepare" || readOnly) return;
      e.preventDefault();
      e.stopPropagation();
      const n = normFromEvent(e.clientX, e.clientY);
      openingGuardUntilRef.current = performance.now() + 450;
      if (n) {
        const hitId = hitRegionIdAtPoint(n);
        if (hitId) {
          setContextRegionId(hitId);
          setRadialVariant("context");
          setRadialItems(RADIAL_CONTEXT_ITEMS);
        } else {
          setContextRegionId(null);
          setRadialVariant("default");
          setRadialItems(RADIAL_MAIN_ITEMS);
        }
      }
      setRadial({ open: true, x: e.clientX, y: e.clientY });
    },
    [hitRegionIdAtPoint, mode, normFromEvent, readOnly]
  );

  const hitTestEffectIndexAtPoint = useCallback((n: NormPoint): number | null => {
    const polys = effectPolygonsRef.current;
    for (let i = polys.length - 1; i >= 0; i--) {
      if (pointInPolygon(n.x, n.y, polys[i].points)) return i;
    }
    return null;
  }, []);

  const closeEffectRadial = useCallback(() => {
    setEffectRadial((prev) => ({ ...prev, open: false, contextIdx: null }));
  }, []);

  const onEffectsContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!effectsEnabled) return;
      e.preventDefault();
      e.stopPropagation();
      const n = normFromEvent(e.clientX, e.clientY);
      const guardUntil = performance.now() + 600;
      if (!n) {
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        setEffectRadial({
          open: true,
          x: e.clientX,
          y: e.clientY,
          variant: "default",
          items: effectMainItems,
          contextIdx: null,
          guardUntil,
        });
        return;
      }
      const hitIdx = hitTestEffectIndexAtPoint(n);
      if (hitIdx != null) {
        setEffectSelectedIdx(hitIdx);
        setEffectRadial({
          open: true,
          x: e.clientX,
          y: e.clientY,
          variant: "context",
          items: EFFECT_RADIAL_CONTEXT_ITEMS,
          contextIdx: hitIdx,
          guardUntil,
        });
      } else {
        setEffectSelectedIdx(null);
        setEffectInteractionMode(null);
        setEffectTransform(null);
        setEffectRadial({
          open: true,
          x: e.clientX,
          y: e.clientY,
          variant: "default",
          items: effectMainItems,
          contextIdx: null,
          guardUntil,
        });
      }
    },
    [effectsEnabled, effectMainItems, hitTestEffectIndexAtPoint, normFromEvent]
  );

  const onEffectsRadialSelect = useCallback(
    (item: FowRadialMenuItem) => {
      const ctxIdx = effectRadial.contextIdx;

      if (item.id === "forme") {
        setEffectRadial((prev) => ({ ...prev, items: EFFECT_RADIAL_SHAPE_ITEMS }));
        return false;
      }
      if (item.id === "indietro") {
        const isElementMenu = effectRadial.items.some((i) => EFFECT_ELEMENT_MENU_IDS.has(i.id));
        setEffectRadial((prev) => ({
          ...prev,
          items: isElementMenu ? EFFECT_RADIAL_SHAPE_ITEMS : effectMainItems,
        }));
        return false;
      }
      if (item.id === "pulisci") {
        setEffectPolygons([]);
        setEffectPolygonElement(null);
        setEffectFreeDraftVertices([]);
        setEffectRectDrag(null);
        effectSprayStrokeRef.current = [];
        setEffectSprayStroke(null);
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
      if (item.id === "mostra") {
        setEffectIsVisible((v) => !v);
        return;
      }
      if (item.id === "giorno") {
        setEffectIsNight(false);
        return;
      }
      if (item.id === "notte") {
        setEffectIsNight(true);
        return;
      }
      if (
        item.id === "quadrato" ||
        item.id === "cerchio" ||
        item.id === "spray" ||
        item.id === "poligono-libero"
      ) {
        setEffectDrawShape(item.id as FowShapeKind);
        setEffectFreeDraftVertices([]);
        effectSprayStrokeRef.current = [];
        setEffectSprayStroke(null);
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        setEffectRadial((prev) => ({ ...prev, items: EFFECT_RADIAL_ELEMENT_ITEMS }));
        return false;
      }
      if (item.id === "fuoco") {
        setEffectPolygonElement("fuoco");
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
      if (item.id === "veleno") {
        setEffectPolygonElement("veleno");
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
      if (item.id === "fumo") {
        setEffectPolygonElement("fumo");
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
      if (item.id === "fumini") {
        setEffectPolygonElement("fumini");
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
      if (item.id === "ghiaccio") {
        setEffectPolygonElement("ghiaccio");
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
      if (item.id === "fulmine") {
        setEffectPolygonElement("fulmine");
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
      if (item.id === "oscurità") {
        setEffectPolygonElement("oscurità");
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
      if (item.id === "sposta") {
        if (ctxIdx == null) return;
        setEffectInteractionMode("move");
        setEffectSelectedIdx(ctxIdx);
        return;
      }
      if (item.id === "ridimensiona") {
        if (ctxIdx == null) return;
        setEffectInteractionMode("resize");
        setEffectSelectedIdx(ctxIdx);
        return;
      }
      if (item.id === "elimina") {
        if (ctxIdx == null) return;
        setEffectPolygons((prev) => prev.filter((_, i) => i !== ctxIdx));
        setEffectInteractionMode(null);
        setEffectSelectedIdx(null);
        setEffectTransform(null);
        return;
      }
    },
    [effectMainItems, effectRadial.contextIdx, effectRadial.items]
  );

  const MIN_RECT_DRAG_NORM = 0.01;
  const SPRAY_SAMPLE_MIN_DIST = 0.0035;

  const isEffectRectDragging = effectRectDrag !== null;
  const isEffectTransforming = effectTransform !== null;
  const isEffectSprayPainting = effectSprayStroke !== null;

  useEffect(() => {
    if (!effectsEnabled) return;
    if (!isEffectRectDragging && !isEffectTransforming && !isEffectSprayPainting) return;

    const onMove = (ev: MouseEvent) => {
      const n = normFromEvent(ev.clientX, ev.clientY);
      if (!n) return;

      if (
        effectDrawShapeRef.current === "spray" &&
        effectPolygonElementRef.current &&
        effectSprayStrokeRef.current.length > 0
      ) {
        const stroke = effectSprayStrokeRef.current;
        const last = stroke[stroke.length - 1]!;
        if (Math.hypot(n.x - last.x, n.y - last.y) >= SPRAY_SAMPLE_MIN_DIST) {
          stroke.push(clampNormPoint(n));
          setEffectSprayStroke([...stroke]);
        }
        return;
      }

      if (effectRectDragRef.current) {
        const rd = effectRectDragRef.current;
        effectRectDragRef.current = { ...rd, current: n };
        setEffectRectDrag((prev) => (prev ? { ...prev, current: n } : prev));
      } else if (effectTransformRef.current) {
        const tr = effectTransformRef.current;
        if (!tr) return;

        if (tr.mode === "move") {
          const dx = n.x - tr.last.x;
          const dy = n.y - tr.last.y;
          effectTransformRef.current = { ...tr, last: n };
          setEffectTransform((prev) => (prev ? { ...prev, last: n } : prev));
          setEffectPolygons((prev) =>
            prev.map((poly, i) =>
              i !== tr.idx
                ? poly
                : {
                    ...poly,
                      points: poly.points.map((p) =>
                        clampNormPoint({ x: p.x + dx, y: p.y + dy })
                      ),
                  }
            )
          );
        } else {
          const cx = tr.center.x;
          const cy = tr.center.y;
          const d1 = Math.hypot(n.x - cx, n.y - cy);
          const s = Math.max(0.12, d1 / Math.max(tr.startDist, 0.02));
          setEffectPolygons((prev) =>
            prev.map((poly, i) =>
              i !== tr.idx
                ? poly
                  : {
                      ...poly,
                      points: tr.basePoints.map((p) =>
                        clampNormPoint({
                          x: cx + (p.x - cx) * s,
                          y: cy + (p.y - cy) * s,
                        })
                      ),
                    }
            )
          );
        }
      }
    };

    const onUp = () => {
      if (
        effectDrawShapeRef.current === "spray" &&
        effectPolygonElementRef.current &&
        effectSprayStrokeRef.current.length > 0
      ) {
        const stroke = [...effectSprayStrokeRef.current];
        const el = effectPolygonElementRef.current;
        effectSprayStrokeRef.current = [];
        setEffectSprayStroke(null);
        if (stroke.length >= 1) {
          const poly = sprayStrokeToNormPolygon(stroke, EFFECT_SPRAY_HALF_WIDTH_NORM);
          if (poly.length >= 3) {
            setEffectPolygons((prev) => [...prev, { element: el, points: poly }]);
          }
        }
      } else {
        const rd = effectRectDragRef.current;
        if (rd) {
          const w = Math.abs(rd.current.x - rd.start.x);
          const h = Math.abs(rd.current.y - rd.start.y);
          effectRectDragRef.current = null;
          setEffectRectDrag(null);
          if (w >= MIN_RECT_DRAG_NORM && h >= MIN_RECT_DRAG_NORM) {
            const pts = generateShapePolygon(rd.shape, rd.start, rd.current);
            if (pts.length >= 3) {
              setEffectPolygons((prev) => [...prev, { element: rd.element, points: pts }]);
            }
          }
        }
      }

      const tr = effectTransformRef.current;
      if (tr) {
        effectTransformRef.current = null;
        setEffectTransform(null);
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [
    effectsEnabled,
    isEffectRectDragging,
    isEffectTransforming,
    isEffectSprayPainting,
    MIN_RECT_DRAG_NORM,
    normFromEvent,
    setEffectPolygons,
  ]);

  const handleEffectsMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!effectsEnabled) return;
      if (e.button !== 0) return;
      if (effectInteractionMode && effectSelectedIdx != null) {
        const n = normFromEvent(e.clientX, e.clientY);
        if (!n) return;
        const poly = effectPolygonsRef.current[effectSelectedIdx];
        if (!poly) return;

        if (effectInteractionMode === "move") {
          const next = {
            mode: "move" as const,
            idx: effectSelectedIdx,
            last: n,
            basePoints: poly.points,
            center: centroid(poly.points),
            startDist: 1,
          };
          effectTransformRef.current = next;
          setEffectTransform(next);
        } else {
          const c = centroid(poly.points);
          const d0 = Math.hypot(n.x - c.x, n.y - c.y);
          const next = {
            mode: "resize" as const,
            idx: effectSelectedIdx,
            last: n,
            basePoints: poly.points,
            center: c,
            startDist: Math.max(d0, 0.02),
          };
          effectTransformRef.current = next;
          setEffectTransform(next);
        }
        return;
      }

      // Creazione forme
      if (effectPolygonElement && effectDrawShape === "spray") {
        const n = normFromEvent(e.clientX, e.clientY);
        if (!n) return;
        effectSprayStrokeRef.current = [n];
        setEffectSprayStroke([n]);
        return;
      }

      if (effectPolygonElement && effectDrawShape !== "poligono-libero") {
        const n = normFromEvent(e.clientX, e.clientY);
        if (!n) return;
        const next = {
          element: effectPolygonElement,
          shape: effectDrawShape,
          start: n,
          current: n,
        };
        effectRectDragRef.current = next;
        setEffectRectDrag(next);
      }
    },
    [effectsEnabled, effectDrawShape, effectInteractionMode, effectPolygonElement, effectSelectedIdx, normFromEvent]
  );

  const handleEffectsClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!effectsEnabled) return;
      if (e.button !== 0) return;
      if (effectSprayStroke !== null) return;
      if (effectInteractionMode) return;
      if (effectTransform) return;
      if (effectRectDrag) return;
      if (effectDrawShape !== "poligono-libero") return;
      if (!effectPolygonElement) return;
      if (e.detail !== 1) return;
      if (performance.now() - effectDblCloseGuardRef.current < 280) return;
      const n = normFromEvent(e.clientX, e.clientY);
      if (!n) return;
      const draft = effectFreeDraftVerticesRef.current;
      if (draft.length >= 3) {
        const first = draft[0];
        const d = Math.hypot(n.x - first.x, n.y - first.y);
        // UX robusta: click vicino al primo vertice chiude il poligono.
        if (d <= 0.02) {
          const el = effectPolygonElementRef.current;
          if (!el) return;
          const now = performance.now();
          if (now - effectDblCloseGuardRef.current < 280) return;
          effectDblCloseGuardRef.current = now;
          setEffectPolygons((cur) => [...cur, { element: el, points: draft }]);
          setEffectFreeDraftVertices([]);
          return;
        }
      }
      setEffectFreeDraftVertices((prev) => [...prev, n]);
    },
    [
      effectsEnabled,
      effectSprayStroke,
      effectDrawShape,
      effectInteractionMode,
      effectPolygonElement,
      effectRectDrag,
      effectTransform,
      normFromEvent,
    ]
  );

  const finalizeEffectFreePolygon = useCallback(() => {
    const el = effectPolygonElementRef.current;
    if (!el) return;
    const draft = effectFreeDraftVerticesRef.current;
    if (draft.length < 3) return;
    const now = performance.now();
    if (now - effectDblCloseGuardRef.current < 280) return;
    effectDblCloseGuardRef.current = now;
    setEffectPolygons((cur) => [...cur, { element: el, points: draft }]);
    setEffectFreeDraftVertices([]);
  }, []);

  useEffect(() => {
    if (!effectsEnabled) return;
    const surface = mapSurfaceRef.current;
    if (!surface) return;
    const onDbl = (ev: MouseEvent) => {
      if (!effectPolygonElementRef.current) return;
      if (effectInteractionModeRef.current) return;
      if (effectTransformRef.current) return;
      if (effectRectDragRef.current) return;
      if (effectDrawShapeRef.current === "spray" && effectSprayStrokeRef.current.length > 0) return;
      if (effectDrawShapeRef.current !== "poligono-libero") return;
      ev.preventDefault();
      ev.stopPropagation();
      finalizeEffectFreePolygon();
    };
    surface.addEventListener("dblclick", onDbl);
    return () => surface.removeEventListener("dblclick", onDbl);
  }, [effectsEnabled, finalizeEffectFreePolygon]);

  const onRadialSelect = useCallback(
    (item: FowRadialMenuItem) => {
      if (item.id === "forme") {
        setRadialItems(RADIAL_SHAPE_ITEMS);
        return false;
      }
      if (item.id === "indietro") {
        setRadialItems(RADIAL_MAIN_ITEMS);
        return false;
      }
      if (item.id === "manual") {
        setShapeTool("manual");
        setFreeShapeDraft([]);
        return;
      }
      if (
        item.id === "quadrato" ||
        item.id === "cerchio" ||
        item.id === "spray" ||
        item.id === "poligono-libero"
      ) {
        setShapeTool(item.id as FowShapeKind);
        setFreeShapeDraft([]);
        return;
      }
      if (item.id === "elimina" && contextRegionId && onRegionDelete) {
        void onRegionDelete(contextRegionId);
        return;
      }
      if (item.id === "sposta" && contextRegionId) {
        const row = regions.find((r) => r.id === contextRegionId);
        if (!row) return;
        setRegionTransform({
          kind: "move",
          regionId: row.id,
          start: null,
          base: row.polygon,
          preview: row.polygon,
        });
        return;
      }
      if (item.id === "ridimensiona" && contextRegionId) {
        const row = regions.find((r) => r.id === contextRegionId);
        if (!row) return;
        setRegionTransform({
          kind: "resize",
          regionId: row.id,
          start: null,
          base: row.polygon,
          preview: row.polygon,
        });
      }
    },
    [contextRegionId, onRegionDelete, regions]
  );

  const handlePrepareClick = (e: React.MouseEvent) => {
    if (mode !== "prepare" || readOnly) return;
    const n = normFromEvent(e.clientX, e.clientY);
    if (!n) return;
    if (shapeTool === "manual") {
      onCanvasClick?.(n);
      return;
    }
    if (shapeTool === "poligono-libero") {
      setFreeShapeDraft((prev) => [...prev, n]);
      return;
    }
    setShapeDrag({ start: n, current: n });
  };

  const handleExploreClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== "explore" || !onRevealClick) return;
    e.stopPropagation();
    const n = normFromEvent(e.clientX, e.clientY);
    if (!n) return;
    onRevealClick(n);
  };

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      onImageSized?.(img.naturalWidth, img.naturalHeight);
    }
    syncFog();
  };

  useEffect(() => {
    function onMove(ev: MouseEvent) {
      if (shapeDrag) {
        const n = normFromEvent(ev.clientX, ev.clientY);
        if (n) setShapeDrag((prev) => (prev ? { ...prev, current: n } : prev));
        return;
      }
      if (regionTransform) {
        const n = normFromEvent(ev.clientX, ev.clientY);
        if (!n) return;
        const start = regionTransform.start;
        if (!start) {
          setRegionTransform((prev) => (prev ? { ...prev, start: n } : prev));
          return;
        }
        if (regionTransform.kind === "move") {
          const dx = n.x - start.x;
          const dy = n.y - start.y;
          setRegionTransform((prev) =>
            prev ? { ...prev, preview: translatePolygon(prev.base, dx, dy) } : prev
          );
          return;
        }
        const c = regionTransform.base.reduce(
          (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
          { x: 0, y: 0 }
        );
        const center = { x: c.x / regionTransform.base.length, y: c.y / regionTransform.base.length };
        const d0 = Math.hypot(start.x - center.x, start.y - center.y);
        const d1 = Math.hypot(n.x - center.x, n.y - center.y);
        const scale = Math.max(0.1, d1 / Math.max(d0, 0.02));
        setRegionTransform((prev) =>
          prev ? { ...prev, preview: scalePolygonFromCenter(prev.base, scale) } : prev
        );
      }
    }

    function onUp() {
      if (shapeDrag) {
        const poly = generateShapePolygon(shapeTool as FowShapeKind, shapeDrag.start, shapeDrag.current);
        setShapeDrag(null);
        if (poly.length >= 3 && onShapeCreate) void onShapeCreate(poly);
        return;
      }
      if (regionTransform) {
        if (onRegionPolygonChange) {
          void onRegionPolygonChange(regionTransform.regionId, regionTransform.preview);
        }
        setRegionTransform(null);
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [normFromEvent, onRegionPolygonChange, onShapeCreate, regionTransform, shapeDrag, shapeTool]);

  useEffect(() => {
    function onDoubleClick() {
      if (shapeTool !== "poligono-libero") return;
      setFreeShapeDraft((prev) => {
        if (prev.length < 3 || !onShapeCreate) return prev;
        void onShapeCreate(prev);
        return [];
      });
    }
    window.addEventListener("dblclick", onDoubleClick);
    return () => window.removeEventListener("dblclick", onDoubleClick);
  }, [onShapeCreate, shapeTool]);

  useEffect(() => {
    function onMove(ev: MouseEvent) {
      if (!drag) return;
      const n = normFromEvent(ev.clientX, ev.clientY);
      if (n) {
        dragPreviewRef.current = n;
        setDragPreview(n);
      }
    }
    function onUp() {
      if (!drag) {
        dragPreviewRef.current = null;
        setDragPreview(null);
        return;
      }
      const n = dragPreviewRef.current;
      const d = drag;
      dragPreviewRef.current = null;
      setDrag(null);
      setDragPreview(null);
      if (n && onVertexDragEnd) onVertexDragEnd(d.regionId, d.vi, n);
    }
    if (drag) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, normFromEvent, onVertexDragEnd]);

  const aspect = natural ? natural.w / natural.h : 16 / 9;

  const vertexPreview = (r: FowRegionVm) => {
    let out = r.polygon;
    if (regionTransform && regionTransform.regionId === r.id) out = regionTransform.preview;
    if (!drag || drag.regionId !== r.id || !dragPreview) return out;
    return out.map((p, i) => (i === drag.vi ? dragPreview : p));
  };

  const elW = layoutSize?.w ?? 0;
  const elH = layoutSize?.h ?? 0;
  const imgEl = imgRef.current;
  const nw = natural?.w ?? imgEl?.naturalWidth ?? 0;
  const nh = natural?.h ?? imgEl?.naturalHeight ?? 0;
  const hasLayout = elW > 0 && elH > 0;

  const normToSvg = (p: NormPoint): [number, number] =>
    nw > 0 && nh > 0 && elW > 0 && elH > 0
      ? intrinsicNormToSvgUserUnits(p.x, p.y, elW, elH, nw, nh)
      : [p.x * 100, p.y * 100];

  const normToCssPercentStyle = (p: NormPoint) => {
    if (nw > 0 && nh > 0 && elW > 0 && elH > 0) {
      const [px, py] = intrinsicNormToElementPx(p.x, p.y, elW, elH, nw, nh);
      return { left: `${(px / elW) * 100}%`, top: `${(py / elH) * 100}%` } as const;
    }
    return { left: `${p.x * 100}%`, top: `${p.y * 100}%` } as const;
  };

  const gridData = useMemo(() => {
    if (!showGrid || !hasLayout) return null;
    const [leftPx, topPx] =
      nw > 0 && nh > 0 ? intrinsicNormToElementPx(0, 0, elW, elH, nw, nh) : [0, 0];
    const [rightPx, bottomPx] =
      nw > 0 && nh > 0 ? intrinsicNormToElementPx(1, 1, elW, elH, nw, nh) : [elW, elH];
    const wPx = Math.max(0, rightPx - leftPx);
    const hPx = Math.max(0, bottomPx - topPx);
    if (wPx < 4 || hPx < 4) return null;
    const stepFromSource =
      gridCellSourcePxX && gridCellSourcePxX > 1 && nw > 0 ? (wPx / nw) * gridCellSourcePxX : null;
    const xStep = stepFromSource ?? gridCellPx ?? 0;
    const yStep = xStep; // Griglia volutamente quadrata
    if (!xStep || xStep <= 2 || !yStep || yStep <= 2) return null;

    const mod = (n: number, m: number) => ((n % m) + m) % m;
    const xStart = leftPx + mod(gridOffsetXCells * xStep, xStep);
    const yStart = topPx + mod(gridOffsetYCells * yStep, yStep);

    const vertical: number[] = [];
    for (let x = xStart; x <= leftPx + wPx + 0.5; x += xStep) vertical.push(x);
    for (let x = xStart - xStep; x >= leftPx - 0.5; x -= xStep) vertical.push(x);

    const horizontal: number[] = [];
    for (let y = yStart; y <= topPx + hPx + 0.5; y += yStep) horizontal.push(y);
    for (let y = yStart - yStep; y >= topPx - 0.5; y -= yStep) horizontal.push(y);

    return {
      leftPct: (leftPx / elW) * 100,
      topPct: (topPx / elH) * 100,
      wPct: (wPx / elW) * 100,
      hPct: (hPx / elH) * 100,
      vPct: vertical.map((x) => (x / elW) * 100),
      hLinesPct: horizontal.map((y) => (y / elH) * 100),
    };
  }, [
    showGrid,
    hasLayout,
    gridCellPx,
    gridCellSourcePxX,
    gridOffsetXCells,
    gridOffsetYCells,
    elW,
    elH,
    nw,
    nh,
  ]);

  const mapLayers = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={imageAlt}
        className={cn(
          "pointer-events-none block select-none",
          fillViewport ? "max-h-full max-w-full object-contain" : "h-auto w-full"
        )}
        draggable={false}
        onLoad={onImgLoad}
      />
      {(mode === "explore" || readOnly) && (
        <canvas
          ref={fogRef}
          className="pointer-events-none absolute left-0 top-0 z-[10] h-full w-full"
          aria-hidden
        />
      )}
      {effectsEnabled ? (
        <canvas
          ref={nightOverlayCanvasRef}
          className="pointer-events-none absolute left-0 top-0 z-[30] h-full w-full"
          aria-hidden
        />
      ) : null}
      {effectsEnabled ? (
        <canvas
          ref={effectsCanvasRef}
          className="pointer-events-none absolute left-0 top-0 z-[31] h-full w-full"
          aria-hidden
        />
      ) : null}
      {effectsEnabled ? (
        <div
          ref={pixiHostRef}
          className="pointer-events-none absolute left-0 top-0 z-[32] h-full w-full"
          aria-hidden
        />
      ) : null}
      {gridData && (
        <svg
          className="pointer-events-none absolute left-0 top-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <clipPath id="grid-clip">
              <rect
                x={gridData.leftPct}
                y={gridData.topPct}
                width={gridData.wPct}
                height={gridData.hPct}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#grid-clip)" style={{ opacity: Math.min(1, Math.max(0, gridOpacity)) }}>
            {gridData.vPct.map((x, i) => (
              <line
                key={`gv-${i}`}
                x1={x}
                y1={gridData.topPct}
                x2={x}
                y2={gridData.topPct + gridData.hPct}
                stroke="rgba(255,255,255,0.95)"
                strokeWidth={0.06}
              />
            ))}
            {gridData.hLinesPct.map((y, i) => (
              <line
                key={`gh-${i}`}
                x1={gridData.leftPct}
                y1={y}
                x2={gridData.leftPct + gridData.wPct}
                y2={y}
                stroke="rgba(255,255,255,0.95)"
                strokeWidth={0.06}
              />
            ))}
          </g>
        </svg>
      )}
      <svg
        className="pointer-events-none absolute left-0 top-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        {!(readOnly && effectsEnabled) &&
          regions.map((r) => {
            const poly = vertexPreview(r);
            return (
              <polygon
                key={r.id}
                points={poly
                  .map((p) => {
                    const [sx, sy] = normToSvg(p);
                    return `${sx},${sy}`;
                  })
                  .join(" ")}
                fill="none"
                stroke={
                  r.id === selectedRegionId ? "rgba(251, 191, 36, 0.95)" : "rgba(251, 191, 36, 0.5)"
                }
                strokeWidth={0.35}
              />
            );
          })}

        {draftPoints.length > 1 && (
          <polyline
            points={draftPoints
              .map((p) => {
                const [sx, sy] = normToSvg(p);
                return `${sx},${sy}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(34, 211, 238, 0.9)"
            strokeWidth={0.35}
          />
        )}
        {shapeDrag && shapeTool !== "poligono-libero" && (
          <polygon
            points={generateShapePolygon(shapeTool as FowShapeKind, shapeDrag.start, shapeDrag.current)
              .map((p) => {
                const [sx, sy] = normToSvg(p);
                return `${sx},${sy}`;
              })
              .join(" ")}
            fill="rgba(34, 211, 238, 0.12)"
            stroke="rgba(34, 211, 238, 0.95)"
            strokeWidth={0.35}
            strokeDasharray="1.1 0.8"
          />
        )}
        {freeShapeDraft.length > 1 && (
          <polyline
            points={freeShapeDraft
              .map((p) => {
                const [sx, sy] = normToSvg(p);
                return `${sx},${sy}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(34, 211, 238, 0.95)"
            strokeDasharray="1 0.7"
            strokeWidth={0.35}
          />
        )}
        {freeShapeDraft.map((p, i) => {
          const [cx, cy] = normToSvg(p);
          return <circle key={`fs-${i}`} cx={cx} cy={cy} r={0.75} fill="rgba(34, 211, 238, 0.95)" />;
        })}
        {/* Effetti (overlacchio): draft in costruzione */}
        {effectsEnabled && effectRectDrag && effectRectDrag.shape !== "spray" ? (
          (() => {
            const a = effectRectDrag.start;
            const b = effectRectDrag.current;
            const color = effectElementDraftStyle(effectRectDrag.element);
            const pts = generateShapePolygon(effectRectDrag.shape as FowShapeKind, a, b);
            return (
              <polygon
                points={pts
                  .map((p) => {
                    const [sx, sy] = normToSvg(p);
                    return `${sx},${sy}`;
                  })
                  .join(" ")}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={0.4}
                strokeDasharray="1.1 0.8"
              />
            );
          })()
        ) : null}
        {effectsEnabled &&
        effectSprayStroke &&
        effectSprayStroke.length > 0 &&
        effectPolygonElement ? (
          <>
            <polyline
              points={effectSprayStroke
                .map((p) => {
                  const [sx, sy] = normToSvg(p);
                  return `${sx},${sy}`;
                })
                .join(" ")}
              fill="none"
              stroke={effectElementDraftStyle(effectPolygonElement).stroke}
              strokeWidth={0.45}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {effectSprayStroke.length >= 2 ? (
              <polygon
                points={sprayStrokeToNormPolygon(effectSprayStroke, EFFECT_SPRAY_HALF_WIDTH_NORM)
                  .map((p) => {
                    const [sx, sy] = normToSvg(p);
                    return `${sx},${sy}`;
                  })
                  .join(" ")}
                fill={effectElementDraftStyle(effectPolygonElement).fill}
                stroke="none"
              />
            ) : null}
          </>
        ) : null}
        {effectsEnabled && effectFreeDraftVertices.length > 1 ? (
          <polyline
            points={effectFreeDraftVertices
              .map((p) => {
                const [sx, sy] = normToSvg(p);
                return `${sx},${sy}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.6)"
            strokeDasharray="1.1 0.7"
            strokeWidth={0.35}
          />
        ) : null}
        {effectsEnabled &&
          effectFreeDraftVertices.map((p, i) => {
            const [cx, cy] = normToSvg(p);
            return <circle key={`ef-${i}`} cx={cx} cy={cy} r={0.75} fill="rgba(255,255,255,0.75)" />;
          })}
        {draftPoints.map((p, i) => {
          const [cx, cy] = normToSvg(p);
          return (
            <circle
              key={`d-${i}`}
              cx={cx}
              cy={cy}
              r={0.85}
              fill="rgba(34, 211, 238, 0.95)"
            />
          );
        })}
      </svg>
      {mode === "prepare" && !readOnly && (
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-crosshair bg-transparent"
          onClick={handlePrepareClick}
          aria-label="Aggiungi vertice al poligono"
        />
      )}
      {mode === "prepare" &&
        selectedRegionId &&
        regions
          .filter((r) => r.id === selectedRegionId)
          .map((r) => {
            const poly = vertexPreview(r);
            return poly.map((p, vi) => (
              <button
                key={`${r.id}-${vi}`}
                type="button"
                className="absolute z-[2] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400 bg-amber-500/90 shadow"
                style={normToCssPercentStyle(p)}
                onMouseDown={(ev) => {
                  ev.stopPropagation();
                  ev.preventDefault();
                  const n = normFromEvent(ev.clientX, ev.clientY);
                  if (n) {
                    dragPreviewRef.current = n;
                    setDragPreview(n);
                  }
                  setDrag({ regionId: r.id, vi });
                }}
                aria-label={`Vertice ${vi + 1}`}
              />
            ));
          })}
    </>
  );

  return (
    <div className={cn("w-full", fillViewport ? "h-full min-h-0 bg-black" : "bg-black/50")}>
      <TransformWrapper
        initialScale={1}
        minScale={0.2}
        maxScale={6}
        centerOnInit
        limitToBounds={false}
        panning={
          effectsEnabled
            ? {
                allowLeftClickPan: false,
                allowMiddleClickPan: true,
                allowRightClickPan: false,
              }
            : undefined
        }
        doubleClick={effectsEnabled ? { disabled: true } : undefined}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "100%", height: "100%", position: "relative" }}
        >
          <div
            className={cn(
              fillViewport
                ? "relative flex h-full min-h-0 w-full items-center justify-center"
                : "relative mx-auto w-full max-w-[min(100%,96vw)]",
              !fillViewport && mode === "explore" && onRevealClick && "cursor-pointer"
            )}
            style={
              fillViewport
                ? undefined
                : { aspectRatio: String(aspect), maxHeight: "min(78vh, 1200px)" }
            }
            onClick={effectsEnabled ? handleEffectsClick : mode === "explore" && onRevealClick ? handleExploreClick : undefined}
            onMouseDown={effectsEnabled ? handleEffectsMouseDown : undefined}
            onContextMenu={effectsEnabled ? onEffectsContextMenu : onStageContextMenu}
          >
            <div
              ref={mapSurfaceRef}
              className={cn(
                "relative leading-none",
                fillViewport ? "inline-block max-h-full max-w-full" : "block w-full"
              )}
            >
              {mapLayers}
            </div>
          </div>
        </TransformComponent>
      </TransformWrapper>
      <FowRadialMenu
        open={radial.open}
        x={radial.x}
        y={radial.y}
        ariaLabel={radialVariant === "context" ? "Menu contestuale poligono" : "Menu FoW"}
        items={radialItems}
        variant={radialVariant}
        openingGuardUntil={openingGuardUntilRef.current}
        onClose={closeRadial}
        onSelect={onRadialSelect}
      />

      {effectsEnabled ? (
        <FowRadialMenu
          open={effectRadial.open}
          x={effectRadial.x}
          y={effectRadial.y}
          ariaLabel={effectRadial.variant === "context" ? "Menu contestuale effetto" : "Menu effetti"}
          items={effectRadial.items}
          variant={effectRadial.variant}
          openingGuardUntil={effectRadial.guardUntil}
          portalTarget={typeof document !== "undefined" ? document.body : null}
          zIndexBase={2147483000}
          onClose={closeEffectRadial}
          onSelect={onEffectsRadialSelect}
        />
      ) : null}
    </div>
  );
}

export function hitTestRegion(norm: NormPoint, regions: FowRegionVm[]): string | null {
  for (let i = regions.length - 1; i >= 0; i--) {
    const r = regions[i];
    if (pointInPolygon(norm.x, norm.y, r.polygon)) return r.id;
  }
  return null;
}
