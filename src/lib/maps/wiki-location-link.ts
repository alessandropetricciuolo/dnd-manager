/** Opzione luogo wiki per collegamento pin o binding mappa. */
export type WikiLocationOption = {
  id: string;
  name: string;
  /** Mappa interattiva già collegata a questo luogo (se presente). */
  boundMapId: string | null;
};

export type PinLinkTarget =
  | { kind: "map"; mapId: string }
  | { kind: "wiki"; entityId: string }
  | null;

/** Risolve la destinazione di un pin: mappa diretta, oppure mappa del luogo wiki, oppure scheda wiki. */
export function resolveMapPinTarget(
  pin: {
    linkMapId?: string;
    linkEntityId?: string;
  },
  entityIdToMapId: Record<string, string>
): PinLinkTarget {
  if (pin.linkMapId) return { kind: "map", mapId: pin.linkMapId };
  if (pin.linkEntityId) {
    const boundMapId = entityIdToMapId[pin.linkEntityId];
    if (boundMapId) return { kind: "map", mapId: boundMapId };
    return { kind: "wiki", entityId: pin.linkEntityId };
  }
  return null;
}

/** Indice entityId → mapId da righe maps con wiki_entity_id. */
export function buildWikiLocationMapIndex(
  rows: Array<{ id: string; wiki_entity_id: string | null }>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    if (row.wiki_entity_id) out[row.wiki_entity_id] = row.id;
  }
  return out;
}
