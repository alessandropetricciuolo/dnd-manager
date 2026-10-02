"use client";

import { Headphones, Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";

type Props = { forge?: GmAudioForgeControls; onOpenAudio?: () => void };

/** Controlli rapidi dello stesso motore audio usato dal GM Screen e dal telecomando. */
export function TacticalSoundboard({ forge, onOpenAudio }: Props) {
  return (
    <section className="rounded-lg border border-brass-base/30 bg-[#120d09]/95 p-3 text-parchment-100">
      <div className="mb-3 flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
        <Headphones className="h-4 w-4" /> Audio sessione
      </div>
      <p className="mb-3 truncate text-sm text-parchment-200" title={forge?.currentMusicLabel ?? undefined}>
        {forge?.currentMusicLabel ?? "Nessuna musica in riproduzione"}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" size="sm" variant="outline" disabled={!forge?.currentMusicLabel} onClick={() => forge?.toggleMusicPlayback()} aria-label={forge?.musicPlaying ? "Pausa musica" : "Riprendi musica"}>
          {forge?.musicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => forge?.stopAll()} aria-label="Ferma tutto l'audio">
          <Square className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onOpenAudio}>Apri Audio</Button>
      </div>
    </section>
  );
}
