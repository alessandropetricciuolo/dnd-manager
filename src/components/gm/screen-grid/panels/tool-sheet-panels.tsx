"use client";

import { Headphones, Images, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGmScreenBoard } from "../gm-screen-board-context";

export function GalleryPanel() {
  const { openGallerySheet } = useGmScreenBoard();
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 p-2">
      <p className="text-sm text-zinc-300">Regia immagini: gallery wiki/PG da proiettare o scaricare.</p>
      <Button
        type="button"
        size="sm"
        className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
        onClick={openGallerySheet}
      >
        <Images className="mr-1.5 h-3.5 w-3.5" />
        Apri Regia Immagini
      </Button>
    </div>
  );
}

export function WhispersPanel() {
  const { openWhispersSheet } = useGmScreenBoard();
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 p-2">
      <p className="text-sm text-zinc-300">Sussurri segreti verso i giocatori della campagna.</p>
      <Button
        type="button"
        size="sm"
        className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
        onClick={openWhispersSheet}
      >
        <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
        Apri Sussurri
      </Button>
    </div>
  );
}

export function AudioPanel() {
  const { openAudioSheet } = useGmScreenBoard();
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 p-2">
      <p className="text-sm text-zinc-300">Audio Forge: musica, atmosfere, SFX e Spotify.</p>
      <Button
        type="button"
        size="sm"
        className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
        onClick={openAudioSheet}
      >
        <Headphones className="mr-1.5 h-3.5 w-3.5" />
        Apri Audio
      </Button>
    </div>
  );
}
