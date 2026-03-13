import { EntityContent } from "../entity-content";
import { MapPopoutButton } from "@/components/maps/map-popout-button";
import { Package } from "lucide-react";
import { DualSourceImage } from "@/components/dual-source-image";

const PLACEHOLDER = "https://placehold.co/300x300/1e293b/10b981/png?text=Oggetto";

type ItemViewProps = {
  name: string;
  body: string;
  imageUrl: string | null;
  telegramFallbackId?: string | null;
};

export function ItemView({ name, body, imageUrl, telegramFallbackId }: ItemViewProps) {
  return (
    <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
      <div className="flex flex-col items-center gap-2">
        <div className="relative h-48 w-48 shrink-0 overflow-hidden rounded-xl border border-barber-gold/30 bg-barber-dark md:h-64 md:w-64">
          <DualSourceImage
            driveUrl={imageUrl ?? PLACEHOLDER}
            telegramFallbackId={telegramFallbackId ?? null}
            alt={name}
            className="h-full w-full object-cover"
          />
        </div>
        <MapPopoutButton
          imageUrl={imageUrl ?? PLACEHOLDER}
          title={name}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-barber-gold">
          <Package className="h-5 w-5" />
          Descrizione
        </h2>
        {body ? (
          <EntityContent content={body} />
        ) : (
          <p className="text-barber-paper/60 italic">Nessuna descrizione.</p>
        )}
      </div>
    </div>
  );
}
