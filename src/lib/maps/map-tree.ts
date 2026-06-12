export type GalleryMap = {
  id: string;
  name: string;
  image_url: string;
  description: string | null;
  map_type: string;
  visibility: string;
  parent_map_id: string | null;
};

export type MapTreeNode = {
  map: GalleryMap;
  children: MapTreeNode[];
  /** Genitore assente o non visibile — utile per avviso GM */
  isOrphan?: boolean;
};

const TYPE_ORDER: Record<string, number> = {
  world: 0,
  continent: 1,
  city: 2,
  dungeon: 3,
  district: 4,
  building: 5,
};

const LEGACY_REGION = "region";

export function normalizeMapType(mapType: string | undefined | null): string {
  if (!mapType || mapType === LEGACY_REGION) return "city";
  return TYPE_ORDER[mapType] !== undefined ? mapType : "city";
}

function compareNodes(a: MapTreeNode, b: MapTreeNode): number {
  const ta = TYPE_ORDER[normalizeMapType(a.map.map_type)] ?? 99;
  const tb = TYPE_ORDER[normalizeMapType(b.map.map_type)] ?? 99;
  if (ta !== tb) return ta - tb;
  return a.map.name.localeCompare(b.map.name, "it", { sensitivity: "base" });
}

function sortTree(nodes: MapTreeNode[]): void {
  nodes.sort(compareNodes);
  for (const node of nodes) {
    sortTree(node.children);
  }
}

export function buildMapTree(
  maps: GalleryMap[],
  hasParentMapId: boolean
): { roots: MapTreeNode[]; orphans: MapTreeNode[] } {
  if (!maps.length) {
    return { roots: [], orphans: [] };
  }

  if (!hasParentMapId) {
    const roots = maps.map((map) => ({ map, children: [] as MapTreeNode[] }));
    sortTree(roots);
    return { roots, orphans: [] };
  }

  const byId = new Map<string, MapTreeNode>();
  for (const map of maps) {
    byId.set(map.id, { map, children: [] });
  }

  const roots: MapTreeNode[] = [];
  const orphans: MapTreeNode[] = [];

  for (const map of maps) {
    const node = byId.get(map.id)!;
    const parentId = map.parent_map_id;

    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children.push(node);
      continue;
    }

    if (parentId && !byId.has(parentId)) {
      node.isOrphan = true;
      orphans.push(node);
      continue;
    }

    roots.push(node);
  }

  sortTree(roots);
  sortTree(orphans);

  return { roots, orphans };
}

export function collectAncestorIds(
  roots: MapTreeNode[],
  targetId: string
): Set<string> {
  const ancestors = new Set<string>();

  function walk(nodes: MapTreeNode[], path: string[]): boolean {
    for (const node of nodes) {
      const nextPath = [...path, node.map.id];
      if (node.map.id === targetId) {
        for (const id of path) ancestors.add(id);
        return true;
      }
      if (node.children.length && walk(node.children, nextPath)) {
        return true;
      }
    }
    return false;
  }

  walk(roots, []);
  return ancestors;
}

export function findDefaultMapId(maps: GalleryMap[]): string | null {
  if (!maps.length) return null;
  const world = maps.find((m) => normalizeMapType(m.map_type) === "world");
  if (world) return world.id;
  return maps[0]?.id ?? null;
}

export function flattenTreeIds(nodes: MapTreeNode[]): string[] {
  const ids: string[] = [];
  function walk(list: MapTreeNode[]) {
    for (const node of list) {
      ids.push(node.map.id);
      if (node.children.length) walk(node.children);
    }
  }
  walk(nodes);
  return ids;
}
