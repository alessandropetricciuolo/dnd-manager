"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Castle,
  ChevronRight,
  ChevronsUpDown,
  Compass,
  ExternalLink,
  Globe,
  Home,
  Layers,
  LayoutGrid,
  ListTree,
  Lock,
  Map as MapIcon,
  Mountain,
  Search,
  Skull,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DualSourceImage } from "@/components/dual-source-image";
import { MapCard } from "@/components/maps/map-card";
import {
  buildMapTree,
  collectAncestorIds,
  filterMapTree,
  findDefaultMapId,
  findNodeById,
  flattenTreeIds,
  getBreadcrumbTrail,
  normalizeMapType,
  type GalleryMap,
  type MapTreeNode,
} from "@/lib/maps/map-tree";

type MapCategory = "all" | "lands" | "settlements" | "dungeons" | "buildings";

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
    category: "lands" | "settlements" | "dungeons" | "buildings";
    badgeClass: string;
    pillColor: string;
  }
> = {
  world: {
    label: "Mondo",
    icon: Globe,
    category: "lands",
    badgeClass: "bg-amber-950/80 text-amber-300 border-amber-600/40",
    pillColor: "text-amber-400",
  },
  continent: {
    label: "Continente",
    icon: Mountain,
    category: "lands",
    badgeClass: "bg-emerald-950/80 text-emerald-300 border-emerald-600/40",
    pillColor: "text-emerald-400",
  },
  city: {
    label: "Città",
    icon: Castle,
    category: "settlements",
    badgeClass: "bg-blue-950/80 text-blue-300 border-blue-600/40",
    pillColor: "text-blue-400",
  },
  district: {
    label: "Quartiere",
    icon: Home,
    category: "settlements",
    badgeClass: "bg-orange-950/80 text-orange-300 border-orange-600/40",
    pillColor: "text-orange-400",
  },
  dungeon: {
    label: "Dungeon",
    icon: Skull,
    category: "dungeons",
    badgeClass: "bg-red-950/80 text-red-300 border-red-600/40",
    pillColor: "text-red-400",
  },
  building: {
    label: "Edificio",
    icon: Building2,
    category: "buildings",
    badgeClass: "bg-purple-950/80 text-purple-300 border-purple-600/40",
    pillColor: "text-purple-400",
  },
};

const CATEGORY_CHIPS: { id: MapCategory; label: string; icon: string }[] = [
  { id: "all", label: "Tutte", icon: "✨" },
  { id: "lands", label: "Terre", icon: "🌍" },
  { id: "settlements", label: "Città", icon: "🏰" },
  { id: "dungeons", label: "Dungeon", icon: "💀" },
  { id: "buildings", label: "Edifici", icon: "🏠" },
];

type MapGalleryTreeProps = {
  maps: GalleryMap[];
  hasParentMapId: boolean;
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  isGmOrAdmin: boolean;
  isAdmin?: boolean;
  adminDraftsEnabled?: boolean;
  eligiblePlayers: { id: string; label: string }[];
  eligibleParties: { id: string; label: string; memberIds: string[] }[];
  permittedUserIdsByMapId: Record<string, string[]>;
  selectiveAudienceLabelByMapId: Record<string, string>;
};

