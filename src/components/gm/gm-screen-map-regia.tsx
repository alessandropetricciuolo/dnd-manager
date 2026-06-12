"use client";

import { useState } from "react";
import { Layers, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GmWikiMapsSheet } from "@/components/gm/gm-wiki-maps-sheet";
import { GmExplorationFowSheet } from "@/components/gm/gm-exploration-fow-sheet";

type GmScreenMapRegiaProps = {
  campaignId: string;
};

/** Regia mappe integrata nel GM Screen: visualizza e proietta senza lasciare la sessione. */
export function GmScreenMapRegia({ campaignId }: GmScreenMapRegiaProps) {
  const [wikiMapsOpen, setWikiMapsOpen] = useState(false);
  const [fowOpen, setFowOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
        onClick={() => setWikiMapsOpen(true)}
        title="Regia Mappe"
        aria-label="Apri Regia Mappe"
      >
        <Map className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
        onClick={() => setFowOpen(true)}
        title="Esplorazione e FOW"
        aria-label="Apri Esplorazione e FOW"
      >
        <Layers className="h-5 w-5" />
      </Button>

      <GmWikiMapsSheet open={wikiMapsOpen} onOpenChange={setWikiMapsOpen} campaignId={campaignId} />
      <GmExplorationFowSheet open={fowOpen} onOpenChange={setFowOpen} campaignId={campaignId} />
    </>
  );
}
