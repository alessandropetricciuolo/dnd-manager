"use client";

import { Layers, Map } from "lucide-react";
import { Button } from "@/components/ui/button";

type GmScreenMapShortcutsProps = {
  campaignId: string;
};

/** Collegamenti rapidi a Mappe wiki e Esplorazione e FOW dal GM Screen. */
export function GmScreenMapShortcuts({ campaignId }: GmScreenMapShortcutsProps) {
  function openMappe() {
    window.open(`/campaigns/${campaignId}?tab=mappe`, "_blank", "noopener,noreferrer");
  }

  function openExplorationFow() {
    const url = `/campaigns/${campaignId}/gm-only/vista-dall-alto`;
    const width = Math.max(window.screen.availWidth ? Math.min(window.screen.availWidth, 1600) : 1400, 1024);
    const height = Math.max(window.screen.availHeight ? Math.min(window.screen.availHeight, 1000) : 900, 720);
    const features = `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
    const popup = window.open(url, "ExplorationFowWindow", features);
    if (!popup) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
        onClick={openMappe}
        title="Mappe"
        aria-label="Apri Mappe"
      >
        <Map className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="text-amber-400 hover:bg-amber-600/20 hover:text-amber-200"
        onClick={openExplorationFow}
        title="Esplorazione e FOW"
        aria-label="Apri Esplorazione e FOW"
      >
        <Layers className="h-5 w-5" />
      </Button>
    </>
  );
}
