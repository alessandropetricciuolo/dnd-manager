"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PreviewTextSelection } from "@/modules/command-center/ai-control-plane/preview-text-selection";

type PreviewSelectableTextProps = {
  text: string;
  field: PreviewTextSelection["field"];
  sectionLabel: string;
  onSelectExcerpt: (selection: PreviewTextSelection) => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
};

export function PreviewSelectableText({
  text,
  field,
  sectionLabel,
  onSelectExcerpt,
  disabled = false,
  active = false,
  className,
}: PreviewSelectableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingText, setPendingText] = useState("");

  const clearToolbar = useCallback(() => {
    setToolbarPos(null);
    setPendingText("");
  }, []);

  useEffect(() => {
    if (disabled) clearToolbar();
  }, [disabled, clearToolbar]);

  function handleMouseUp() {
    if (disabled) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) {
      clearToolbar();
      return;
    }

    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
      clearToolbar();
      return;
    }

    const selected = sel.toString().trim();
    if (selected.length < 3) {
      clearToolbar();
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setPendingText(selected);
    setToolbarPos({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 4,
    });
  }

  function confirmSelection() {
    if (!pendingText.trim()) return;
    onSelectExcerpt({
      field,
      selectedText: pendingText.trim(),
      sectionLabel,
    });
    clearToolbar();
    window.getSelection()?.removeAllRanges();
  }

  const lines = text.split("\n");

  return (
    <div
      ref={containerRef}
      className={cn("relative space-y-2", active && "rounded-md ring-1 ring-barber-gold/50")}
      onMouseUp={handleMouseUp}
    >
      {lines.map((line, index) => {
        const h3 = line.match(/^###\s+(.+)$/);
        if (h3) {
          return (
            <h5
              key={index}
              className="pt-1 font-serif text-sm font-semibold tracking-wide text-barber-gold/90 first:pt-0"
            >
              {h3[1]}
            </h5>
          );
        }
        const h2 = line.match(/^##\s+(.+)$/);
        if (h2) {
          return (
            <h4
              key={index}
              className="pt-1 font-serif text-base font-semibold text-barber-paper first:pt-0"
            >
              {h2[1]}
            </h4>
          );
        }
        if (!line.trim()) {
          return <div key={index} className="h-1" aria-hidden />;
        }
        return (
          <p
            key={index}
            className={cn(
              "text-sm leading-relaxed text-barber-paper/90 selection:bg-barber-gold/35 selection:text-barber-paper",
              !disabled && "cursor-text",
              className
            )}
          >
            {line}
          </p>
        );
      })}
      {toolbarPos ? (
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-full"
          style={{ left: toolbarPos.x, top: toolbarPos.y }}
        >
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5 border-barber-gold/40 bg-barber-dark/95 text-xs text-barber-gold shadow-lg hover:bg-barber-gold/15"
            onMouseDown={(e) => e.preventDefault()}
            onClick={confirmSelection}
          >
            <Pencil className="h-3 w-3" />
            Modifica selezione
          </Button>
        </div>
      ) : null}
    </div>
  );
}
