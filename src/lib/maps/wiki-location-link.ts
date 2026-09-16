/** Opzione luogo wiki per collegamento pin o binding mappa. */
export type WikiLocationOption = {
  id: string;
  name: string;
  /** Mappa interattiva già collegata a questo luogo (se presente). */
  boundMapId: string | null;
};

export type PinCountRow = {
  id: string;
  link_map_id: string | null;
  link_entity_id: string | null;
};

export type PinTargetCountIndex = {
  mapPinCounts: Record<string, number>;
  wikiPinCounts: Record<string, number>;
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

/**
 * Conta i pin per destinazione, includendo il binding mappa ↔ luogo.
 *
 * I set di destinazioni visibili sono obbligatoriamente forniti dal chiamante:
 * impediscono che i conteggi attraversino il confine della campagna o Solo Admin.
 * Un id pin ripetuto viene contato una sola volta; se un record legacy ha entrambi
 * i link, il collegamento diretto alla mappa segue la precedenza di resolveMapPinTarget.
 */
export function countPinsByTarget(
  pins: PinCountRow[],
  entityIdToMapId: Record<string, string>,
  mapIdToEntityId: Record<string, string>,
  visible: { mapIds: Iterable<string>; entityIds: Iterable<string> }
): PinTargetCountIndex {
  const visibleMapIds = new Set(visible.mapIds);
  const visibleEntityIds = new Set(visible.entityIds);
  const mapPinCounts: Record<string, number> = {};
  const wikiPinCounts: Record<string, number> = {};
  const seenPinIds = new Set<string>();

  for (const pin of pins) {
    if (!pin.id || seenPinIds.has(pin.id)) continue;
    seenPinIds.add(pin.id);

    if (pin.link_map_id) {
      // A hidden direct target must not leak a count through a visible binding.
      if (!visibleMapIds.has(pin.link_map_id)) continue;
      mapPinCounts[pin.link_map_id] = (mapPinCounts[pin.link_map_id] ?? 0) + 1;
      const boundEntityId = mapIdToEntityId[pin.link_map_id];
      if (boundEntityId && visibleEntityIds.has(boundEntityId)) {
        wikiPinCounts[boundEntityId] = (wikiPinCounts[boundEntityId] ?? 0) + 1;
      }
      continue;
    }

    if (!pin.link_entity_id) continue;
    // A hidden direct target must not leak a count through a visible binding.
    if (!visibleEntityIds.has(pin.link_entity_id)) continue;
    wikiPinCounts[pin.link_entity_id] = (wikiPinCounts[pin.link_entity_id] ?? 0) + 1;
    const boundMapId = entityIdToMapId[pin.link_entity_id];
    if (boundMapId && visibleMapIds.has(boundMapId)) {
      mapPinCounts[boundMapId] = (mapPinCounts[boundMapId] ?? 0) + 1;
    }
  }

  return { mapPinCounts, wikiPinCounts };
}

export function formatPinCountLabel(count: number | null | undefined, available = true): string {
  if (!available || count == null) return "Conteggio non disponibile";
  return count === 0 ? "Nessun pin collegato" : `Già collegato · ${count} pin`;
}
