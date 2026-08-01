"use client";

import { useState, type ReactNode } from "react";
import { ExternalLink, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type GmPanelChromeProps = {
  title: string;
  onClose?: () => void;
  onRename?: (title: string) => void;
  onPopout?: () => void;
  className?: string;
  children: ReactNode;
};

export function GmPanelChrome({
  title,
  onClose,
  onRename,
  onPopout,
  className,
  children,
}: GmPanelChromeProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  function commitRename() {
    const next = draft.trim();
    if (next && onRename) onRename(next);
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-amber-600/25 bg-zinc-950/80 shadow-sm",
        className
      )}
    >
      <div className="gm-panel-drag-handle flex shrink-0 cursor-grab items-center gap-1 border-b border-amber-600/20 bg-zinc-900/90 px-2 py-1.5 active:cursor-grabbing">
        {editing && onRename ? (
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(title);
                setEditing(false);
              }
            }}
            className="h-7 border-amber-600/30 bg-zinc-800 text-xs text-zinc-100"
            autoFocus
          />
        ) : (
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-xs font-medium text-amber-200"
            onDoubleClick={() => {
              if (!onRename) return;
              setDraft(title);
              setEditing(true);
            }}
            title={onRename ? "Doppio click per rinominare" : title}
          >
            {title}
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {onRename ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-amber-200"
              title="Rinomina"
              onClick={() => {
                setDraft(title);
                setEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          ) : null}
          {onPopout ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-amber-200"
              title="Apri in finestra / espandi"
              onClick={onPopout}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          ) : null}
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-red-300"
              title="Chiudi pannello"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 md:p-3">{children}</div>
    </div>
  );
}
