import type { WikiEntity } from "@/app/campaigns/wiki-actions";
import { NpcView } from "./npc-view";
import { MonsterView } from "./monster-view";
import { LocationView } from "./location-view";
import { LoreView } from "./lore-view";
import { ItemView } from "./item-view";
import { GmOnlySection } from "./gm-only-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

type WikiDetailsProps = {
  entity: WikiEntity;
  contentBody: string;
  isGmOrAdmin?: boolean;
};

export function WikiDetails({ entity, contentBody, isGmOrAdmin = false }: WikiDetailsProps) {
  const attrs = entity.attributes ?? {};
  const imageUrl = entity.image_url ?? null;
  const telegramFallbackId = entity.telegram_fallback_id ?? null;
  const gmNotes = typeof attrs.gm_notes === "string" ? attrs.gm_notes.trim() : "";

  const typeView =
    entity.type === "npc" ? (
      <NpcView
        name={entity.name}
        body={contentBody}
        imageUrl={imageUrl}
        telegramFallbackId={telegramFallbackId}
        attributes={attrs as { relationships?: string; loot?: string }}
        isGmOrAdmin={isGmOrAdmin}
      />
    ) : entity.type === "monster" ? (
      <MonsterView
        name={entity.name}
        body={contentBody}
        imageUrl={imageUrl}
        telegramFallbackId={telegramFallbackId}
        attributes={attrs as { combat_stats?: { hp?: string; ac?: string; cr?: string; attacks?: string }; loot?: string }}
        isGmOrAdmin={isGmOrAdmin}
      />
    ) : entity.type === "location" ? (
      <LocationView
        name={entity.name}
        body={contentBody}
        imageUrl={imageUrl}
        telegramFallbackId={telegramFallbackId}
        attributes={attrs as { loot?: string }}
        isGmOrAdmin={isGmOrAdmin}
      />
    ) : entity.type === "lore" ? (
      <LoreView
        name={entity.name}
        body={contentBody}
        attributes={attrs as { is_chapter?: boolean; summary?: string }}
        sortOrder={entity.sort_order ?? null}
      />
    ) : (
      <ItemView
        name={entity.name}
        body={contentBody}
        imageUrl={imageUrl}
        telegramFallbackId={telegramFallbackId}
      />
    );

  return (
    <div className="space-y-8">
      {typeView}
      {gmNotes && (
        <GmOnlySection isGmOrAdmin={isGmOrAdmin}>
          <Card className="border-barber-gold/40 bg-barber-dark/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-barber-gold">
                <FileText className="h-4 w-4" />
                Note GM
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="whitespace-pre-wrap text-barber-paper/80">{gmNotes}</div>
            </CardContent>
          </Card>
        </GmOnlySection>
      )}
    </div>
  );
}
