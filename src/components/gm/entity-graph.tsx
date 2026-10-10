"use client";

import { useCallback, useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type EdgeProps,
  Handle,
  Position,
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  MapPin,
  Skull,
  BookOpen,
  Sword,
  ScrollText,
  User,
  Loader2,
  X,
  GripVertical,
  Map,
  Pencil,
  Trash2,
  Link2,
  Search,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Network,
  GitBranch,
  Layers,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getEntityGraphData,
  createWikiRelationship,
  deleteWikiRelationship,
  updateWikiRelationship,
  type WikiEntityForGraph,
  type WikiRelationshipRow,
  type MapForGraph,
} from "@/app/campaigns/entity-graph-actions";
import { layoutGraph, type LayoutType } from "@/lib/graph-layout";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  npc: User,
  location: MapPin,
  monster: Skull,
  item: Sword,
  lore: ScrollText,
};

const TYPE_NAMES: Record<string, string> = {
  npc: "PNG",
  location: "Luogo",
  monster: "Mostro",
  item: "Oggetto",
  lore: "Lore",
  map: "Mappa",
};

/** Stili disco con colori ad alta saturazione e bordi rifiniti */
const TYPE_DISK_STYLE: Record<string, string> = {
  npc: "bg-gradient-to-br from-violet-500 via-violet-600 to-purple-900 shadow-[0_0_24px_-2px_rgba(139,92,246,0.65)] ring-1.5 ring-violet-300/50",
  location:
    "bg-gradient-to-br from-emerald-400 via-emerald-600 to-emerald-950 shadow-[0_0_24px_-2px_rgba(16,185,129,0.6)] ring-1.5 ring-emerald-300/45",
  monster:
    "bg-gradient-to-br from-rose-500 via-rose-700 to-rose-950 shadow-[0_0_24px_-2px_rgba(244,63,94,0.6)] ring-1.5 ring-rose-300/50",
  item: "bg-gradient-to-br from-amber-400 via-amber-600 to-amber-950 shadow-[0_0_24px_-2px_rgba(245,158,11,0.6)] ring-1.5 ring-amber-200/50",
  lore: "bg-gradient-to-br from-sky-400 via-sky-600 to-sky-950 shadow-[0_0_24px_-2px_rgba(14,165,233,0.6)] ring-1.5 ring-sky-300/50",
};

function entityDiskClasses(type: string): string {
  return (
    TYPE_DISK_STYLE[type] ??
    "bg-gradient-to-br from-zinc-500 via-zinc-600 to-zinc-900 shadow-[0_0_16px_-2px_rgba(161,161,170,0.5)] ring-1.5 ring-zinc-300/40"
  );
}

interface GraphFocusContextValue {
  selectedNodeId: string | null;
  neighborNodeIds: Set<string>;
  focusedEdgeIds: Set<string>;
  showAllLabels: boolean;
  linkSourceNodeId: string | null;
}

const GraphFocusContext = createContext<GraphFocusContextValue>({
  selectedNodeId: null,
  neighborNodeIds: new Set(),
  focusedEdgeIds: new Set(),
  showAllLabels: false,
  linkSourceNodeId: null,
});

export type EntityNodeData = {
  label: string;
  type: string;
  entityId: string;
  degree?: number;
};

export type MapNodeData = {
  label: string;
  mapId: string;
  degree?: number;
};

export type GraphNodeData = EntityNodeData | MapNodeData;

function EntityNode({ id, data, selected }: NodeProps<Node<EntityNodeData>>) {
  const { selectedNodeId, neighborNodeIds, linkSourceNodeId } = useContext(GraphFocusContext);
  const d = data as EntityNodeData;
  const Icon = TYPE_ICONS[d.type] ?? BookOpen;
  const degree = d.degree ?? 0;

  const isFocused = id === selectedNodeId || !!selected;
  const isNeighbor = neighborNodeIds.has(id);
  const isDimmed = selectedNodeId !== null && !isFocused && !isNeighbor;
  const isLinkSource = id === linkSourceNodeId;

  // Scala visiva basata sul grado: gli hub risaltano naturalmente
  const isMajorHub = degree >= 6;
  const isMediumNode = degree >= 3 && degree < 6;
  const diskSizeClass = isMajorHub
    ? "h-[60px] w-[60px]"
    : isMediumNode
      ? "h-[50px] w-[50px]"
      : "h-[42px] w-[42px]";
  const iconSizeClass = isMajorHub
    ? "h-[26px] w-[26px]"
    : isMediumNode
      ? "h-[22px] w-[22px]"
      : "h-[18px] w-[18px]";

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-1.5 select-none transition-all duration-200",
        isDimmed && "opacity-20 grayscale hover:opacity-75 hover:grayscale-0",
        isFocused && "scale-110 z-30",
        isNeighbor && "scale-105 z-20"
      )}
    >
      {/* 4 Handles cardinali per collegamenti puliti senza curve a U */}
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-amber-400 !opacity-0 transition-opacity group-hover:!opacity-100"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-amber-400 !opacity-0 transition-opacity group-hover:!opacity-100"
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-amber-400 !opacity-0 transition-opacity group-hover:!opacity-100"
      />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-amber-400 !opacity-0 transition-opacity group-hover:!opacity-100"
      />

      <div className="relative flex items-center justify-center">
        {/* Glow ambient per hub e nodi attivi */}
        {(isMajorHub || isFocused) && (
          <div
            className={cn(
              "absolute -inset-1.5 rounded-full blur-md transition-all duration-300",
              isFocused
                ? "bg-amber-400/80 scale-110 opacity-90 animate-pulse"
                : "bg-white/30 opacity-60"
            )}
          />
        )}

        <div
          className={cn(
            "relative flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-150 shadow-md",
            diskSizeClass,
            entityDiskClasses(d.type),
            isFocused &&
              "ring-2 ring-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.7)] scale-[1.08]",
            isNeighbor && "ring-1.5 ring-zinc-200/90 shadow-[0_0_18px_rgba(255,255,255,0.4)]",
            isLinkSource && "ring-4 ring-amber-400 animate-bounce"
          )}
        >
          <Icon className={cn(iconSizeClass, "relative z-[1] text-white/95 drop-shadow-sm")} aria-hidden />

          {/* Badge conteggio connessioni per hub */}
          {degree >= 3 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[17px] items-center justify-center rounded-full border border-amber-400/50 bg-[#0e0e11] px-1 font-mono text-[9px] font-bold text-amber-300 shadow">
              {degree}
            </span>
          )}
        </div>
      </div>

      {/* Chip etichetta ad alto contrasto con backdrop scuro */}
      <div
        className={cn(
          "max-w-[8.5rem] rounded-md border border-zinc-700/75 bg-[#121215]/92 px-2 py-0.5 text-center shadow-lg backdrop-blur-md transition-all",
          isFocused &&
            "border-amber-400 bg-amber-950/80 text-amber-200 ring-2 ring-amber-400/35 scale-105 shadow-[0_0_12px_rgba(251,191,36,0.3)]",
          isNeighbor && "border-zinc-400/80 bg-zinc-900/95 text-zinc-100"
        )}
      >
        <span className="line-clamp-2 font-sans text-[11px] font-semibold tracking-wide text-zinc-100">
          {d.label}
        </span>
      </div>
    </div>
  );
}

