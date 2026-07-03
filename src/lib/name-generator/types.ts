import type { ContextualNameKind } from "@/lib/ai/contextual-names";

/** Tipi supportati dal generatore nomi in UI. */
export type NameGeneratorKind = ContextualNameKind | "guild" | "scene";

export const NAME_GENERATOR_KIND_LABELS: Record<NameGeneratorKind, string> = {
  npc: "NPC",
  location: "luogo",
  monster: "mostro",
  item: "oggetto",
  magic_item: "oggetto magico",
  lore: "voce lore",
  character: "personaggio",
  mission: "missione",
  campaign: "campagna",
  guild: "gilda",
  scene: "scena",
};
