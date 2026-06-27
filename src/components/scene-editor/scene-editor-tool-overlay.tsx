"use client";

import type { LucideIcon } from "lucide-react";
import {
  DoorOpen,
  Eraser,
  MousePointer2,
  Package,
  Route,
  Square,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SceneEditorTool } from "@/components/scene-editor/scene-editor-canvas";

export const SCENE_EDITOR_TOOLS: {
  id: SceneEditorTool;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "select", label: "Seleziona", icon: MousePointer2 },
  { id: "room", label: "Stanza", icon: Square },
  { id: "corridor", label: "Corridoio", icon: Route },
  { id: "door", label: "Porta", icon: DoorOpen },
  { id: "prop", label: "Prop", icon: Package },
  { id: "gmNote", label: "Nota GM", icon: StickyNote },
  { id: "erase", label: "Elimina", icon: Eraser },
];

type Props = {
  tool: SceneEditorTool;
  onToolChange: (tool: SceneEditorTool) => void;
};

export function SceneEditorToolOverlay({ tool, onToolChange }: Props) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="pointer-events-auto absolute left-3 top-3 z-10 flex flex-col gap-0.5 rounded-lg border border-barber-gold/30 bg-barber-dark/90 p-1 shadow-lg backdrop-blur-sm"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {SCENE_EDITOR_TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <Tooltip key={t.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={active ? "default" : "ghost"}
                  className={
                    active
                      ? "h-9 w-9 bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                      : "h-9 w-9 text-barber-paper/80 hover:bg-barber-gold/15 hover:text-barber-gold"
                  }
                  aria-label={t.label}
                  aria-pressed={active}
                  onClick={() => onToolChange(t.id)}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                {t.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
