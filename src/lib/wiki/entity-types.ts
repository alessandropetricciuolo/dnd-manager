export const WIKI_ENTITY_TYPES = ["npc", "location", "monster", "item", "lore"] as const;

export type WikiEntityType = (typeof WIKI_ENTITY_TYPES)[number];

export const WIKI_ENTITY_LABELS_IT: Record<WikiEntityType, string> = {
  npc: "NPC",
  location: "Luogo",
  monster: "Mostro",
  item: "Oggetto",
  lore: "Lore",
};

export const WIKI_FILTER_LABELS_IT: Record<"all" | WikiEntityType, string> = {
  all: "Tutti",
  ...WIKI_ENTITY_LABELS_IT,
};

export const WIKI_ENTITY_OPTIONS: ReadonlyArray<{
  value: WikiEntityType;
  label: string;
}> = WIKI_ENTITY_TYPES.map((value) => ({
  value,
  label: WIKI_ENTITY_LABELS_IT[value],
}));
