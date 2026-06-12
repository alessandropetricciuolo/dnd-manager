"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  Building2,
  Castle,
  ChevronRight,
  Globe,
  Home,
  Map as MapIcon,
  Mountain,
  Skull,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MapCard } from "@/components/maps/map-card";
import {
  buildMapTree,
  collectAncestorIds,
  findDefaultMapId,
  flattenTreeIds,
  normalizeMapType,
  type GalleryMap,
  type MapTreeNode,
} from "@/lib/maps/map-tree";

const TYPE_META: Record<
  string,
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  world: { label: "Mondo", icon: Globe },
  continent: { label: "Continente", icon: Mountain },
  city: { label: "Città", icon: Castle },
  dungeon: { label: "Dungeon", icon: Skull },
  district: { label: "Quartiere", icon: Home },
  building: { label: "Edificio", icon: Building2 },
};

type MapGalleryTreeProps = {
  maps: GalleryMap[];
  hasParentMapId: boolean;
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  isGmOrAdmin: boolean;
  eligiblePlayers: { id: string; label: string }[];
  eligibleParties: { id: string; label: string; memberIds: string[] }[];
  permittedUserIdsByMapId: Record<string, string[]>;
  selectiveAudienceLabelByMapId: Record<string, string>;
};

function typeMeta(mapType: string) {
  const key = normalizeMapType(mapType);
  return TYPE_META[key] ?? { label: "Mappa", icon: MapIcon };
}

function MapTreeRow({
  node,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggle,
}: {
  node: MapTreeNode;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const { map, children, isOrphan } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(map.id);
  const isSelected = selectedId === map.id;
  const meta = typeMeta(map.map_type);
  const Icon = meta.icon;

  return (
    <div>
      <div
        className="flex items-stretch"
        style={{ paddingLeft: depth * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(map.id)}
            className="mr-0.5 flex w-7 shrink-0 items-center justify-center rounded-md text-barber-paper/60 hover:bg-barber-gold/10 hover:text-barber-gold"
            aria-label={isExpanded ? "Comprimi" : "Espandi"}
          >
            <ChevronRight
              className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")}
            />
          </button>
        ) : (
          <span className="mr-0.5 w-7 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onSelect(map.id)}
          className={cn(
            "mb-0.5 flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors",
            isSelected
              ? "border-barber-gold/50 bg-barber-gold/15 text-barber-gold"
              : "border-transparent text-barber-paper/90 hover:border-barber-gold/25 hover:bg-barber-dark/80",
            isOrphan && !isSelected && "border-amber-500/30 bg-amber-950/20"
          )}
        >
          <Icon className="h-4 w-4 shrink-0 text-barber-gold/90" />
          <span className="min-w-0 flex-1 truncate font-medium">{map.name}</span>
          <span className="hidden shrink-0 text-[10px] uppercase tracking-wide text-barber-paper/45 sm:inline">
            {meta.label}
          </span>
        </button>
      </div>
      {hasChildren && isExpanded ? (
        <div className="relative ml-3.5 border-l border-barber-gold/15 pl-1">
          {children.map((child) => (
            <MapTreeRow
              key={child.map.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MapGalleryTree({
  maps,
  hasParentMapId,
  campaignId,
  campaignType = null,
  isGmOrAdmin,
  eligiblePlayers,
  eligibleParties,
  permittedUserIdsByMapId,
  selectiveAudienceLabelByMapId,
}: MapGalleryTreeProps) {
  const { roots, orphans } = useMemo(
    () => buildMapTree(maps, hasParentMapId),
    [maps, hasParentMapId]
  );

  const [selectedId, setSelectedId] = useState<string | null>(() =>
    findDefaultMapId(maps)
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const didInitExpand = useRef(false);

  useEffect(() => {
    const defaultId = findDefaultMapId(maps);
    if (!defaultId) return;
    setSelectedId((current) => {
      if (current && maps.some((m) => m.id === current)) return current;
      return defaultId;
    });
  }, [maps]);

  useEffect(() => {
    if (didInitExpand.current) return;
    didInitExpand.current = true;
    const next = new Set<string>();
    function expandAll(nodes: MapTreeNode[]) {
      for (const node of nodes) {
        if (node.children.length) {
          next.add(node.map.id);
          expandAll(node.children);
        }
      }
    }
    expandAll(roots);
    expandAll(orphans);
    setExpandedIds(next);
  }, [roots, orphans]);

  useEffect(() => {
    const targetId = selectedId ?? findDefaultMapId(maps);
    if (!targetId) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      for (const id of collectAncestorIds(roots, targetId)) next.add(id);
      for (const id of collectAncestorIds(orphans, targetId)) next.add(id);
      return next;
    });
  }, [selectedId, roots, orphans, maps]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedMap = maps.find((m) => m.id === selectedId) ?? null;
  const treeCount = flattenTreeIds(roots).length;

  const cardProps = selectedMap
    ? {
        campaignId,
        campaignType,
        map: {
          id: selectedMap.id,
          name: selectedMap.name,
          image_url: selectedMap.image_url,
          description: selectedMap.description,
          map_type: selectedMap.map_type,
          visibility: selectedMap.visibility,
          parent_map_id: selectedMap.parent_map_id,
        },
        isGmOrAdmin,
        eligiblePlayers,
        eligibleParties,
        permittedUserIds: permittedUserIdsByMapId[selectedMap.id] ?? [],
        selectiveAudienceLabel: selectiveAudienceLabelByMapId[selectedMap.id] ?? null,
      }
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <aside className="flex max-h-[min(70vh,32rem)] min-h-0 flex-col overflow-hidden rounded-xl border border-barber-gold/25 bg-barber-dark/50 sm:max-h-[min(75vh,36rem)] lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)]">
        <div className="shrink-0 border-b border-barber-gold/20 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-barber-gold/90">
            Atlante
          </p>
          <p className="text-[11px] text-barber-paper/55">
            {treeCount} {treeCount === 1 ? "mappa" : "mappe"} · seleziona un ramo
          </p>
        </div>
        <div className="scrollbar-barber-y min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <div className="space-y-1 p-2 pb-4">
            {roots.map((node) => (
              <MapTreeRow
                key={node.map.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={setSelectedId}
                onToggle={toggleExpanded}
              />
            ))}

            {orphans.length > 0 ? (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/15 p-2">
                <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Non collegate
                </div>
                {orphans.map((node) => (
                  <MapTreeRow
                    key={node.map.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    onSelect={setSelectedId}
                    onToggle={toggleExpanded}
                  />
                ))}
                {isGmOrAdmin ? (
                  <p className="mt-2 px-1 text-[10px] leading-relaxed text-barber-paper/55">
                    Imposta il genitore corretto in modifica mappa per inserirle nell&apos;albero.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        {cardProps ? (
          <MapCard {...cardProps} />
        ) : (
          <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-barber-gold/30 bg-barber-dark/40 px-6 py-10 text-center text-sm text-barber-paper/60">
            Seleziona una mappa dall&apos;atlante.
          </div>
        )}
      </section>
    </div>
  );
}
