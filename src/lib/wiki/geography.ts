/** Read-only interpretation of the Atlas hierarchy and real Wiki relationships. */
export type GeographyEntity = {
  id: string;
  name: string;
  type: string;
  imageUrl: string | null;
  telegramFallbackId: string | null;
  adminOnly: boolean;
  status?: string;
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
  status?: string;
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
  "risiede presso", "vive nella casa famiglia", "opera nel catino",
  "sede operativa al civico 30", "ufficio distaccato", "mercato cittadino",
  "cameriera", "cameriere", "capocuoca", "capocuoco", "locandiere", "dirige la locanda",
  "responsabile di sala", "proprietaria e locandiera",
]);
const IDENTITY_LABELS = new Set([
  "lore", "mappa della bottega", "mappa cittadina esistente", "mappa cittadina",
  "mappa della citta", "mappa del luogo", "entita cittadina", "interno della banca",
]);
const CONTAINMENT_LABELS = new Set(["contiene", "comprende", "ospita", "distretto cittadino", "distretto portuale"]);
const STAFF_LABELS = new Set(["cameriera", "cameriere", "capocuoca", "capocuoco", "locandiere", "dirige la locanda", "responsabile di sala", "proprietaria e locandiera"]);

function isPlaceAlias(label: string): boolean {
  return normalizeGeographyLabel(label) === "stesso luogo";
}

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
  const parents = new Map(data.entities.map(entity => [entity.id, entity.id]));
  const root = (id: string): string => {
    let current = id;
    while (parents.get(current) && parents.get(current) !== current) current = parents.get(current)!;
    return current;
  };
  for (const relationship of data.relationships) {
    if (!relationship.targetId || !isPlaceAlias(relationship.label)) continue;
    const source = entities.get(relationship.sourceId), target = entities.get(relationship.targetId);
    // An explicit place alias never merges people, missing or hidden endpoints.
    if (!source || !target || !["location", "lore"].includes(source.type) || !["location", "lore"].includes(target.type)) continue;
    const a = root(source.id), b = root(target.id);
    if (a !== b) parents.set(b, a);
  }
  const groups = new Map<string, string[]>();
  for (const entity of data.entities) groups.set(root(entity.id), [...(groups.get(root(entity.id)) ?? []), entity.id]);
  const wikiToPlace = new Map<string, string>();
  const placeWikiIds = new Map<string, string[]>();
  for (const ids of groups.values()) {
    ids.sort((a, b) => Number(entities.get(b)!.type === "location") - Number(entities.get(a)!.type === "location") || a.localeCompare(b));
    const representative = ids[0];
    placeWikiIds.set(representative, ids);
    for (const id of ids) wikiToPlace.set(id, representative);
  }
  const candidates = new Map<string, Set<string>>();
  const addCandidate = (wikiId: string, mapId: string) => {
    const placeId = wikiToPlace.get(wikiId)!;
    const set = candidates.get(placeId) ?? new Set<string>();
    set.add(mapId);
    candidates.set(placeId, set);
  };
  for (const map of data.maps) {
    if (map.wikiEntityId && entities.has(map.wikiEntityId)) {
      addCandidate(map.wikiEntityId, map.id);
    }
  }
  for (const relationship of data.relationships) {
    if (!relationship.targetMapId || !maps.has(relationship.targetMapId) || !entities.has(relationship.sourceId) || !isGeographyIdentity(relationship.label)) continue;
    addCandidate(relationship.sourceId, relationship.targetMapId);
  }
  const wikiToMap = new Map<string, string>();
  for (const [wikiId, ids] of candidates) {
    // Do not merge identities when the data points to several different maps.
    if (ids.size === 1) for (const id of placeWikiIds.get(wikiId)!) wikiToMap.set(id, [...ids][0]);
  }
  const mapToWiki = new Map<string, string>();
  for (const map of data.maps) {
    const ids = [...new Set([...wikiToMap].filter(([, mapId]) => mapId === map.id).map(([wikiId]) => wikiToPlace.get(wikiId)!))];
    if (map.wikiEntityId && wikiToMap.get(map.wikiEntityId) === map.id) mapToWiki.set(map.id, wikiToPlace.get(map.wikiEntityId)!);
    else if (ids.length === 1) mapToWiki.set(map.id, ids[0]);
  }
  return { maps, entities, wikiToMap, mapToWiki, wikiToPlace, placeWikiIds };
}

export type GeographyIndex = ReturnType<typeof buildGeographyIndex>;

export function getGeographyWikiIds(index: GeographyIndex, selection: GeographySelection): string[] {
  if (selection.kind === "wiki") return index.placeWikiIds.get(index.wikiToPlace.get(selection.id) ?? selection.id) ?? [];
  return [...index.wikiToMap].filter(([, mapId]) => mapId === selection.id).map(([wikiId]) => wikiId);
}

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
    const aliases = getGeographyWikiIds(index, selection).map(id => index.entities.get(id)!);
    return { ...selection, ...entity, name: aliases.map(alias => alias.name).join(" / ") || entity.name, adminOnly: aliases.some(alias => alias.adminOnly), labels: [] };
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

