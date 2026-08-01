"use client";

import { Layers, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGmScreenBoard } from "../gm-screen-board-context";

export function MapsPanel() {
  const { openMapsSheet } = useGmScreenBoard();
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 p-2">
      <p className="text-sm text-zinc-300">
        Regia mappe wiki: visualizza e proietta senza lasciare la sessione.
      </p>
      <Button
        type="button"
        size="sm"
        className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
        onClick={openMapsSheet}
      >
        <Map className="mr-1.5 h-3.5 w-3.5" />
        Apri Regia Mappe
      </Button>
    </div>
  );
}

export function FowPanel() {
  const { openFowSheet } = useGmScreenBoard();
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 p-2">
      <p className="text-sm text-zinc-300">Esplorazione e Fog of War sulle mappe della campagna.</p>
      <Button
        type="button"
        size="sm"
        className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
        onClick={openFowSheet}
      >
        <Layers className="mr-1.5 h-3.5 w-3.5" />
        Apri Esplorazione / FOW
      </Button>
    </div>
  );
}
