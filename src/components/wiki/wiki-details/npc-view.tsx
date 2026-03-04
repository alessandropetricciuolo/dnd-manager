import Image from "next/image";
import { EntityContent } from "../entity-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Coins } from "lucide-react";
import { GmOnlySection } from "./gm-only-section";

const PLACEHOLDER = "https://placehold.co/400x500/1e293b/10b981/png?text=NPC";

type NpcViewProps = {
  name: string;
  body: string;
  imageUrl: string | null;
  attributes: { relationships?: string; loot?: string } | null;
  isGmOrAdmin?: boolean;
};

export function NpcView({ name, body, imageUrl, attributes, isGmOrAdmin = false }: NpcViewProps) {
  const attrs = attributes ?? {};
  const relationships = attrs.relationships?.trim();
  const loot = attrs.loot?.trim();

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-barber-gold/30 bg-barber-dark">
            <Image
              src={imageUrl ?? PLACEHOLDER}
              alt={name}
              fill
              className="object-cover"
              sizes="280px"
              unoptimized={!!imageUrl}
            />
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-semibold text-barber-gold">Storia</h2>
          {body ? <EntityContent content={body} /> : <p className="text-barber-paper/60 italic">Nessuna storia.</p>}
        </div>
      </div>
      {relationships && (
        <GmOnlySection isGmOrAdmin={isGmOrAdmin}>
          <Card className="border-barber-gold/40 bg-barber-dark/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-barber-gold">
                <Users className="h-4 w-4" />
                Rapporti interpersonali
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="whitespace-pre-wrap text-barber-paper/80">{relationships}</div>
            </CardContent>
          </Card>
        </GmOnlySection>
      )}
      {loot && (
        <GmOnlySection isGmOrAdmin={isGmOrAdmin}>
          <Card className="border-barber-gold/40 bg-barber-dark/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-barber-gold">
                <Coins className="h-4 w-4" />
                Loot
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="whitespace-pre-wrap text-barber-paper/80">{loot}</div>
            </CardContent>
          </Card>
        </GmOnlySection>
      )}
    </div>
  );
}
