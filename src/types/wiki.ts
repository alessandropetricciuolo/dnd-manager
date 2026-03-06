/**
 * Attributi specifici per tipo, salvati in wiki_entities.attributes (JSONB).
 */

export interface NpcAttributes {
  relationships?: string;
  loot?: string;
}

export interface LocationAttributes {
  loot?: string;
}

export interface MonsterCombatStats {
  hp?: string;
  ac?: string;
  cr?: string;
  attacks?: string;
}

export interface MonsterAttributes {
  combat_stats?: MonsterCombatStats;
  loot?: string;
}

export interface ItemAttributes {
  /** Nessun attributo extra per ora */
}

export interface LoreAttributes {
  is_chapter?: boolean;
  summary?: string;
}

export type WikiEntityAttributes =
  | NpcAttributes
  | LocationAttributes
  | MonsterAttributes
  | ItemAttributes
  | LoreAttributes;

/** Note riservate a GM/Admin, presenti in tutte le voci wiki. */
const GM_NOTES_KEY = "gm_notes";

export function getEmptyAttributes(type: string): Record<string, unknown> {
  const base = { [GM_NOTES_KEY]: "" as string };
  switch (type) {
    case "npc":
      return { ...base, relationships: "", loot: "" };
    case "location":
      return { ...base, loot: "" };
    case "monster":
      return {
        ...base,
        combat_stats: { hp: "", ac: "", cr: "", attacks: "" },
        loot: "",
      };
    case "lore":
      return { ...base, is_chapter: false, summary: "" };
    case "item":
    default:
      return base;
  }
}
