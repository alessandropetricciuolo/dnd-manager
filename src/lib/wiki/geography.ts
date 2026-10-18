/** Read-only interpretation of the Atlas hierarchy and real Wiki relationships. */
export type GeographyEntity = {
  id: string;
  name: string;
  type: string;
  imageUrl: string | null;
  telegramFallbackId: string | null;
  adminOnly: boolean;
};

export type GeographyMap = {
  id: string;
  name: string;
  mapType: string;
  parentId: string | null;
  wikiEntityId: string | null;
  imageUrl: string | null;
  adminOnly: boolean;
};

export type GeographyRelationship = {
  id: string;
  sourceId: string;
  targetId: string | null;
  targetMapId: string | null;
  label: string;
};

export type WikiGeographyData = {
  campaignName: string;
  entities: GeographyEntity[];
  maps: GeographyMap[];
  relationships: GeographyRelationship[];
};

export type GeographySelection = { kind: "wiki" | "map"; id: string };
export type GeographyEntry = GeographySelection & {
  name: string;
  imageUrl: string | null;
  telegramFallbackId: string | null;
  adminOnly: boolean;
  labels: string[];
  type?: string;
};

export function normalizeGeographyLabel(label: string): string {
  return label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

// Deliberately conservative: unfamiliar labels remain visible as other links.
// A mention, origin, past event or generic membership never establishes location.
const LOCATION_LABELS = new Set([
  "si trova in", "si trova a", "si trova qui", "vive a", "vive qui", "vive e lavora a", "risiede a",
  "lavora a", "lavora presso", "lavora qui", "lavora nella bottega", "opera a",
  "ha sede a", "sede cittadina", "sede principale", "sede continentale", "sede operativa",
  "portale cittadino", "bancarella al mercato", "distretto cittadino", "distretto portuale",
  "si trova ad altaguardia", "vive e lavora ad altaguardia", "opera a portico", "opera a squashburri",
]);
const IDENTITY_LABELS = new Set([
  "lore", "mappa della bottega", "mappa cittadina esistente", "mappa cittadina",
  "mappa della citta", "mappa del luogo", "entita cittadina", "interno della banca",
]);
const CONTAINMENT_LABELS = new Set(["contiene", "comprende", "ospita", "distretto cittadino", "distretto portuale"]);

export function isGeographicRelationship(label: string): boolean {
  return LOCATION_LABELS.has(normalizeGeographyLabel(label));
}

export function isGeographyIdentity(label: string): boolean {
  return IDENTITY_LABELS.has(normalizeGeographyLabel(label));
}

export function geographyKey(selection: GeographySelection): string {
  return `${selection.kind}:${selection.id}`;
}

export function buildGeographyIndex(data: WikiGeographyData) {
  const maps = new Map(data.maps.map(map => [map.id, map]));
  const entities = new Map(data.entities.map(entity => [entity.id, entity]));
  const candidates = new Map<string, Set<string>>();
  for (const map of data.maps) {
    if (map.wikiEntityId && entities.has(map.wikiEntityId)) {
      const set = candidates.get(map.wikiEntityId) ?? new Set<string>();
      set.add(map.id);
      candidates.set(map.wikiEntityId, set);
    }
  }
  for (const relationship of data.relationships) {
    if (!relationship.targetMapId || !maps.has(relationship.targetMapId) || !entities.has(relationship.sourceId) || !isGeographyIdentity(relationship.label)) continue;
    const set = candidates.get(relationship.sourceId) ?? new Set<string>();
    set.add(relationship.targetMapId);
    candidates.set(relationship.sourceId, set);
  }
  const wikiToMap = new Map<string, string>();
  for (const [wikiId, ids] of candidates) {
    // Do not merge identities when the data points to several different maps.
    if (ids.size === 1) wikiToMap.set(wikiId, [...ids][0]);
  }
  const mapToWiki = new Map<string, string>();
  for (const map of data.maps) {
    const ids = [...wikiToMap].filter(([, mapId]) => mapId === map.id).map(([wikiId]) => wikiId);
    if (map.wikiEntityId && wikiToMap.get(map.wikiEntityId) === map.id) mapToWiki.set(map.id, map.wikiEntityId);
    else if (ids.length === 1) mapToWiki.set(map.id, ids[0]);
  }
  return { maps, entities, wikiToMap, mapToWiki };
}

export type GeographyIndex = ReturnType<typeof buildGeographyIndex>;

export function getGeographyPath(index: GeographyIndex, id: string): GeographyMap[] {
  const path: GeographyMap[] = [];
  const seen = new Set<string>();
  let current = index.maps.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? index.maps.get(current.parentId) : undefined;
  }
  return path;
}