// Placement follows saved spatial edges only. Intermediate Wiki nodes must be
// physical places; a person's home or an organisation's activity is not a container.
function geographicPlacements(data: WikiGeographyData, index: GeographyIndex) {
  type Step = { target: GeographySelection; label: string; structural: boolean };
  const outgoing = new Map<string, Step[]>();
  const add = (id: string, step: Step) => {
    const source = index.wikiToPlace.get(id) ?? id;
    const target = step.target.kind === 'wiki' ? { kind: 'wiki' as const, id: index.wikiToPlace.get(step.target.id) ?? step.target.id } : step.target;
    if (target.kind === 'wiki' && target.id === source) return;
    outgoing.set(source, [...(outgoing.get(source) ?? []), { ...step, target }]);
  };
  for (const r of data.relationships) {
    if (!index.entities.has(r.sourceId)) continue;
    const label = normalizeGeographyLabel(r.label);
    const source = index.entities.get(r.sourceId)!;
    const targetEntity = r.targetId ? index.entities.get(r.targetId) : undefined;
    if (STAFF_LABELS.has(label) && source.type === 'location' && targetEntity?.type === 'npc') {
      // Legacy staff links are stored in both directions. Preserve their stored
      // direction in the relationship tree, but place the worker at the venue.
      add(targetEntity.id, { target: { kind: 'wiki', id: source.id }, label: r.label, structural: false });
    } else if (r.targetId && index.entities.has(r.targetId) && CONTAINMENT_LABELS.has(label)) {
      add(r.targetId, { target: { kind: 'wiki', id: r.sourceId }, label: r.label, structural: true });
    } else if (isGeographicRelationship(r.label)) {
      const target: GeographySelection | null = r.targetMapId && index.maps.has(r.targetMapId)
        ? { kind: 'map', id: r.targetMapId }
        : r.targetId && index.entities.has(r.targetId) ? { kind: 'wiki', id: r.targetId } : null;
      if (target) add(r.sourceId, { target, label: r.label, structural: label.startsWith('si trova ') || label.startsWith('distretto ') || label === 'mercato cittadino' });
    }
  }
  const result = new Map<string, Map<string, string[]>>();
  for (const entity of data.entities) {
    if (index.wikiToPlace.get(entity.id) !== entity.id) continue;
    const placements = new Map<string, string[]>();
    const walk = (selection: GeographySelection, labels: string[], via: string[], seen: Set<string>) => {
      const key = geographyKey(selection);
      if (seen.has(key)) return;
      const visited = new Set(seen).add(key);
      const mapId = selection.kind === 'map' ? selection.id : index.wikiToMap.get(selection.id);
      if (mapId) {
        for (const place of getGeographyPath(index, mapId)) {
          if (index.wikiToMap.get(entity.id) === place.id) continue;
          const intermediates = [...via, ...(place.id !== mapId ? [index.maps.get(mapId)!.name] : [])];
          const label = labels.length ? labels[0] + (intermediates.length ? ' · tramite ' + intermediates.join(' → ') : '') : 'Luogo nell’Atlante';
          placements.set(place.id, [...new Set([...(placements.get(place.id) ?? []), label])]);
        }
        return;
      }
      const node = index.entities.get(selection.id);
      if (!node || (selection.id !== entity.id && node.type !== 'location' && node.type !== 'lore')) return;
      for (const step of outgoing.get(selection.id) ?? []) {
        if (selection.id !== entity.id && !step.structural) continue;
        walk(step.target, [...labels, step.label], selection.id === entity.id ? via : [...via, node.name], visited);
      }
    };
    // An explicit Wiki/map identity also anchors that place in its Atlas parents.
    walk({ kind: 'wiki', id: entity.id }, [], [], new Set());
    result.set(entity.id, placements);
  }
  return result;
}

export function getGeographyContext(data: WikiGeographyData, index: GeographyIndex, mapId: string) {
  const placements = geographicPlacements(data, index);
  const local: GeographyEntry[] = [];
  const references = new Map<string, GeographyEntry>();
  for (const [id, places] of placements) {
    const labels = places.get(mapId);
    if (labels) local.push({ ...getGeographyEntry(index, { kind: 'wiki', id })!, labels });
  }
  for (const r of data.relationships) {
    if (targetMap(index, r) !== mapId || isGeographyIdentity(r.label) || isPlaceAlias(r.label) || isGeographicRelationship(r.label)) continue;
    const entry = getGeographyEntry(index, { kind: 'wiki', id: index.wikiToPlace.get(r.sourceId) ?? r.sourceId });
    if (!entry) continue;
    const existing = references.get(entry.id);
    references.set(entry.id, { ...entry, labels: [...new Set([...(existing?.labels ?? []), r.label])] });
  }
  const sort = (a: GeographyEntry, b: GeographyEntry) => a.name.localeCompare(b.name, 'it');
  return {
    children: data.maps.filter(map => map.parentId === mapId).map(map => getGeographyEntry(index, { kind: 'map', id: map.id })!).sort(sort),
    local: local.sort(sort),
    references: [...references.values()].sort(sort),
  };
}

