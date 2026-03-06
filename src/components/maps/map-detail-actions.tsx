"use client";

import { useState } from "react";
import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPopoutButton } from "./map-popout-button";

type MapDetailActionsProps = {
  imageUrl: string;
  mapName: string;
  /** URL della pagina view (mappa + pin) per il popup Second Screen. */
  viewUrl?: string;
};

export function MapDetailActions({ imageUrl, mapName, viewUrl }: MapDetailActionsProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MapPopoutButton imageUrl={imageUrl} title={mapName} viewUrl={viewUrl} />
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2 border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold"
            title="Espandi immagine nella finestra corrente"
          >
            <Maximize2 className="h-4 w-4" />
            Espandi
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-h-[90vh] max-w-[95vw] border-barber-gold/20 bg-barber-dark p-0 overflow-hidden"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{mapName}</DialogTitle>
          <div className="relative h-[70vh] w-full max-w-5xl">
            <Image
              src={imageUrl}
              alt={mapName}
              fill
              className="object-contain"
              unoptimized={
                imageUrl.startsWith("blob:") ||
                imageUrl.startsWith("/api/tg-image/") ||
                imageUrl.startsWith("/api/tg-file/") ||
                imageUrl.includes("supabase")
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
