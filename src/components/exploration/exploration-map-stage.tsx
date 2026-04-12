"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { cn } from "@/lib/utils";
import type { NormPoint } from "@/lib/exploration/fow-geometry";
import { pointInPolygon } from "@/lib/exploration/fow-geometry";

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
  onVertexDragEnd?: (regionId: string, vertexIndex: number, norm: NormPoint) => void;
  onRevealClick?: (norm: NormPoint) => void;
  readOnly?: boolean;
};

const FOG_RGBA = "rgba(8, 6, 4, 0.82)";

function drawFog(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  revealed: NormPoint[][]
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = FOG_RGBA;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-out";
  for (const poly of revealed) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(poly[0].x * w, poly[0].y * h);
    for (let i = 1; i < poly.length; i++) {
      ctx.lineTo(poly[i].x * w, poly[i].y * h);
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
  onVertexDragEnd,
  onRevealClick,
  readOnly = false,
}: ExplorationMapStageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const fogRef = useRef<HTMLCanvasElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<{ regionId: string; vi: number } | null>(null);
  const [dragPreview, setDragPreview] = useState<NormPoint | null>(null);
  const dragPreviewRef = useRef<NormPoint | null>(null);

  const revealedPolys = useMemo(
    () => regions.filter((r) => r.is_revealed).map((r) => r.polygon),
    [regions]
  );

  const syncFog = useCallback(() => {
    const img = imgRef.current;
    const cv = fogRef.current;
    if (!img || !cv || !img.naturalWidth) return;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    if (w < 2 || h < 2) return;
    drawFog(cv, w, h, mode === "explore" || readOnly ? revealedPolys : []);
  }, [revealedPolys, mode, readOnly]);

  useEffect(() => {
    syncFog();
  }, [syncFog, imageUrl]);

  useEffect(() => {
    const ro = new ResizeObserver(() => syncFog());
    const el = imgRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [syncFog]);

  const normFromEvent = (clientX: number, clientY: number): NormPoint | null => {
    const img = imgRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const handlePrepareClick = (e: React.MouseEvent) => {
    if (mode !== "prepare" || readOnly || !onCanvasClick) return;
    const n = normFromEvent(e.clientX, e.clientY);
    if (!n) return;
    onCanvasClick(n);
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
  }, [drag, onVertexDragEnd]);

  const aspect = natural ? natural.w / natural.h : 16 / 9;

  const vertexPreview = (r: FowRegionVm) => {
    if (!drag || drag.regionId !== r.id || !dragPreview) return r.polygon;
    return r.polygon.map((p, i) => (i === drag.vi ? dragPreview : p));
  };

  return (
    <div className="w-full bg-black/50">
      <TransformWrapper initialScale={1} minScale={0.2} maxScale={6} centerOnInit limitToBounds={false}>
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "100%", height: "100%", position: "relative" }}
        >
          <div
            className={cn(
              "relative mx-auto w-full max-w-[min(100%,96vw)]",
              mode === "explore" && onRevealClick && "cursor-pointer"
            )}
            style={{ aspectRatio: String(aspect), maxHeight: "min(78vh, 1200px)" }}
            onClick={mode === "explore" && onRevealClick ? handleExploreClick : undefined}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt={imageAlt}
              className="pointer-events-none block h-auto w-full select-none"
              draggable={false}
              onLoad={onImgLoad}
            />
            {(mode === "explore" || readOnly) && (
              <canvas
                ref={fogRef}
                className="pointer-events-none absolute left-0 top-0 h-full w-full"
                aria-hidden
              />
            )}
            <svg
              className="pointer-events-none absolute left-0 top-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              {regions.map((r) => {
                const poly = vertexPreview(r);
                return (
                  <polygon
                    key={r.id}
                    points={poly.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
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
                  points={draftPoints.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.9)"
                  strokeWidth={0.35}
                />
              )}
              {draftPoints.map((p, i) => (
                <circle
                  key={`d-${i}`}
                  cx={p.x * 100}
                  cy={p.y * 100}
                  r={0.85}
                  fill="rgba(34, 211, 238, 0.95)"
                />
              ))}
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
                      style={{
                        left: `${p.x * 100}%`,
                        top: `${p.y * 100}%`,
                      }}
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
          </div>
        </TransformComponent>
      </TransformWrapper>
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
