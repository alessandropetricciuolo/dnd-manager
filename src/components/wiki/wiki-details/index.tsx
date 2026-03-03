import type { WikiEntity } from "@/app/campaigns/wiki-actions";
import { NpcView } from "./npc-view";
import { MonsterView } from "./monster-view";
import { LocationView } from "./location-view";
import { LoreView } from "./lore-view";
import { ItemView } from "./item-view";

type WikiDetailsProps = {
  entity: WikiEntity;
  contentBody: string;
  isGmOrAdmin?: boolean;
};

export function WikiDetails({ entity, contentBody, isGmOrAdmin = false }: WikiDetailsProps) {
  const attrs = entity.attributes ?? {};
  const imageUrl = entity.image_url ?? null;

  switch (entity.type) {
    case "npc":
      return (
        <NpcView
          name={entity.name}
          body={contentBody}
          imageUrl={imageUrl}
          attributes={attrs as { relationships?: string; loot?: string }}
          isGmOrAdmin={isGmOrAdmin}
        />
      );
    case "monster":
      return (
        <MonsterView
          name={entity.name}
          body={contentBody}
          attributes={attrs as { combat_stats?: { hp?: string; ac?: string; cr?: string; attacks?: string }; loot?: string }}
          isGmOrAdmin={isGmOrAdmin}
        />
      );
    case "location":
      return (
        <LocationView
          name={entity.name}
          body={contentBody}
          imageUrl={imageUrl}
          attributes={attrs as { loot?: string }}
          isGmOrAdmin={isGmOrAdmin}
        />
      );
    case "lore":
      return (
        <LoreView
          name={entity.name}
          body={contentBody}
          attributes={attrs as { is_chapter?: boolean; summary?: string }}
          sortOrder={entity.sort_order ?? null}
        />
      );
    case "item":
    default:
      return (
        <ItemView
          name={entity.name}
          body={contentBody}
          imageUrl={imageUrl}
        />
      );
  }
}
