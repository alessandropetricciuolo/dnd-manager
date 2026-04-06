/** Chiavi `metadata.manual_book_key` usate dall'ingest e filtri esclusione RAG wiki. */

export const WIKI_MANUAL_BOOK_OPTIONS = [
  { key: "player_handbook", label: "Manuale del Giocatore" },
  { key: "monster_manual", label: "Manuale dei Mostri" },
  { key: "mordenkainen_multiverse", label: "Mostri del Multiverso" },
  { key: "eberron", label: "Eberron — Rinascita dopo l'Ultima Guerra" },
  { key: "tasha", label: "Calderone di Tasha" },
  { key: "xanathar", label: "Guida di Xanathar" },
] as const;

export type WikiManualBookKey = (typeof WIKI_MANUAL_BOOK_OPTIONS)[number]["key"];

const VALID = new Set<string>(WIKI_MANUAL_BOOK_OPTIONS.map((o) => o.key));

export function isValidWikiManualBookKey(k: string): k is WikiManualBookKey {
  return VALID.has(k);
}

export function normalizeExcludedWikiManualKeys(raw: unknown): WikiManualBookKey[] {
  if (!Array.isArray(raw)) return [];
  const out: WikiManualBookKey[] = [];
  for (const x of raw) {
    if (typeof x === "string" && isValidWikiManualBookKey(x) && !out.includes(x as WikiManualBookKey)) {
      out.push(x as WikiManualBookKey);
    }
  }
  return out;
}

export function wikiManualBookLabel(key: string): string {
  const o = WIKI_MANUAL_BOOK_OPTIONS.find((x) => x.key === key);
  return o?.label ?? key;
}
