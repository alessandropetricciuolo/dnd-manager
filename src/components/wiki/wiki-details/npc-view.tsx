import { EntityContent } from "../entity-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPopoutButton } from "@/components/maps/map-popout-button";
import { Users, Coins, UserCircle2 } from "lucide-react";
import { GmOnlySection } from "./gm-only-section";
import { DualSourceImage } from "@/components/dual-source-image";

const PLACEHOLDER = "https://placehold.co/400x500/1c1917/fbbf24/png?text=NPC";

type NpcViewProps = {
  name: string;
  body: string;
  imageUrl: string | null;
  telegramFallbackId?: string | null;
  attributes: { race?: string; class?: string; age?: string; relationships?: string; loot?: string } | null;
  isGmOrAdmin?: boolean;
};

export function NpcView({
  name,
  body,
  imageUrl,
  telegramFallbackId,
  attributes,
  isGmOrAdmin = false,
}: NpcViewProps) {
  const attrs = attributes ?? {};
  const race = attrs.race?.trim();
  const npcClass = attrs.class?.trim();
  const age = attrs.age?.trim();
  const relationships = attrs.relationships?.trim();
  const loot = attrs.loot?.trim();

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-barber-gold/30 bg-barber-dark">
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
        <div>
          <h2 className="mb-4 text-lg font-semibold text-barber-gold">Storia</h2>
          {(race || npcClass || age) && (
            <Card className="mb-4 border-barber-gold/35 bg-barber-dark/70">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-barber-gold">
                  <UserCircle2 className="h-4 w-4" />
                  Profilo rapido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-barber-paper/60">Razza</p>
                    <p className="text-sm text-barber-paper">{race || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-barber-paper/60">Classe</p>
                    <p className="text-sm text-barber-paper">{npcClass || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-barber-paper/60">Età</p>
                    <p className="text-sm text-barber-paper">{age || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