function MapNode({ id, data, selected }: NodeProps<Node<MapNodeData>>) {
  const { selectedNodeId, neighborNodeIds, linkSourceNodeId } = useContext(GraphFocusContext);
  const d = data as MapNodeData;
  const degree = d.degree ?? 0;
  const isMajorHub = degree >= 4;

  const isFocused = id === selectedNodeId || !!selected;
  const isNeighbor = neighborNodeIds.has(id);
  const isDimmed = selectedNodeId !== null && !isFocused && !isNeighbor;
  const isLinkSource = id === linkSourceNodeId;

  return (
    <div
      className={cn(
        "group relative flex flex-col items-center gap-1.5 select-none transition-all duration-200",
        isDimmed && "opacity-20 grayscale hover:opacity-75 hover:grayscale-0",
        isFocused && "scale-110 z-30",
        isNeighbor && "scale-105 z-20"
      )}
    >
      <Handle
        type="target"
        id="top"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-orange-400 !opacity-0 transition-opacity group-hover:!opacity-100"
      />
      <Handle
        type="source"
        id="bottom"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-orange-400 !opacity-0 transition-opacity group-hover:!opacity-100"
      />
      <Handle
        type="target"
        id="left"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-orange-400 !opacity-0 transition-opacity group-hover:!opacity-100"
      />
      <Handle
        type="source"
        id="right"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-orange-400 !opacity-0 transition-opacity group-hover:!opacity-100"
      />

      <div className="relative flex items-center justify-center">
        {(isMajorHub || isFocused) && (
          <div
            className={cn(
              "absolute -inset-1.5 rounded-xl blur-md transition-all duration-300",
              isFocused ? "bg-orange-400/80 scale-110 opacity-90 animate-pulse" : "bg-orange-500/25 opacity-60"
            )}
          />
        )}

        <div
          className={cn(
            "relative flex h-[50px] w-[50px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-orange-400/50 bg-gradient-to-br from-orange-500 via-amber-700 to-zinc-900 shadow-[0_0_20px_-2px_rgba(251,146,60,0.55)] transition-transform duration-150",
            isFocused &&
              "ring-2 ring-orange-300 shadow-[0_0_24px_rgba(251,146,60,0.8)] scale-[1.08]",
            isNeighbor && "ring-1.5 ring-zinc-200/90 shadow-[0_0_18px_rgba(255,255,255,0.4)]",
            isLinkSource && "ring-4 ring-orange-400 animate-bounce"
          )}
        >
          <Map className="h-[22px] w-[22px] text-white/95 drop-shadow-sm" aria-hidden />

          {degree >= 2 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[17px] items-center justify-center rounded-full border border-orange-400/50 bg-[#0e0e11] px-1 font-mono text-[9px] font-bold text-orange-300 shadow">
              {degree}
            </span>
          )}
        </div>
      </div>

      <div
        className={cn(
          "max-w-[8.5rem] rounded-md border border-orange-500/50 bg-[#15120e]/92 px-2 py-0.5 text-center shadow-lg backdrop-blur-md transition-all",
          isFocused &&
            "border-orange-400 bg-orange-950/85 text-orange-200 ring-2 ring-orange-400/40 scale-105 shadow-[0_0_12px_rgba(251,146,60,0.3)]",
          isNeighbor && "border-orange-400/70 text-orange-100"
        )}
      >
        <span className="line-clamp-2 font-sans text-[11px] font-semibold tracking-wide text-orange-200">
          {d.label}
        </span>
      </div>
    </div>
  );
}

export type CustomEdgeData = {
  label?: string;
};

function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<Edge<CustomEdgeData>>) {
  const { selectedNodeId, focusedEdgeIds, showAllLabels } = useContext(GraphFocusContext);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [hovered, setHovered] = useState(false);
  const label = data?.label?.trim() ?? "";
  const hasValidLabel = label !== "" && label !== "—";
  const isFocused = focusedEdgeIds.has(id) || !!selected;
  const isDimmed = selectedNodeId !== null && !isFocused;
  const showLabel = (showAllLabels || isFocused || hovered || selected) && hasValidLabel;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer"
    >
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          "transition-all duration-200",
          !isFocused &&
            !isDimmed &&
            "!stroke-[#626673] [stroke-opacity:0.75] !stroke-[1.6px] hover:!stroke-[#a1a1aa] hover:![stroke-opacity:1] hover:!stroke-[2.2px]",
          isFocused &&
            "!stroke-amber-400 ![stroke-opacity:1] !stroke-[2.6px] drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]",
          isDimmed && "!stroke-[#303035] ![stroke-opacity:0.12] !stroke-[1px]"
        )}
        interactionWidth={20}
      />
      {showLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className={cn(
              "nodrag nopan max-w-[10rem] cursor-pointer truncate rounded-full border px-2 py-[2px] text-[10px] font-semibold tracking-wide backdrop-blur-md shadow-lg transition-all",
              isFocused
                ? "border-amber-400 bg-amber-950/92 text-amber-200 ring-2 ring-amber-400/35 scale-105"
                : "border-zinc-600/80 bg-[#16161a]/95 text-zinc-200 hover:border-zinc-400 hover:text-white"
            )}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}