export function getGeographyEntry(index: GeographyIndex, selection: GeographySelection): GeographyEntry | null {
  if (selection.kind === "wiki") {
    const entity = index.entities.get(selection.id);
    if (!entity) return null;
    return { ...selection, ...entity, labels: [] };
  }
  const map = index.maps.get(selection.id);
  if (!map) return null;
  const wikiId = index.mapToWiki.get(map.id);
  const wiki = wikiId ? index.entities.get(wikiId) : undefined;
  return { ...selection, name: map.name, imageUrl: wiki?.imageUrl ?? map.imageUrl, telegramFallbackId: wiki?.telegramFallbackId ?? null, adminOnly: map.adminOnly || Boolean(wiki?.adminOnly), labels: [] };
}

function targetMap(index: GeographyIndex, relationship: GeographyRelationship): string | undefined {
  return relationship.targetMapId ?? (relationship.targetId ? index.wikiToMap.get(relationship.targetId) : undefined);
}

export function getGeographyContext(data: WikiGeographyData, index: GeographyIndex, mapId: string) {
  const local = new Map<string, GeographyEntry>();
  const references = new Map<string, GeographyEntry>();
  for (const relationship of data.relationships) {
    if (index.wikiToMap.get(relationship.sourceId) === mapId && relationship.targetId && CONTAINMENT_LABELS.has(normalizeGeographyLabel(relationship.label))) {
      const child = getGeographyEntry(index, { kind: "wiki", id: relationship.targetId });
      if (child) {
        const existing = local.get(child.id);
        local.set(child.id, { ...child, labels: [...new Set([...(existing?.labels ?? []), relationship.label])] });
      }
    }
    if (targetMap(index, relationship) !== mapId || !index.entities.has(relationship.sourceId) || isGeographyIdentity(relationship.label)) continue;
    const entry = getGeographyEntry(index, { kind: "wiki", id: relationship.sourceId });
    if (!entry) continue;
    const bucket = isGeographicRelationship(relationship.label) ? local : references;
    const existing = bucket.get(entry.id);
    if (existing) existing.labels = [...new Set([...existing.labels, relationship.label])];
    else bucket.set(entry.id, { ...entry, labels: [relationship.label] });
  }
  const sort = (a: GeographyEntry, b: GeographyEntry) => a.name.localeCompare(b.name, "it");
  return {
    children: data.maps.filter(map => map.parentId === mapId).map(map => getGeographyEntry(index, { kind: "map", id: map.id })!).sort(sort),
    local: [...local.values()].sort(sort),
    references: [...references.values()].sort(sort),
  };
}

