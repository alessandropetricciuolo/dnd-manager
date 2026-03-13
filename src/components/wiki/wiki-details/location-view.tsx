import { EntityContent } from "../entity-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPopoutButton } from "@/components/maps/map-popout-button";
import { MapPin } from "lucide-react";
import { GmOnlySection } from "./gm-only-section";
import { DualSourceImage } from "@/components/dual-source-image";

const PLACEHOLDER = "https://placehold.co/800x400/1e293b/10b981/png?text=Luogo";

type LocationAttributes = { loot?: string };

type LocationViewProps = {
  name: string;
  body: string;
  imageUrl: string | null;
  telegramFallbackId?: string | null;
  attributes: LocationAttributes | null;
  isGmOrAdmin?: boolean;
};

export function LocationView({
  name,
  body,
  imageUrl,
  telegramFallbackId,
  attributes,
  isGmOrAdmin = false,
}: LocationViewProps) {
  const loot = attributes?.loot?.trim();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl border border-barber-gold/30 bg-barber-dark">
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

      {body ? (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-barber-gold">Descrizione</h2>
          <EntityContent content={body} />
        </div>
      ) : null}

      {loot ? (
        <GmOnlySection isGmOrAdmin={isGmOrAdmin}>
          <Card className="border-barber-gold/40 bg-barber-dark/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-barber-gold">
                <MapPin className="h-4 w-4" />
                Tesori nascosti
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="whitespace-pre-wrap text-barber-paper/80">{loot}</div>
            </CardContent>
          </Card>
        </GmOnlySection>
      ) : null}
    </div>
  );
}