const nodeTypes = { entity: EntityNode, map: MapNode };
const edgeTypes = { labeled: LabeledEdge };

type EntityGraphProps = {
  campaignId: string;
};

function EntityGraphInner({ campaignId }: EntityGraphProps) {
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<WikiEntityForGraph[]>([]);
  const [maps, setMaps] = useState<MapForGraph[]>([]);
  const [relationships, setRelationships] = useState<WikiRelationshipRow[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<GraphNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Filtri & Toolbar
  const [layoutMode, setLayoutMode] = useState<LayoutType>("organic");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [activeTypeFilters, setActiveTypeFilters] = useState<Record<string, boolean>>({
    npc: true,
    location: true,
    monster: true,
    item: true,
    lore: true,
    map: true,
  });
  const [showAllLabels, setShowAllLabels] = useState(false);

  // Focus & Inspector
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchUnlinked, setSearchUnlinked] = useState("");

  // Modali Connessione / Modifica
  const [connectModal, setConnectModal] = useState<{
    sourceId: string;
    targetId: string;
    targetMapId: string | null;
    sourceName: string;
    targetName: string;
  } | null>(null);
  const [relationshipLabel, setRelationshipLabel] = useState("");
  const [savingRelation, setSavingRelation] = useState(false);

  const [editModal, setEditModal] = useState<{
    relationshipId: string;
    label: string;
    sourceName: string;
    targetName: string;
  } | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Link Mode
  const [linkMode, setLinkMode] = useState(false);
  const [linkSourceNodeId, setLinkSourceNodeId] = useState<string | null>(null);

  const { screenToFlowPosition, fitView, setCenter } = useReactFlow();

  // Chiudi ricerca se si clicca fuori
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as globalThis.Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openConnectModalFromNodeIds = useCallback(
    (sourceNodeId: string, targetNodeId: string) => {
      if (sourceNodeId === targetNodeId) return;
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      const targetNode = nodes.find((n) => n.id === targetNodeId);
      if (!sourceNode || !targetNode) return;

      const isSourceMap = sourceNodeId.startsWith("map:");
      const isTargetMap = targetNodeId.startsWith("map:");
      if (isSourceMap && isTargetMap) {
        toast.error("Almeno una voce wiki deve essere origine del collegamento.");
        return;
      }

      const sourceName =
        (sourceNode.data as EntityNodeData).label ?? (sourceNode.data as MapNodeData).label ?? "";
      const targetName =
        (targetNode.data as EntityNodeData).label ?? (targetNode.data as MapNodeData).label ?? "";

      const wikiId = isSourceMap
        ? targetNodeId.replace(/^wiki:/, "")
        : sourceNodeId.replace(/^wiki:/, "");
      const mapId = isSourceMap
        ? sourceNodeId.replace(/^map:/, "")
        : isTargetMap
          ? targetNodeId.replace(/^map:/, "")
          : null;
      const otherWikiId = !isSourceMap && !isTargetMap ? targetNodeId.replace(/^wiki:/, "") : "";

      setConnectModal({
        sourceId: wikiId,
        targetId: mapId ? "" : otherWikiId,
        targetMapId: mapId,
        sourceName: isSourceMap ? targetName : sourceName,
        targetName: isSourceMap ? sourceName : targetName,
      });
      setRelationshipLabel("");
    },
    [nodes]
  );

  /** Calcola e applica il layout sui nodi ed archi filtrati */
  const applyLayout = useCallback(
    (
      targetLayout: LayoutType,
      currentEntities: WikiEntityForGraph[],
      currentMaps: MapForGraph[],
      currentRels: WikiRelationshipRow[],
      filters = activeTypeFilters
    ) => {
      const allowedWikiIds = new Set<string>();
      const allowedMapIds = new Set<string>();

      currentEntities.forEach((e) => {
        if (filters[e.type] !== false) allowedWikiIds.add(e.id);
      });
      if (filters.map !== false) {
        currentMaps.forEach((m) => allowedMapIds.add(m.id));
      }

      const linkedWikiIds = new Set<string>();
      const linkedMapIds = new Set<string>();
      currentRels.forEach((r) => {
        const hasSource = allowedWikiIds.has(r.source_id);
        const hasTarget = r.target_id
          ? allowedWikiIds.has(r.target_id)
          : r.target_map_id
            ? allowedMapIds.has(r.target_map_id)
            : false;

        if (hasSource && hasTarget) {
          linkedWikiIds.add(r.source_id);
          if (r.target_id) linkedWikiIds.add(r.target_id);
          if (r.target_map_id) linkedMapIds.add(r.target_map_id);
        }
      });

      const layoutNodesMeta: { id: string; label: string; type: string; isMap?: boolean }[] = [];
      currentEntities.forEach((e) => {
        if (linkedWikiIds.has(e.id)) {
          layoutNodesMeta.push({ id: `wiki:${e.id}`, label: e.name, type: e.type, isMap: false });
        }
      });
      currentMaps.forEach((m) => {
        if (linkedMapIds.has(m.id)) {
          layoutNodesMeta.push({ id: `map:${m.id}`, label: m.name, type: "map", isMap: true });
        }
      });

      const layoutEdgesMeta: { id: string; source: string; target: string; label?: string }[] = [];
      currentRels.forEach((r) => {
        const srcId = `wiki:${r.source_id}`;
        const tgtId = r.target_map_id ? `map:${r.target_map_id}` : `wiki:${r.target_id}`;
        if (
          layoutNodesMeta.some((n) => n.id === srcId) &&
          layoutNodesMeta.some((n) => n.id === tgtId)
        ) {
          layoutEdgesMeta.push({
            id: r.id,
            source: srcId,
            target: tgtId,
            label: r.label,
          });
        }
      });

      const { nodes: layoutedNodes, edges: layoutedEdges } = layoutGraph(
        layoutNodesMeta,
        layoutEdgesMeta,
        targetLayout
      );

      const finalNodes: Node<GraphNodeData>[] = layoutedNodes.map((ln) => {
        const meta = layoutNodesMeta.find((m) => m.id === ln.id);
        const isMap = meta?.isMap ?? false;

        return {
          id: ln.id,
          type: isMap ? "map" : "entity",
          position: { x: ln.x, y: ln.y },
          sourcePosition: ln.sourcePosition,
          targetPosition: ln.targetPosition,
          data: isMap
            ? {
                label: meta?.label ?? "",
                mapId: ln.id.replace(/^map:/, ""),
                degree: ln.degree,
              }
            : {
                label: meta?.label ?? "",
                type: meta?.type ?? "npc",
                entityId: ln.id.replace(/^wiki:/, ""),
                degree: ln.degree,
              },
        };
      });

      const finalEdges: Edge<CustomEdgeData>[] = layoutedEdges.map((le) => ({
        id: le.id,
        source: le.source,
        target: le.target,
        type: "labeled",
        sourcePosition: le.sourcePosition,
        targetPosition: le.targetPosition,
        data: {
          label: le.label,
        },
      }));

      setNodes(finalNodes);
      setEdges(finalEdges);

      setTimeout(() => {
        fitView({ padding: 0.18, duration: 600 });
      }, 50);
    },
    [activeTypeFilters, setNodes, setEdges, fitView]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getEntityGraphData(campaignId);
    setLoading(false);
    if (!result.success || !result.entities) {
      toast.error(result.error ?? "Errore caricamento grafo");
      return;
    }
    setEntities(result.entities);
    setMaps(result.maps ?? []);
    setRelationships(result.relationships ?? []);

    applyLayout(layoutMode, result.entities, result.maps ?? [], result.relationships ?? []);
  }, [campaignId, layoutMode, applyLayout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcolo vicini diretti ed archi attivi per il focus mode (puro useMemo senza cicli di setState!)
  const neighborNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNodeId) return set;
    for (const e of edges) {
      if (e.source === selectedNodeId) set.add(e.target);
      else if (e.target === selectedNodeId) set.add(e.source);
    }
    return set;
  }, [selectedNodeId, edges]);

  const focusedEdgeIds = useMemo(() => {
    const set = new Set<string>();
    if (!selectedNodeId) return set;
    for (const e of edges) {
      if (e.source === selectedNodeId || e.target === selectedNodeId) {
        set.add(e.id);
      }
    }
    return set;
  }, [selectedNodeId, edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      openConnectModalFromNodeIds(connection.source, connection.target);
    },
    [openConnectModalFromNodeIds]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<GraphNodeData>) => {
      if (linkMode) {
        if (!linkSourceNodeId) {
          setLinkSourceNodeId(node.id);
          toast.message(
            `Origine: ${(node.data as EntityNodeData).label ?? (node.data as MapNodeData).label}. Clicca il bersaglio.`
          );
          return;
        }
        if (linkSourceNodeId === node.id) {
          setLinkSourceNodeId(null);
          return;
        }
        openConnectModalFromNodeIds(linkSourceNodeId, node.id);
        setLinkSourceNodeId(null);
        setLinkMode(false);
        return;
      }

      // Modalità normale: seleziona il nodo e apri l'inspector
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [linkMode, linkSourceNodeId, openConnectModalFromNodeIds]
  );

  const onPaneClick = useCallback(() => {
    if (!linkMode) {
      setSelectedNodeId(null);
    }
  }, [linkMode]);

  const cancelLinkMode = useCallback(() => {
    setLinkMode(false);
    setLinkSourceNodeId(null);
  }, []);

  const handleSaveRelationship = useCallback(async () => {
    if (!connectModal) return;
    setSavingRelation(true);
    const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const toUuid = (s: string | null | undefined): string | null => {
      if (s == null || typeof s !== "string") return null;
      const m = s.trim().match(uuidRe);
      return m ? m[0] : null;
    };
    const sourceUuid = toUuid(connectModal.sourceId) ?? "";
    const targetWiki = toUuid(connectModal.targetId);
    const targetMap = toUuid(connectModal.targetMapId);
    const result = await createWikiRelationship(
      campaignId,
      sourceUuid,
      targetWiki,
      targetMap,
      relationshipLabel.trim() || "—"
    );
    setSavingRelation(false);
    if (result.success) {
      setConnectModal(null);
      await loadData();
      toast.success("Relazione aggiunta.");
    } else {
      toast.error(result.error);
    }
  }, [campaignId, connectModal, relationshipLabel, loadData]);

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge<CustomEdgeData>) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      const sourceName =
        (sourceNode?.data as EntityNodeData)?.label ??
        (sourceNode?.data as MapNodeData)?.label ??
        "";
      const targetName =
        (targetNode?.data as EntityNodeData)?.label ??
        (targetNode?.data as MapNodeData)?.label ??
        "";
      setEditModal({
        relationshipId: edge.id,
        label: edge.data?.label ?? "",
        sourceName,
        targetName,
      });
      setEditLabel(edge.data?.label ?? "");
    },
    [nodes]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editModal) return;
    setSavingEdit(true);
    const result = await updateWikiRelationship(editModal.relationshipId, campaignId, editLabel);
    setSavingEdit(false);
    if (result.success) {
      setEditModal(null);
      await loadData();
      toast.success("Etichetta aggiornata.");
    } else {
      toast.error(result.error);
    }
  }, [campaignId, editModal, editLabel, loadData]);

  const handleDeleteRelationship = useCallback(async () => {
    if (!editModal) return;
    if (!confirm("Eliminare questo collegamento?")) return;
    setDeleting(true);
    const result = await deleteWikiRelationship(editModal.relationshipId, campaignId);
    setDeleting(false);
    if (result.success) {
      setEditModal(null);
      await loadData();
      toast.success("Collegamento eliminato.");
    } else {
      toast.error(result.error);
    }
  }, [campaignId, editModal, loadData]);

  // Gestione Drop dal menu delle voci non collegate
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const entityPayload = event.dataTransfer.getData("application/entity");
      const mapPayload = event.dataTransfer.getData("application/map");
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const pos = { x: position.x - 50, y: position.y - 45 };

      if (entityPayload) {
        try {
          const entity = JSON.parse(entityPayload) as WikiEntityForGraph;
          setNodes((nds) => {
            if (nds.some((n) => n.id === `wiki:${entity.id}`)) return nds;
            return [
              ...nds,
              {
                id: `wiki:${entity.id}`,
                type: "entity",
                position: pos,
                data: { label: entity.name, type: entity.type, entityId: entity.id, degree: 0 },
              },
            ];
          });
          toast.message("Elemento aggiunto al canvas.");
        } catch {}
        return;
      }

      if (mapPayload) {
        try {
          const map = JSON.parse(mapPayload) as MapForGraph;
          setNodes((nds) => {
            if (nds.some((n) => n.id === `map:${map.id}`)) return nds;
            return [
              ...nds,
              {
                id: `map:${map.id}`,
                type: "map",
                position: pos,
                data: { label: map.name, mapId: map.id, degree: 0 },
              },
            ];
          });
          toast.message("Mappa aggiunta al canvas.");
        } catch {}
      }
    },
    [setNodes, screenToFlowPosition]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // Ricerca entità per salto rapido
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const list: { id: string; name: string; type: string; isMap: boolean; degree: number }[] = [];

    nodes.forEach((n) => {
      const isMap = n.type === "map";
      const name = isMap
        ? (n.data as MapNodeData).label
        : (n.data as EntityNodeData).label;
      const type = isMap ? "map" : (n.data as EntityNodeData).type;
      const deg = n.data?.degree ?? 0;
      if (name.toLowerCase().includes(q)) {
        list.push({ id: n.id, name, type, isMap, degree: deg });
      }
    });

    return list.slice(0, 10);
  }, [searchQuery, nodes]);

  const jumpToNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setSelectedNodeId(nodeId);
      setSearchOpen(false);
      setSearchQuery("");
      setCenter(node.position.x, node.position.y, { zoom: 1.15, duration: 600 });
    },
    [nodes, setCenter]
  );

  // Calcolo conteggi per i filtri di categoria
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {
      npc: 0,
      location: 0,
      monster: 0,
      item: 0,
      lore: 0,
      map: 0,
    };
    entities.forEach((e) => {
      if (counts[e.type] !== undefined) counts[e.type]++;
    });
    counts.map = maps.length;
    return counts;
  }, [entities, maps]);

  // Voci non collegate
  const linkedWikiIds = useMemo(() => {
    const set = new Set<string>();
    relationships.forEach((r) => {
      set.add(r.source_id);
      if (r.target_id) set.add(r.target_id);
    });
    return set;
  }, [relationships]);

  const linkedMapIds = useMemo(() => {
    const set = new Set<string>();
    relationships.forEach((r) => {
      if (r.target_map_id) set.add(r.target_map_id);
    });
    return set;
  }, [relationships]);

  const unlinkedEntities = useMemo(() => {
    return entities.filter((e) => {
      const onCanvas = nodes.some((n) => n.id === `wiki:${e.id}`);
      const matchesSearch =
        !searchUnlinked.trim() ||
        e.name.toLowerCase().includes(searchUnlinked.toLowerCase());
      return !linkedWikiIds.has(e.id) && !onCanvas && matchesSearch;
    });
  }, [entities, nodes, linkedWikiIds, searchUnlinked]);

  const unlinkedMaps = useMemo(() => {
    return maps.filter((m) => {
      const onCanvas = nodes.some((n) => n.id === `map:${m.id}`);
      const matchesSearch =
        !searchUnlinked.trim() ||
        m.name.toLowerCase().includes(searchUnlinked.toLowerCase());
      return !linkedMapIds.has(m.id) && !onCanvas && matchesSearch;
    });
  }, [maps, nodes, linkedMapIds, searchUnlinked]);

  // Dettagli del nodo selezionato per l'Inspector
  const selectedNodeInfo = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;

    const isMap = node.type === "map";
    const name = isMap
      ? (node.data as MapNodeData).label
      : (node.data as EntityNodeData).label;
    const type = isMap ? "map" : (node.data as EntityNodeData).type;
    const rawId = isMap
      ? (node.data as MapNodeData).mapId
      : (node.data as EntityNodeData).entityId;

    // Relazioni connesse
    const outRels: { edgeId: string; targetId: string; targetName: string; targetType: string; label: string }[] = [];
    const inRels: { edgeId: string; sourceId: string; sourceName: string; sourceType: string; label: string }[] = [];

    edges.forEach((e) => {
      if (e.source === selectedNodeId) {
        const tgtNode = nodes.find((n) => n.id === e.target);
        if (tgtNode) {
          const tIsMap = tgtNode.type === "map";
          outRels.push({
            edgeId: e.id,
            targetId: tgtNode.id,
            targetName: tIsMap
              ? (tgtNode.data as MapNodeData).label
              : (tgtNode.data as EntityNodeData).label,
            targetType: tIsMap ? "map" : (tgtNode.data as EntityNodeData).type,
            label: (e.data?.label as string) || "—",
          });
        }
      } else if (e.target === selectedNodeId) {
        const srcNode = nodes.find((n) => n.id === e.source);
        if (srcNode) {
          const sIsMap = srcNode.type === "map";
          inRels.push({
            edgeId: e.id,
            sourceId: srcNode.id,
            sourceName: sIsMap
              ? (srcNode.data as MapNodeData).label
              : (srcNode.data as EntityNodeData).label,
            sourceType: sIsMap ? "map" : (srcNode.data as EntityNodeData).type,
            label: (e.data?.label as string) || "—",
          });
        }
      }
    });

    return {
      nodeId: selectedNodeId,
      rawId,
      name,
      type,
      isMap,
      degree: outRels.length + inRels.length,
      outRels,
      inRels,
    };
  }, [selectedNodeId, nodes, edges]);

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#0c0c0e]">
        <Loader2 className="h-9 w-9 animate-spin text-amber-400" />
        <span className="font-sans text-xs tracking-wider uppercase text-zinc-400">
          Caricamento mappa concettuale...
        </span>
      </div>
    );
  }

  return (
    <GraphFocusContext.Provider
      value={{
        selectedNodeId,
        neighborNodeIds,
        focusedEdgeIds,
        showAllLabels,
        linkSourceNodeId,
      }}
    >
      <div className="relative flex h-full w-full overflow-hidden bg-[#0c0c0e]">
      {/* Sidebar Non Collegate */}
      <div
        className={cn(
          "flex flex-col border-r border-[#26262a] bg-[#141417] transition-[width] duration-200 overflow-hidden z-20 shrink-0",
          sidebarCollapsed ? "w-0 border-r-0" : "w-64"
        )}
      >
        {!sidebarCollapsed && (
          <div className="flex flex-col h-full p-3">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-amber-400" />
                <span className="select-none text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-300">
                  Non collegate ({unlinkedEntities.length + unlinkedMaps.length})
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                onClick={() => setSidebarCollapsed(true)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="relative mb-2.5">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <Input
                placeholder="Filtra isolate..."
                value={searchUnlinked}
                onChange={(e) => setSearchUnlinked(e.target.value)}
                className="h-8 pl-8 text-xs bg-zinc-900/90 border-zinc-700/60 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>

            <p className="mb-2 text-[10px] leading-relaxed text-zinc-500">
              Trascina sul canvas o clicca «+» per posizionare l&apos;elemento e collegarlo.
            </p>

            <ul className="flex-1 space-y-1.5 overflow-y-auto pr-1">
              {unlinkedEntities.map((e) => {
                const Icon = TYPE_ICONS[e.type] ?? BookOpen;
                return (
                  <li
                    key={e.id}
                    draggable
                    onDragStart={(ev) => {
                      ev.dataTransfer.setData("application/entity", JSON.stringify(e));
                      ev.dataTransfer.effectAllowed = "move";
                    }}
                    className="group flex cursor-grab items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-[#1a1a1e] px-2.5 py-1.5 text-zinc-200 hover:border-zinc-600 hover:bg-[#222227] active:cursor-grabbing transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
                      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                      <span className="truncate text-xs font-medium">{e.name}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 shrink-0 text-zinc-500 hover:text-amber-300"
                      title="Aggiungi al canvas"
                      onClick={() => {
                        setNodes((nds) => {
                          if (nds.some((n) => n.id === `wiki:${e.id}`)) return nds;
                          return [
                            ...nds,
                            {
                              id: `wiki:${e.id}`,
                              type: "entity",
                              position: { x: 0, y: 0 },
                              data: { label: e.name, type: e.type, entityId: e.id, degree: 0 },
                            },
                          ];
                        });
                        toast.success(`${e.name} aggiunta al canvas.`);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}

              {unlinkedMaps.map((m) => (
                <li
                  key={m.id}
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData(
                      "application/map",
                      JSON.stringify({ id: m.id, name: m.name })
                    );
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  className="group flex cursor-grab items-center justify-between gap-2 rounded-lg border border-orange-900/35 bg-[#1a1a1e] px-2.5 py-1.5 text-orange-200 hover:border-orange-700/60 hover:bg-[#222227] active:cursor-grabbing transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-orange-600/70 group-hover:text-orange-400" />
                    <Map className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                    <span className="truncate text-xs font-medium">{m.name}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 shrink-0 text-orange-500 hover:text-orange-300"
                    title="Aggiungi mappa al canvas"
                    onClick={() => {
                      setNodes((nds) => {
                        if (nds.some((n) => n.id === `map:${m.id}`)) return nds;
                        return [
                          ...nds,
                          {
                            id: `map:${m.id}`,
                            type: "map",
                            position: { x: 0, y: 0 },
                            data: { label: m.name, mapId: m.id, degree: 0 },
                          },
                        ];
                      });
                      toast.success(`Mappa ${m.name} aggiunta al canvas.`);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}

              {unlinkedEntities.length === 0 && unlinkedMaps.length === 0 && (
                <li className="px-2 py-8 text-center text-xs text-zinc-600">
                  Nessun elemento non collegato trovato.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {sidebarCollapsed && (
        <Button
          variant="outline"
          size="sm"
          className="absolute left-3 top-3 z-30 h-8 gap-1.5 rounded-lg border-zinc-700/80 bg-[#141418]/90 text-xs font-medium text-zinc-300 shadow-md backdrop-blur-md hover:bg-zinc-800 hover:text-zinc-100"
          onClick={() => setSidebarCollapsed(false)}
        >
          <Layers className="h-3.5 w-3.5 text-amber-400" />
          Non collegate ({unlinkedEntities.length + unlinkedMaps.length})
        </Button>
      )}

      {/* Main Canvas Area */}
      <div className="relative flex-1 h-full flex flex-col">
        {/* Barra Superiore Interattiva: Ricerca, Filtri, Layout */}
        <div className="absolute top-3 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-2 px-3 pointer-events-none">
          {/* Sezione Sinistra: Spazio per il toggle sidebar o vuoto */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {sidebarCollapsed && <div className="w-36" />}
          </div>

          {/* Sezione Centrale: Ricerca Globale Rapida */}
          <div
            ref={searchContainerRef}
            className="relative flex-1 max-w-sm pointer-events-auto"
          >
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <Input
                placeholder="Cerca nella mappa (es. Elserel, Locanda...)"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                className="h-8.5 w-full rounded-full border-zinc-700/70 bg-[#16161c]/92 pl-8.5 pr-8 text-xs text-zinc-100 shadow-lg backdrop-blur-md placeholder:text-zinc-500 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchOpen(false);
                  }}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Menu a tendina Risultati Ricerca */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute top-10 left-0 right-0 z-50 overflow-hidden rounded-xl border border-zinc-700/80 bg-[#141418]/95 shadow-2xl backdrop-blur-xl">
                <div className="p-1">
                  {searchResults.map((item) => {
                    const Icon = TYPE_ICONS[item.type] ?? (item.isMap ? Map : BookOpen);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => jumpToNode(item.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-zinc-200 hover:bg-zinc-800/80 hover:text-white transition-colors"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                          <span className="truncate font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono text-[10px] text-zinc-500">
                            {item.degree} rel.
                          </span>
                          <Badge variant="outline" className="h-4.5 px-1.5 text-[9px]">
                            {TYPE_NAMES[item.type] ?? item.type}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sezione Destra: Filtri Categoria, Layout & Connessione */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Selettore Layout */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 rounded-lg border-zinc-700/80 bg-[#16161c]/92 text-xs font-medium text-zinc-200 shadow-md backdrop-blur-md hover:bg-zinc-800 hover:text-white"
                >
                  <Network className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Layout:</span>
                  <span className="font-semibold text-amber-300">
                    {layoutMode === "organic"
                      ? "Organico"
                      : layoutMode === "dagre-lr"
                        ? "Orizzontale"
                        : layoutMode === "dagre-tb"
                          ? "Verticale"
                          : "Radiale"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 border-zinc-800 bg-[#18181c] text-zinc-200">
                <DropdownMenuItem
                  onClick={() => {
                    setLayoutMode("organic");
                    applyLayout("organic", entities, maps, relationships);
                  }}
                  className="flex items-center gap-2 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Organico 2D (Cluster)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setLayoutMode("radial");
                    applyLayout("radial", entities, maps, relationships);
                  }}
                  className="flex items-center gap-2 text-xs"
                >
                  <GitBranch className="h-3.5 w-3.5 text-sky-400" />
                  <span>Radiale (Hub concentrici)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setLayoutMode("dagre-lr");
                    applyLayout("dagre-lr", entities, maps, relationships);
                  }}
                  className="flex items-center gap-2 text-xs"
                >
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Gerarchico (Sinistra → Destra)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setLayoutMode("dagre-tb");
                    applyLayout("dagre-tb", entities, maps, relationships);
                  }}
                  className="flex items-center gap-2 text-xs"
                >
                  <ArrowRight className="h-3.5 w-3.5 rotate-90 text-emerald-400" />
                  <span>Gerarchico (Alto → Basso)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Riorganizza Mappa */}
            <Button
              size="sm"
              variant="outline"
              title="Riorganizza layout e ricentra la mappa"
              className="h-8 gap-1.5 rounded-lg border-zinc-700/80 bg-[#16161c]/92 px-2.5 text-xs text-zinc-300 shadow-md backdrop-blur-md hover:bg-zinc-800 hover:text-white"
              onClick={() => applyLayout(layoutMode, entities, maps, relationships)}
            >
              <RefreshCw className="h-3.5 w-3.5 text-zinc-400" />
              <span className="hidden md:inline">Riorganizza</span>
            </Button>

            {/* Toggle Etichette Archi */}
            <Button
              size="sm"
              variant="outline"
              title={showAllLabels ? "Mostra etichette solo su focus/tocco" : "Mostra sempre tutte le etichette"}
              className={cn(
                "h-8 gap-1.5 rounded-lg border-zinc-700/80 px-2.5 text-xs shadow-md backdrop-blur-md transition-colors",
                showAllLabels
                  ? "bg-amber-500/20 text-amber-200 border-amber-500/50"
                  : "bg-[#16161c]/92 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              )}
              onClick={() => setShowAllLabels((v) => !v)}
            >
              {showAllLabels ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden lg:inline">Tutte le etichette</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="hidden lg:inline">Etichette al tocco</span>
                </>
              )}
            </Button>

            {/* Collega Elementi */}
            <Button
              type="button"
              size="sm"
              variant={linkMode ? "default" : "outline"}
              className={cn(
                "h-8 gap-1.5 rounded-lg text-xs font-semibold shadow-md transition-all",
                linkMode
                  ? "bg-amber-500 text-zinc-950 hover:bg-amber-400 ring-2 ring-amber-300 animate-pulse"
                  : "border-zinc-700/80 bg-[#16161c]/92 text-zinc-200 hover:bg-zinc-800 hover:text-white"
              )}
              onClick={() => {
                if (linkMode) cancelLinkMode();
                else {
                  setLinkMode(true);
                  toast.message("Clicca l'elemento origine, poi il bersaglio.");
                }
              }}
            >
              <Link2 className="h-3.5 w-3.5" />
              {linkMode ? "Annulla" : "Collega"}
            </Button>
          </div>
        </div>

        {/* Barra Filtri Categoria in Basso / Secondaria */}
        <div className="absolute top-14 right-3 z-20 flex flex-wrap items-center justify-end gap-1.5 pointer-events-auto">
          {(["npc", "location", "monster", "item", "lore", "map"] as const).map((type) => {
            const active = activeTypeFilters[type] !== false;
            const count = typeCounts[type] || 0;
            if (count === 0) return null;

            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  const nextFilters = { ...activeTypeFilters, [type]: !active };
                  setActiveTypeFilters(nextFilters);
                  applyLayout(layoutMode, entities, maps, relationships, nextFilters);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all shadow-sm backdrop-blur-md",
                  active
                    ? "border-zinc-700/80 bg-[#141418]/90 text-zinc-200 hover:border-zinc-500"
                    : "border-zinc-800/50 bg-zinc-950/60 text-zinc-600 line-through opacity-60"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    type === "npc" && "bg-violet-500",
                    type === "location" && "bg-emerald-500",
                    type === "monster" && "bg-rose-500",
                    type === "item" && "bg-amber-500",
                    type === "lore" && "bg-sky-500",
                    type === "map" && "bg-orange-500"
                  )}
                />
                <span>{TYPE_NAMES[type]}</span>
                <span className="font-mono text-[9px] text-zinc-400">({count})</span>
              </button>
            );
          })}
        </div>

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onEdgeClick={onEdgeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable
          elementsSelectable
          connectionRadius={32}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          zoomOnPinch
          panOnDrag
          className="[&_.react-flow__renderer]:outline-none [&_.react-flow__attribution]:hidden"
          style={{ backgroundColor: "#0c0c0e" }}
          colorMode="dark"
          minZoom={0.1}
          maxZoom={2.5}
          elevateEdgesOnSelect
          connectionLineStyle={{ stroke: "#eab308", strokeWidth: 2, strokeDasharray: "5,5" }}
        >
          <Background
            id="concept-map-grid"
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.2}
            color="rgba(110,110,125,0.18)"
          />
          <Controls
            className="[&_button]:rounded-md [&_button]:border [&_button]:border-zinc-800 [&_button]:bg-[#18181c]/95 [&_button]:text-zinc-300 [&_button:hover]:border-zinc-700 [&_button:hover]:bg-zinc-800 [&_button]:shadow-md !border-zinc-800"
          />
          <MiniMap
            className="!m-3 !rounded-xl !border !border-zinc-800/90 !bg-[#121215]/95 [&_.react-flow__minimap-mask]:fill-[rgba(8,8,10,0.65)]"
            pannable
            zoomable
            nodeStrokeWidth={2}
            nodeBorderRadius={6}
            maskStrokeColor="#3f3f46"
            maskColor="rgba(8, 8, 10, 0.7)"
            nodeColor={(n) => {
              if (String(n.type) === "map") return "rgba(249, 115, 22, 0.75)";
              const t = (n.data as EntityNodeData | undefined)?.type;
              switch (t) {
                case "npc":
                  return "rgba(168, 85, 247, 0.85)";
                case "location":
                  return "rgba(16, 185, 129, 0.85)";
                case "monster":
                  return "rgba(244, 63, 94, 0.85)";
                case "item":
                  return "rgba(245, 158, 11, 0.85)";
                case "lore":
                  return "rgba(14, 165, 233, 0.85)";
                default:
                  return "rgba(113, 113, 122, 0.7)";
              }
            }}
          />
        </ReactFlow>

        {/* Side Inspector Drawer (Dettaglio Nodo Selezionato) */}
        {selectedNodeInfo && (
          <div className="absolute right-3 top-24 bottom-3 z-30 w-80 rounded-2xl border border-zinc-800/90 bg-[#141418]/95 p-4 shadow-2xl backdrop-blur-xl flex flex-col transition-all">
            <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                    {TYPE_NAMES[selectedNodeInfo.type] ?? selectedNodeInfo.type}
                  </Badge>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {selectedNodeInfo.degree} relazioni
                  </span>
                </div>
                <h3 className="font-sans text-base font-bold text-zinc-100 truncate">
                  {selectedNodeInfo.name}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                onClick={() => setSelectedNodeId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Azioni rapide per il nodo */}
            <div className="flex gap-2 py-3 border-b border-zinc-800/70">
              {!selectedNodeInfo.isMap && (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-7.5 flex-1 gap-1.5 border-zinc-700/80 bg-zinc-900/80 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white"
                >
                  <Link
                    href={`/campaigns/${campaignId}/wiki/${selectedNodeInfo.rawId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-amber-400" />
                    Apri Wiki
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7.5 flex-1 gap-1.5 border-zinc-700/80 bg-zinc-900/80 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white"
                onClick={() => {
                  setLinkMode(true);
                  setLinkSourceNodeId(selectedNodeInfo.nodeId);
                  toast.message(`Origine: ${selectedNodeInfo.name}. Clicca il bersaglio.`);
                }}
              >
                <Link2 className="h-3.5 w-3.5 text-amber-400" />
                Collega
              </Button>
            </div>

            {/* Lista delle Relazioni Connesse */}
            <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
              {/* Uscenti */}
              {selectedNodeInfo.outRels.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                    Origine di ({selectedNodeInfo.outRels.length})
                  </span>
                  <div className="space-y-1.5">
                    {selectedNodeInfo.outRels.map((rel) => (
                      <div
                        key={rel.edgeId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-[#1c1c22] p-2 hover:border-zinc-700 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => jumpToNode(rel.targetId)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <ArrowRight className="h-3 w-3 shrink-0 text-amber-400" />
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-zinc-200">
                              {rel.targetName}
                            </span>
                            <span className="block text-[10px] text-zinc-500 italic truncate">
                              «{rel.label}»
                            </span>
                          </div>
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
                          onClick={() => {
                            setEditModal({
                              relationshipId: rel.edgeId,
                              label: rel.label,
                              sourceName: selectedNodeInfo.name,
                              targetName: rel.targetName,
                            });
                            setEditLabel(rel.label);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Entranti */}
              {selectedNodeInfo.inRels.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                    Bersaglio da ({selectedNodeInfo.inRels.length})
                  </span>
                  <div className="space-y-1.5">
                    {selectedNodeInfo.inRels.map((rel) => (
                      <div
                        key={rel.edgeId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/80 bg-[#1c1c22] p-2 hover:border-zinc-700 transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => jumpToNode(rel.sourceId)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <ArrowLeft className="h-3 w-3 shrink-0 text-sky-400" />
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-zinc-200">
                              {rel.sourceName}
                            </span>
                            <span className="block text-[10px] text-zinc-500 italic truncate">
                              «{rel.label}»
                            </span>
                          </div>
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
                          onClick={() => {
                            setEditModal({
                              relationshipId: rel.edgeId,
                              label: rel.label,
                              sourceName: rel.sourceName,
                              targetName: selectedNodeInfo.name,
                            });
                            setEditLabel(rel.label);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNodeInfo.degree === 0 && (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Nessuna relazione attiva. Usa il pulsante «Collega» per connettere questa voce ad altre voci wiki o mappe.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialog Nuova Relazione */}
      <Dialog open={!!connectModal} onOpenChange={(o) => !o && setConnectModal(null)}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Nuova relazione</DialogTitle>
          </DialogHeader>
          {connectModal && (
            <p className="text-sm text-zinc-300">
              Che relazione c&apos;è tra <strong>{connectModal.sourceName}</strong> e{" "}
              <strong>{connectModal.targetName}</strong>?
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="rel-label">Etichetta (es. È alleato di, Vive a, Custodisce)</Label>
            <Input
              id="rel-label"
              value={relationshipLabel}
              onChange={(e) => setRelationshipLabel(e.target.value)}
              placeholder="Es. Lavora per"
              className="bg-zinc-800 border-amber-600/30 text-zinc-100"
              onKeyDown={(e) => e.key === "Enter" && handleSaveRelationship()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConnectModal(null)}
              className="border-amber-600/40"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSaveRelationship}
              disabled={savingRelation}
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
            >
              {savingRelation && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifica/Elimina Relazione */}
      <Dialog open={!!editModal} onOpenChange={(o) => !o && setEditModal(null)}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Modifica collegamento
            </DialogTitle>
          </DialogHeader>
          {editModal && (
            <>
              <p className="text-sm text-zinc-300">
                <strong>{editModal.sourceName}</strong> → <strong>{editModal.targetName}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="edit-rel-label">Etichetta</Label>
                <Input
                  id="edit-rel-label"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Es. Vive qui, Nascondiglio"
                  className="bg-zinc-800 border-amber-600/30 text-zinc-100"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
                />
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/20 order-2 sm:order-1"
                  onClick={handleDeleteRelationship}
                  disabled={deleting || savingEdit}
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina
                </Button>
                <div className="flex gap-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditModal(null)}
                    className="border-amber-600/40"
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={savingEdit || deleting}
                    className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
                  >
                    {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salva
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </GraphFocusContext.Provider>
  );
}

export function EntityGraph(props: EntityGraphProps) {
  return (
    <ReactFlowProvider>
      <EntityGraphInner {...props} />
    </ReactFlowProvider>
  );
}