function typeMeta(mapType: string) {
  const key = normalizeMapType(mapType);
  return (
    TYPE_CONFIG[key] ?? {
      label: "Mappa",
      icon: MapIcon,
      category: "lands",
      badgeClass: "bg-stone-900 border-stone-700 text-stone-300",
      pillColor: "text-stone-400",
    }
  );
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
    <div className="group/row relative">
      <div
        className="flex items-center"
        style={{ paddingLeft: Math.min(depth * 12, 48) }}
      >
        {/* Toggle chevron / guide */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(map.id);
            }}
            className="mr-1 flex h-7 w-6 shrink-0 items-center justify-center rounded text-brass-base/60 hover:bg-brass-base/15 hover:text-amber-300 transition-colors"
            aria-label={isExpanded ? "Comprimi ramo" : "Espandi ramo"}
          >
            <ChevronRight
              className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded && "rotate-90 text-amber-300")}
            />
          </button>
        ) : (
          <span className="mr-1 h-7 w-6 shrink-0 flex items-center justify-center" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-brass-base/30" />
          </span>
        )}

        {/* Map item button */}
        <button
          type="button"
          onClick={() => onSelect(map.id)}
          className={cn(
            "group/btn mb-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border p-1.5 pr-2.5 text-left transition-all duration-200",
            isSelected
              ? "border-amber-400/80 bg-gradient-to-r from-amber-500/25 via-amber-950/40 to-guild-stone/60 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50"
              : "border-brass-base/20 bg-guild-stone/30 text-parchment-200 hover:border-brass-base/45 hover:bg-guild-stone/70 hover:text-parchment-100",
            isOrphan && !isSelected && "border-amber-500/30 bg-amber-950/20"
          )}
        >
          {/* Mini Thumbnail */}
          <div className="relative h-8 w-11 shrink-0 overflow-hidden rounded-md border border-brass-base/40 bg-guild-void shadow-inner">
            <DualSourceImage
              driveUrl={map.image_url}
              alt={map.name}
              className="h-full w-full object-cover transition-transform group-hover/btn:scale-110"
            />
          </div>

          {/* Map Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate font-serif text-xs sm:text-sm font-semibold text-parchment-100 group-hover/btn:text-amber-200">
                {map.name}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
              <span className={cn("inline-flex items-center gap-1 font-serif font-medium", meta.pillColor)}>
                <Icon className="h-3 w-3" />
                <span className="capitalize">{meta.label}</span>
              </span>

              {/* GM visibility tag */}
              {map.visibility === "secret" && (
                <span className="flex items-center gap-0.5 text-red-400 font-sans" title="Mappa Segreta">
                  <Lock className="h-2.5 w-2.5" />
                  <span className="hidden sm:inline text-[9px]">Segreta</span>
                </span>
              )}
              {map.visibility === "selective" && (
                <span className="flex items-center gap-0.5 text-cyan-400 font-sans" title="Visibilità selettiva">
                  <Users className="h-2.5 w-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* Child count indicator badge */}
          {hasChildren && (
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.2 text-[10px] font-bold font-mono transition-colors",
                isSelected
                  ? "border-amber-400/60 bg-amber-950/80 text-amber-300"
                  : "border-brass-base/30 bg-guild-stone text-parchment-300 group-hover/btn:border-brass-base/60 group-hover/btn:text-amber-200"
              )}
              title={`${children.length} sotto-luoghi contenuti`}
            >
              +{children.length}
            </span>
          )}
        </button>
      </div>

      {/* Children branches with guide line */}
      {hasChildren && isExpanded ? (
        <div className="relative ml-4 border-l border-brass-base/20 pl-1">
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
  isAdmin = false,
  adminDraftsEnabled = false,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<MapCategory>("all");
  const [viewMode, setViewMode] = useState<"tree" | "mosaic">("tree");
  const didInitExpand = useRef(false);

  useEffect(() => {
    const defaultId = findDefaultMapId(maps);
    if (!defaultId) return;
    setSelectedId((current) => {
      if (current && maps.some((m) => m.id === current)) return current;
      return defaultId;
    });
  }, [maps]);

  // Initial expand: all parent nodes
  useEffect(() => {
    if (didInitExpand.current) return;
    didInitExpand.current = true;
    const next = new Set<string>();
    const expandAll = (nodes: MapTreeNode[]) => {
      for (const node of nodes) {
        if (node.children.length) {
          next.add(node.map.id);
          expandAll(node.children);
        }
      }
    };
    expandAll(roots);
    expandAll(orphans);
    setExpandedIds(next);
  }, [roots, orphans]);

  // Keep ancestors of selected map expanded
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

  // Filter predicate
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filterPredicate = useMemo(() => {
    return (m: GalleryMap) => {
      // Category filter
      if (selectedCategory !== "all") {
        const normType = normalizeMapType(m.map_type);
        const meta = TYPE_CONFIG[normType];
        if (meta && meta.category !== selectedCategory) return false;
      }
      // Search filter
      if (normalizedQuery) {
        const nameMatch = m.name.toLowerCase().includes(normalizedQuery);
        const descMatch = m.description ? m.description.toLowerCase().includes(normalizedQuery) : false;
        const normType = normalizeMapType(m.map_type);
        const typeLabel = TYPE_CONFIG[normType]?.label.toLowerCase() ?? "";
        const typeMatch = typeLabel.includes(normalizedQuery);
        return nameMatch || descMatch || typeMatch;
      }
      return true;
    };
  }, [selectedCategory, normalizedQuery]);

  const isFiltering = normalizedQuery.length > 0 || selectedCategory !== "all";

  // Filtered tree
  const { filteredRoots, filteredOrphans, searchAncestorIds } = useMemo(() => {
    if (!isFiltering) {
      return {
        filteredRoots: roots,
        filteredOrphans: orphans,
        searchAncestorIds: new Set<string>(),
      };
    }
    const rRes = filterMapTree(roots, filterPredicate);
    const oRes = filterMapTree(orphans, filterPredicate);
    const combinedAncestors = new Set([...rRes.ancestorIds, ...oRes.ancestorIds]);
    return {
      filteredRoots: rRes.filtered,
      filteredOrphans: oRes.filtered,
      searchAncestorIds: combinedAncestors,
    };
  }, [roots, orphans, isFiltering, filterPredicate]);

  // Auto-expand ancestors of matching search results
  useEffect(() => {
    if (searchAncestorIds.size > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        for (const id of searchAncestorIds) next.add(id);
        return next;
      });
    }
  }, [searchAncestorIds]);

  // Filtered flat list for Mosaic mode
  const filteredFlatMaps = useMemo(() => {
    return maps.filter(filterPredicate);
  }, [maps, filterPredicate]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleAll() {
    if (expandedIds.size > 0) {
      setExpandedIds(new Set());
    } else {
      const allParentIds = new Set<string>();
      const walk = (nodes: MapTreeNode[]) => {
        for (const n of nodes) {
          if (n.children.length) {
            allParentIds.add(n.map.id);
            walk(n.children);
          }
        }
      };
      walk(roots);
      walk(orphans);
      setExpandedIds(allParentIds);
    }
  }

  const selectedMap = maps.find((m) => m.id === selectedId) ?? null;
  const treeCount = flattenTreeIds(roots).length;

  // Find node to inspect sub-locations
  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return findNodeById(roots, selectedId) ?? findNodeById(orphans, selectedId);
  }, [roots, orphans, selectedId]);

  // Breadcrumbs trail
  const breadcrumbs = useMemo(() => {
    if (!selectedId) return [];
    return getBreadcrumbTrail(roots, selectedId);
  }, [roots, selectedId]);

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
        isAdmin,
        adminDraftsEnabled,
        eligiblePlayers,
        eligibleParties,
        permittedUserIds: permittedUserIdsByMapId[selectedMap.id] ?? [],
        selectiveAudienceLabel: selectiveAudienceLabelByMapId[selectedMap.id] ?? null,
      }
    : null;

  return (
    <div className="flex flex-col-reverse gap-5 lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
      {/* SIDEBAR: Atlante Cartografico */}
      <aside
        className={cn(
          "card-guild-stone flex min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-brass-base/40 bg-guild-void/90 backdrop-blur-md shadow-2xl transition-all",
          isGmOrAdmin
            ? "max-h-[min(78vh,40rem)] sm:max-h-[min(82vh,46rem)] lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)]"
            : "max-h-[min(55vh,24rem)] lg:max-h-[calc(100dvh-6.5rem)] lg:sticky lg:top-20"
        )}
      >
        {/* Header with Title, Count & View Switcher */}
        <div className="shrink-0 border-b border-brass-base/25 bg-guild-stone/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="font-serif text-sm font-bold tracking-wider text-amber-200 uppercase">
                  {isGmOrAdmin ? "Atlante Cartografico" : "Luoghi Conosciuti"}
                </h3>
                <p className="text-[11px] text-parchment-400">
                  {treeCount} {treeCount === 1 ? "mappa registrata" : "mappe registrate"}
                </p>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-brass-base/30 bg-guild-dark/90 p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("tree")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-serif transition-colors",
                  viewMode === "tree"
                    ? "bg-brass-base/25 font-bold text-amber-300 shadow-sm border border-brass-base/40"
                    : "text-parchment-400 hover:text-parchment-200"
                )}
                title="Vista gerarchica ad albero"
              >
                <ListTree className="h-3.5 w-3.5 text-brass-base" />
                <span className="hidden sm:inline">Albero</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("mosaic")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-serif transition-colors",
                  viewMode === "mosaic"
                    ? "bg-brass-base/25 font-bold text-amber-300 shadow-sm border border-brass-base/40"
                    : "text-parchment-400 hover:text-parchment-200"
                )}
                title="Vista a mosaico di carte"
              >
                <LayoutGrid className="h-3.5 w-3.5 text-brass-base" />
                <span className="hidden sm:inline">Mosaico</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brass-base/60" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per nome, tipo o testo..."
              className="h-8 pl-8 pr-7 text-xs border-brass-base/30 bg-guild-dark/80 text-parchment-100 placeholder:text-parchment-400/60 focus-visible:ring-amber-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-parchment-400 hover:text-amber-300"
                aria-label="Cancella ricerca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="scrollbar-none -mx-1 mt-2.5 flex items-center gap-1 overflow-x-auto px-1 pb-0.5">
            {CATEGORY_CHIPS.map((chip) => {
              const active = selectedCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedCategory(chip.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-serif transition-colors border",
                    active
                      ? "border-amber-400/70 bg-amber-950/70 font-bold text-amber-200 shadow-sm"
                      : "border-brass-base/20 bg-guild-stone/40 text-parchment-300 hover:border-brass-base/40 hover:bg-guild-stone hover:text-parchment-100"
                  )}
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          {/* Albero Controls: Expand/Collapse All + Filter notification */}
          {viewMode === "tree" && (
            <div className="mt-2.5 flex items-center justify-between border-t border-brass-base/15 pt-2 text-[11px] text-parchment-400">
              <button
                type="button"
                onClick={handleToggleAll}
                className="flex items-center gap-1 text-brass-base hover:text-amber-300 transition-colors"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
                <span>{expandedIds.size > 0 ? "Comprimi tutto" : "Espandi tutto"}</span>
              </button>

              {isFiltering && (
                <span className="font-mono text-amber-300">
                  {filteredRoots.length + filteredOrphans.length} rami trovati
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content Area: Tree or Mosaic */}
        <div className="scrollbar-barber-y min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {viewMode === "tree" ? (
            /* VISTA ALBERO */
            <div className="space-y-1 p-2 pb-6">
              {filteredRoots.length > 0 ? (
                filteredRoots.map((node) => (
                  <MapTreeRow
                    key={node.map.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    onSelect={setSelectedId}
                    onToggle={toggleExpanded}
                  />
                ))
              ) : !filteredOrphans.length ? (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Compass className="h-8 w-8 text-brass-base/40" />
                  <p className="mt-2 text-xs font-serif text-parchment-300">
                    Nessun luogo corrisponde ai filtri impostati.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-3 h-7 text-xs border-brass-base/30 text-amber-300 hover:bg-brass-base/10"
                  >
                    Reimposta filtri
                  </Button>
                </div>
              ) : null}

              {/* Mappe orfane / non collegate */}
              {filteredOrphans.length > 0 ? (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5">
                  <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    Mappe Non Collegate
                  </div>
                  {filteredOrphans.map((node) => (
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
                    <p className="mt-2 px-1 text-[10px] leading-relaxed text-amber-300/70">
                      Imposta il genitore corretto in modifica mappa per inserirle nell&apos;albero.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            /* VISTA MOSAICO */
            <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 pb-6">
              {filteredFlatMaps.length > 0 ? (
                filteredFlatMaps.map((map) => {
                  const isSelected = selectedId === map.id;
                  const meta = typeMeta(map.map_type);
                  const Icon = meta.icon;
                  const node = findNodeById(roots, map.id) ?? findNodeById(orphans, map.id);
                  const childCount = node?.children.length ?? 0;

                  return (
                    <button
                      key={map.id}
                      type="button"
                      onClick={() => setSelectedId(map.id)}
                      className={cn(
                        "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200",
                        isSelected
                          ? "border-amber-400 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400"
                          : "border-brass-base/25 bg-guild-stone/30 hover:border-brass-base/50 hover:bg-guild-stone/70"
                      )}
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-guild-void">
                        <DualSourceImage
                          driveUrl={map.image_url}
                          alt={map.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-guild-void/90 via-guild-void/30 to-transparent" />
                        
                        {/* Top badges */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          {map.visibility === "secret" && (
                            <span className="rounded bg-red-950/90 border border-red-500/40 p-1 text-red-300" title="Segreta">
                              <Lock className="h-3 w-3" />
                            </span>
                          )}
                          {childCount > 0 && (
                            <span className="rounded-md bg-amber-950/90 border border-amber-500/50 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 shadow">
                              +{childCount}
                            </span>
                          )}
                        </div>

                        {/* Bottom type label */}
                        <div className="absolute bottom-1.5 left-1.5">
                          <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-serif border shadow", meta.badgeClass)}>
                            <Icon className="h-2.5 w-2.5" />
                            <span>{meta.label}</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-2">
                        <p className="font-serif text-xs font-bold text-parchment-100 group-hover:text-amber-200 truncate">
                          {map.name}
                        </p>
                        {map.description && (
                          <p className="line-clamp-1 text-[10px] text-parchment-400 mt-0.5">
                            {map.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center p-6 text-center">
                  <Compass className="h-8 w-8 text-brass-base/40" />
                  <p className="mt-2 text-xs font-serif text-parchment-300">
                    Nessun luogo corrisponde ai filtri impostati.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-3 h-7 text-xs border-brass-base/30 text-amber-300 hover:bg-brass-base/10"
                  >
                    Reimposta filtri
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA: Breadcrumbs ribbon + Sub-locations tray + MapCard */}
      <section className="min-w-0 lg:order-none">
        {selectedMap && (
          <>
            {/* Interactive Breadcrumb Ribbon */}
            <div className="card-guild-stone mb-3 flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-brass-base/35 bg-guild-stone/40 px-3.5 py-2 shadow-md">
              <nav className="flex flex-wrap items-center gap-1.5 text-xs text-parchment-300">
                <div className="flex items-center gap-1 font-serif font-bold text-amber-400 mr-1">
                  <Compass className="h-3.5 w-3.5 text-amber-400" />
                  <span>Atlante</span>
                </div>
                {breadcrumbs.length > 0 ? (
                  breadcrumbs.map((crumb, idx) => {
                    const isLast = idx === breadcrumbs.length - 1;
                    const meta = typeMeta(crumb.map_type);
                    const CrumbIcon = meta.icon;
                    return (
                      <div key={crumb.id} className="flex items-center gap-1.5">
                        <span className="text-brass-base/40">›</span>
                        {isLast ? (
                          <span className="flex items-center gap-1.5 font-serif font-bold text-amber-200">
                            <CrumbIcon className="h-3.5 w-3.5 text-amber-400" />
                            <span>{crumb.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded border border-brass-base/30 bg-brass-base/10 text-brass-light ml-0.5">
                              {meta.label}
                            </span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedId(crumb.id)}
                            className="flex items-center gap-1 hover:text-amber-300 hover:underline transition-colors font-medium text-parchment-300"
                          >
                            <CrumbIcon className="h-3 w-3 text-parchment-400" />
                            <span className="truncate max-w-[120px] sm:max-w-none">{crumb.name}</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-brass-base/40">›</span>
                    <span className="font-serif font-bold text-amber-200">{selectedMap.name}</span>
                  </div>
                )}
              </nav>

              <Link href={`/campaigns/${campaignId}/maps/${selectedMap.id}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5 border-brass-base/40 bg-guild-void/80 text-amber-300 hover:bg-brass-base/20 font-serif"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-brass-base" />
                  <span>Esplora Mappa</span>
                </Button>
              </Link>
            </div>

            {/* Sub-locations Quick Jump Tray (if active node has children) */}
            {selectedNode && selectedNode.children.length > 0 && (
              <div className="card-guild-stone mb-4 rounded-xl border border-brass-base/30 bg-guild-void/70 p-3 shadow-md">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-serif font-semibold uppercase tracking-wider text-amber-300">
                    <Layers className="h-3.5 w-3.5 text-brass-base" />
                    <span>Sotto-luoghi in {selectedNode.map.name} ({selectedNode.children.length})</span>
                  </div>
                  <span className="text-[10px] text-parchment-400 italic hidden sm:inline">
                    Clicca per esplorare la sotto-mappa
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {selectedNode.children.map((child) => {
                    const childMeta = typeMeta(child.map.map_type);
                    const ChildIcon = childMeta.icon;
                    return (
                      <button
                        key={child.map.id}
                        type="button"
                        onClick={() => setSelectedId(child.map.id)}
                        className="group flex items-center gap-2 p-1.5 rounded-lg border border-brass-base/25 bg-guild-stone/50 hover:border-brass-base/60 hover:bg-guild-stone text-left transition-all"
                      >
                        <div className="relative h-8 w-11 shrink-0 overflow-hidden rounded border border-brass-base/30 bg-guild-dark">
                          <DualSourceImage
                            driveUrl={child.map.image_url}
                            alt={child.map.name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-serif font-semibold text-parchment-200 group-hover:text-amber-200 truncate">
                            {child.map.name}
                          </p>
                          <div className="flex items-center gap-1 text-[9px] text-parchment-400">
                            <ChildIcon className="h-2.5 w-2.5 text-brass-base" />
                            <span className="truncate">{childMeta.label}</span>
                            {child.children.length > 0 && (
                              <span className="text-amber-400 font-bold ml-auto shrink-0">
                                +{child.children.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Map Card */}
        {cardProps ? (
          <MapCard {...cardProps} />
        ) : (
          <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-brass-base/30 bg-guild-void/40 px-6 py-10 text-center text-sm text-parchment-400">
            Seleziona una mappa dall&apos;atlante per visualizzarla.
          </div>
        )}
      </section>
    </div>
  );
}