export function getUnplacedGeography(data: WikiGeographyData, index: GeographyIndex): GeographyEntry[] {
  const placed = new Set<string>();
  for (const relationship of data.relationships) {
    const mapId = targetMap(index, relationship);
    if (mapId && index.maps.has(mapId) && isGeographicRelationship(relationship.label)) placed.add(relationship.sourceId);
    if (index.wikiToMap.has(relationship.sourceId) && relationship.targetId && CONTAINMENT_LABELS.has(normalizeGeographyLabel(relationship.label))) placed.add(relationship.targetId);
  }
  return data.entities.filter(entity => !placed.has(entity.id) && !index.wikiToMap.has(entity.id))
    .map(entity => getGeographyEntry(index, { kind: "wiki", id: entity.id })!)
    .sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export type GeographyLink = {
  relationshipId: string;
  source: GeographyEntry;
  target: GeographyEntry;
  label: string;
};

/** The same place may have a Wiki entry and an Atlas map, but is one visual node. */
export function geographyIdentityKey(index: GeographyIndex, selection: GeographySelection): string {
  const mapId = selection.kind === "wiki" ? index.wikiToMap.get(selection.id) : undefined;
  return mapId ? `map:${mapId}` : geographyKey(selection);
}

export type GeographyNeighbor = {
  entry: GeographyEntry;
  relations: { id: string; label: string; direction: "out" | "in"; sourceName: string; targetName: string }[];
};

/** Only direct, stored edges. Second hops are obtained by expanding a neighbor. */
export function getGeographyNeighbors(data: WikiGeographyData, index: GeographyIndex, selection: GeographySelection): GeographyNeighbor[] {
  const rootKey = geographyIdentityKey(index, selection);
  const neighbors = new Map<string, GeographyNeighbor>();
  for (const link of getGeographyLinks(data, index, selection)) {
    const direction = geographyIdentityKey(index, link.source) === rootKey ? "out" : "in";
    const other = direction === "out" ? link.target : link.source;
    const key = geographyIdentityKey(index, other);
    if (key === rootKey) continue;
    const mapId = other.kind === "wiki" ? index.wikiToMap.get(other.id) : undefined;
    const entry = mapId ? getGeographyEntry(index, { kind: "map", id: mapId })! : other;
    const neighbor = neighbors.get(key) ?? { entry, relations: [] };
    neighbor.relations.push({ id: link.relationshipId, label: link.label, direction, sourceName: link.source.name, targetName: link.target.name });
    neighbors.set(key, neighbor);
  }
  return [...neighbors.values()];
}

export function getGeographyLinks(data: WikiGeographyData, index: GeographyIndex, selection: GeographySelection): GeographyLink[] {
  const wikiIds = new Set<string>(selection.kind === "wiki" ? [selection.id] : []);
  const mapIds = new Set<string>(selection.kind === "map" ? [selection.id] : []);
  if (selection.kind === "wiki") {
    const mapId = index.wikiToMap.get(selection.id);
    if (mapId) mapIds.add(mapId);
  } else {
    for (const [wikiId, mapId] of index.wikiToMap) if (mapId === selection.id) wikiIds.add(wikiId);
  }
  const seen = new Set<string>();
  return data.relationships.flatMap(relationship => {
    if (!wikiIds.has(relationship.sourceId) && !(relationship.targetId && wikiIds.has(relationship.targetId)) && !(relationship.targetMapId && mapIds.has(relationship.targetMapId))) return [];
    const source = getGeographyEntry(index, { kind: "wiki", id: relationship.sourceId });
    const target = relationship.targetMapId ? getGeographyEntry(index, { kind: "map", id: relationship.targetMapId }) : relationship.targetId ? getGeographyEntry(index, { kind: "wiki", id: relationship.targetId }) : null;
    if (!source || !target) return [];
    const sourceKey = geographyIdentityKey(index, source), targetKey = geographyIdentityKey(index, target);
    if (sourceKey === targetKey && isGeographyIdentity(relationship.label)) return [];
    const key = `${sourceKey}:${targetKey}:${normalizeGeographyLabel(relationship.label)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ relationshipId: relationship.id, source, target, label: relationship.label }];
  }).sort((a, b) => Number(normalizeGeographyLabel(a.label) === "menzionato nel testo") - Number(normalizeGeographyLabel(b.label) === "menzionato nel testo") || a.label.localeCompare(b.label, "it"));
}
