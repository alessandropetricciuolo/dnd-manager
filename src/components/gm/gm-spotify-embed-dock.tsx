"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyEmbedControlled } from "@/components/gm/spotify-embed-controlled";
import { cn } from "@/lib/utils";

type Props = {
  playlistId: string | null;
  /** Con foglio Audio aperto alza lo z-index così il player resta visibile sopra il pannello. */
  audioSheetOpen?: boolean;
};

/** Embed Spotify fisso sul GM screen: unica istanza iFrame API, controllata dal telecomando. */
export function GmSpotifyEmbedDock({ playlistId, audioSheetOpen }: Props) {
  const [open, setOpen] = useState(true);
  if (!playlistId) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-3 right-3 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-1",
        audioSheetOpen ? "z-[60]" : "z-40"
      )}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 border-amber-800/50 bg-zinc-900 text-[10px] text-amber-100"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronUp className="mr-1 h-3 w-3" />}
        Spotify
      </Button>
      <div
        className={cn(
          "w-[min(100vw-24px,400px)] overflow-hidden rounded-xl border border-amber-800/50 bg-black/80 shadow-2xl",
          open
            ? "relative"
            : "pointer-events-none fixed left-[-10000px] top-0 z-0 h-[380px] w-[400px] opacity-0"
        )}
        aria-hidden={!open}
      >
        <SpotifyEmbedControlled playlistId={playlistId} width="100%" height={380} />
      </div>
    </div>
  );
}