export function getUnplacedGeography(data: WikiGeographyData, index: GeographyIndex): GeographyEntry[] {
  const placements = geographicPlacements(data, index);
  return data.entities.filter(entity => index.wikiToPlace.get(entity.id) === entity.id && !placements.get(entity.id)?.size && !index.wikiToMap.has(entity.id))
    .map(entity => getGeographyEntry(index, { kind: 'wiki', id: entity.id })!)
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));
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
  return mapId ? `map:${mapId}` : selection.kind === "wiki" ? `wiki:${index.wikiToPlace.get(selection.id) ?? selection.id}` : geographyKey(selection);
}

export type GeographyNeighbor = {
  entry: GeographyEntry;
  relations: { id: string; label: string; direction: "out" | "in"; sourceName: string; targetName: string }[];
};

const GROUP_MEMBER_LABELS = new Set([
  "membro", "membro dei", "membro di", "appartiene alla gilda", "fondatore", "cofondatore",
  "fondatore e tutore", "lavora per", "vive nella casa famiglia", "risiede presso", "lavora presso",
  "cameriera", "cameriere", "locandiere", "capocuoco", "capocuoca", "responsabile di sala",
  "capo della banda", "luogotenente e capo delle zanne", "contabile e stratega economica",
]);
const GROUP_CONTAINS_LABELS = new Set(["ha come membro", "contiene", "comprende", "ospita", "proprietaria della spezieria", "referente dei moli"]);

/** Presentation groups only: never infer membership from mentions or a shared city. */
export function getGeographyCityGroups(data: WikiGeographyData, index: GeographyIndex, mapId: string) {
  const context = getGeographyContext(data, index, mapId);
  const candidates = new Map<string, GeographyEntry>();
  for (const entry of [...context.children, ...context.local]) {
    if (entry.kind === "wiki" && !["lore", "location"].includes(entry.type ?? "")) continue;
    candidates.set(geographyIdentityKey(index, entry), entry);
  }
  const cityKey = geographyIdentityKey(index, { kind: "map", id: mapId });
  const groups = [...candidates.values()].flatMap(entry => {
    const members = getGeographyNeighbors(data, index, entry).flatMap(neighbor => {
      if (geographyIdentityKey(index, neighbor.entry) === cityKey) return [];
      const relations = neighbor.relations.filter(relation =>
        (relation.direction === "in" && (GROUP_MEMBER_LABELS.has(normalizeGeographyLabel(relation.label)) || isGeographicRelationship(relation.label))) ||
        (relation.direction === "out" && (GROUP_CONTAINS_LABELS.has(normalizeGeographyLabel(relation.label)) ||
          (neighbor.entry.type === "npc" && STAFF_LABELS.has(normalizeGeographyLabel(relation.label))))));
      return relations.length ? [{ ...neighbor, relations }] : [];
    });
    return members.length ? [{ entry, members }] : [];
  });
  // Hubs remain at city level even when they also belong to another hub.
  const hubKeys = new Set(groups.map(group => geographyIdentityKey(index, group.entry)));
  const nestedKeys = new Set(groups.flatMap(group => group.members.map(member => geographyIdentityKey(index, member.entry))));
  const remaining = [...context.children, ...context.local].filter(entry => {
    const key = geographyIdentityKey(index, entry);
    return !hubKeys.has(key) && !nestedKeys.has(key);
  });
  return { groups, remaining: [...new Map(remaining.map(entry => [geographyIdentityKey(index, entry), entry])).values()] };
}

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
    const entry = mapId ? getGeographyEntry(index, { kind: "map", id: mapId })! : other.kind === "wiki" ? getGeographyEntry(index, { kind: "wiki", id: index.wikiToPlace.get(other.id) ?? other.id })! : other;
    const neighbor = neighbors.get(key) ?? { entry, relations: [] };
    neighbor.relations.push({ id: link.relationshipId, label: link.label, direction, sourceName: link.source.name, targetName: link.target.name });
    neighbors.set(key, neighbor);
  }
  return [...neighbors.values()];
}

export function getGeographyLinks(data: WikiGeographyData, index: GeographyIndex, selection: GeographySelection): GeographyLink[] {
  const wikiIds = new Set<string>(getGeographyWikiIds(index, selection));
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
    if (sourceKey === targetKey && (isGeographyIdentity(relationship.label) || isPlaceAlias(relationship.label))) return [];
    const key = `${sourceKey}:${targetKey}:${normalizeGeographyLabel(relationship.label)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ relationshipId: relationship.id, source, target, label: relationship.label }];
  }).sort((a, b) => Number(normalizeGeographyLabel(a.label) === "menzionato nel testo") - Number(normalizeGeographyLabel(b.label) === "menzionato nel testo") || a.label.localeCompare(b.label, "it"));
}
