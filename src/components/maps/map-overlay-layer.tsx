"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  Anchor,
  Castle,
  DoorOpen,
  Flame,
  Key,
  Mountain,
  type LucideIcon,
  Skull,
  Star,
  Swords,
  Tent,
} from "lucide-react";
import type { MapOverlayItem, MapOverlaySymbolId } from "@/types/map-overlay";
import { cn } from "@/lib/utils";

const SYMBOL_ICONS: Record<MapOverlaySymbolId, LucideIcon> = {
  star: Star,
  flame: Flame,
  skull: Skull,
  castle: Castle,
  tent: Tent,
  swords: Swords,
  "door-open": DoorOpen,
  key: Key,
  anchor: Anchor,
  mountain: Mountain,
};

type MapOverlayLayerProps = {
  items: MapOverlayItem[];
  /** Se true, elementi ricevono click (editor). */
  interactive?: boolean;
  selectedId?: string | null;
  onItemPointerDown?: (id: string, e: React.PointerEvent) => void;
};

export function MapOverlayLayer({
  items,
  interactive = false,
  selectedId,
  onItemPointerDown,
}: MapOverlayLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [minPx, setMinPx] = useState(480);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setMinPx(Math.max(160, Math.min(r.width, r.height)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("absolute inset-0", interactive ? "pointer-events-auto" : "pointer-events-none")}
    >
      {items.map((item) => {
        if (item.kind === "text") {
          const fs = Math.max(10, Math.min(52, item.fontRel * minPx * 2.2));
          const selected = item.id === selectedId;
          return (
            <div
              key={item.id}
              data-map-overlay-item
              className={cn(
                "absolute select-none font-medium leading-tight",
                interactive && "cursor-grab active:cursor-grabbing",
                selected && "ring-2 ring-barber-gold/80 ring-offset-1 ring-offset-transparent rounded"
              )}
              style={{
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
                fontSize: fs,
                color: item.color,
                transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg) scale(${item.scale ?? 1})`,
                textShadow: "0 1px 3px rgba(0,0,0,.9), 0 0 12px rgba(0,0,0,.6)",
                maxWidth: "min(90%, 18em)",
              }}
              onPointerDown={interactive ? (e) => onItemPointerDown?.(item.id, e) : undefined}
            >
              {item.text}
            </div>
          );
        }
        const Icon = SYMBOL_ICONS[item.symbolId];
        const base = Math.max(18, Math.min(56, 26 * (item.scale ?? 1) * (0.45 + minPx / 900)));
        const selected = item.id === selectedId;
        return (
          <div
            key={item.id}
            data-map-overlay-item
            className={cn(
              "absolute drop-shadow-lg",
              interactive && "cursor-grab active:cursor-grabbing",
              selected && "ring-2 ring-barber-gold/90 rounded-full"
            )}
            style={{
              left: `${item.x * 100}%`,
              top: `${item.y * 100}%`,
              transform: `translate(-50%, -50%) rotate(${item.rotation ?? 0}deg) scale(${item.scale ?? 1})`,
            }}
            onPointerDown={interactive ? (e) => onItemPointerDown?.(item.id, e) : undefined}
          >
            <Icon style={{ width: base, height: base }} color={item.color ?? "#e8c97a"} strokeWidth={2} />
          </div>
        );
      })}
    </div>
  );
}
