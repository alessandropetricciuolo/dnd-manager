"use client";

import { useCallback, useEffect, useRef } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { paintSceneFloorEditor } from "@/lib/map-core/scene-editor/draw-floor";
import type { SceneFloorV1 } from "@/lib/map-core/scene-schema";
import type { EditorDrawOptions } from "@/lib/map-core/scene-editor/draw-floor";

export type SceneEditorTool =
  | "select"
  | "room"
  | "corridor"
  | "door"
  | "prop"
  | "gmNote"
  | "erase";

type Props = {
  floor: SceneFloorV1;
  tool: SceneEditorTool;
  drawOptions: EditorDrawOptions;
  onCanvasPoint: (x: number, y: number, event: React.MouseEvent) => void;
  onCanvasMove?: (x: number, y: number, event: React.MouseEvent) => void;
  onCanvasUp?: (x: number, y: number, event: React.MouseEvent) => void;
};

function pointFromMouse(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

export function SceneEditorCanvas({
  floor,
  tool,
  drawOptions,
  onCanvasPoint,
  onCanvasMove,
  onCanvasUp,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintSceneFloorEditor(ctx, floor, drawOptions);
  }, [floor, drawOptions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.max(1, Math.floor(floor.width));
    canvas.height = Math.max(1, Math.floor(floor.height));
    repaint();
  }, [floor.width, floor.height, repaint]);

  useEffect(() => {
    repaint();
  }, [repaint]);

  const cursor =
    tool === "room" || tool === "corridor" || tool === "door"
      ? "crosshair"
      : tool === "erase"
        ? "not-allowed"
        : "default";

  return (
    <div className="h-[min(70vh,720px)] w-full overflow-hidden rounded-lg border border-barber-gold/25 bg-[#0f0d0c]">
      <TransformWrapper
        initialScale={0.45}
        minScale={0.1}
        maxScale={2.5}
        centerOnInit
        wheel={{ step: 0.08 }}
        panning={{
          allowLeftClickPan: false,
          allowMiddleClickPan: true,
          allowRightClickPan: false,
        }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperClass="!h-full !w-full"
          contentClass="!h-full !w-full flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            data-scene-editor-canvas
            className="max-h-none max-w-none shadow-lg"
            style={{ width: floor.width, height: floor.height, cursor, touchAction: "none" }}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                return;
              }
              if (e.button !== 0) return;
              e.stopPropagation();
              drawingRef.current = true;
              const canvas = canvasRef.current;
              if (!canvas) return;
              const p = pointFromMouse(canvas, e.clientX, e.clientY);
              onCanvasPoint(p.x, p.y, e);
            }}
            onMouseMove={(e) => {
              if (!onCanvasMove) return;
              if (tool === "room" && !drawingRef.current) return;
              if (tool !== "room" && tool !== "corridor") return;
              e.stopPropagation();
              const canvas = canvasRef.current;
              if (!canvas) return;
              const p = pointFromMouse(canvas, e.clientX, e.clientY);
              onCanvasMove(p.x, p.y, e);
            }}
            onMouseUp={(e) => {
              if (e.button === 1) return;
              if (e.button !== 0) return;
              e.stopPropagation();
              drawingRef.current = false;
              if (!onCanvasUp) return;
              const canvas = canvasRef.current;
              if (!canvas) return;
              const p = pointFromMouse(canvas, e.clientX, e.clientY);
              onCanvasUp(p.x, p.y, e);
            }}
            onMouseLeave={() => {
              drawingRef.current = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
