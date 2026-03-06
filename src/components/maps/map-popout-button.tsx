"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const POPOUT_FEATURES =
  "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no";

type MapPopoutButtonProps = {
  imageUrl: string;
  title: string;
};

export function MapPopoutButton({ imageUrl, title }: MapPopoutButtonProps) {
  function handlePopout() {
    window.open(imageUrl, "MapWindow", POPOUT_FEATURES);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="hidden md:inline-flex shrink-0 gap-2 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold"
      onClick={handlePopout}
      title="Apri la mappa in una finestra separata (es. secondo schermo)"
    >
      <ExternalLink className="h-4 w-4" />
      Apri in Nuova Finestra
    </Button>
  );
}
