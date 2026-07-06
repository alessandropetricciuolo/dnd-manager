import Link from "next/link";
import type { ComponentType } from "react";
import { Link2, Map, MapPin, MoveDownLeft, MoveUpRight, Package, ScrollText, Skull, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RelatedEntityLink } from "@/app/campaigns/entity-graph-actions";
import { cn } from "@/lib/utils";

const TYPE_META: Record<string, { icon: ComponentType<{ className?: string }>; text: string; border: string }> = {
  npc: { icon: Users, text: "text-amber-200", border: "border-amber-500/30" },
  location: { icon: MapPin, text: "text-emerald-200", border: "border-emerald-500/30" },
  monster: { icon: Skull, text: "text-red-200", border: "border-red-500/30" },
  item: { icon: Package, text: "text-blue-200", border: "border-blue-500/30" },
  lore: { icon: ScrollText, text: "text-violet-200", border: "border-violet-500/30" },
};

const MAP_META = { icon: Map, text: "text-sky-200", border: "border-sky-500/30" };

function displayLabel(label: string): string | null {
  const trimmed = label.trim();
  if (!trimmed || trimmed === "—") return null;
  return trimmed;
}

type Props = {
  campaignId: string;
  links: RelatedEntityLink[];
};

/**
 * Sezione "Collegamenti": entità wiki e mappe relazionate (dalla mappa concettuale)
 * con link diretto per aprirle. Le relazioni entranti sono marcate con una freccia in entrata.
 */
export function RelatedEntitiesSection({ campaignId, links }: Props) {
  if (links.length === 0) return null;

  return (
    <Card className="border-barber-gold/40 bg-barber-dark/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-barber-gold">
          <Link2 className="h-4 w-4" />
          Collegamenti
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const meta = link.kind === "map" ? MAP_META : (TYPE_META[link.type ?? ""] ?? TYPE_META.lore);
            const Icon = meta.icon;
            const label = displayLabel(link.label);
            const href =
              link.kind === "map"
                ? `/campaigns/${campaignId}/maps/${link.id}`
                : `/campaigns/${campaignId}/wiki/${link.id}`;
            const DirectionIcon = link.direction === "in" ? MoveDownLeft : MoveUpRight;
            return (
              <Link
                key={link.relationshipId}
                href={href}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border bg-barber-dark/70 px-3 py-1.5 transition-colors hover:bg-barber-gold/10",
                  meta.border
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", meta.text)} />
                <span className="text-sm font-medium text-barber-paper group-hover:text-barber-gold">
                  {link.name}
                </span>
                {label && (
                  <span className="flex items-center gap-1 text-xs text-barber-paper/60">
                    <DirectionIcon className="h-3 w-3" />
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
