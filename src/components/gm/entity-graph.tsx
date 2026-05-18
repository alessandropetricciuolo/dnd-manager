"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import dagre from "dagre";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getEntityGraphData,
  createWikiRelationship,
  deleteWikiRelationship,
  updateWikiRelationship,
  type WikiEntityForGraph,
  type WikiRelationshipRow,
  type MapForGraph,
} from "@/app/campaigns/entity-graph-actions";
import { cn } from "@/lib/utils";

/** Bounding box stimata per Dagre (disco etichetta sotto). */
const NODE_WIDTH = 108;
const NODE_HEIGHT = 88;

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  npc: User,
  location: MapPin,
  monster: Skull,
  item: Sword,
  lore: ScrollText,
};

/** Colori ispirati al graph Obsidian (aloni per tipo contenuto wiki). */
const TYPE_DISK_STYLE: Record<string, string> = {
  npc: "bg-gradient-to-b from-violet-500 via-violet-600 to-violet-900 shadow-[0_0_20px_-3px_rgba(139,92,246,0.55)] ring-1 ring-violet-300/40",
  location:
    "bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-950 shadow-[0_0_20px_-3px_rgba(16,185,129,0.5)] ring-1 ring-emerald-300/35",
  monster:
    "bg-gradient-to-b from-rose-500 via-rose-700 to-rose-950 shadow-[0_0_20px_-3px_rgba(244,63,94,0.5)] ring-1 ring-rose-300/40",
  item: "bg-gradient-to-b from-amber-400 via-amber-600 to-amber-950 shadow-[0_0_20px_-3px_rgba(245,158,11,0.48)] ring-1 ring-amber-200/40",
  lore: "bg-gradient-to-b from-sky-500 via-sky-600 to-sky-950 shadow-[0_0_20px_-3px_rgba(14,165,233,0.48)] ring-1 ring-sky-300/40",
};

function entityDiskClasses(type: string): string {
  return TYPE_DISK_STYLE[type] ?? "bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-900 shadow-[0_0_14px_-2px_rgba(161,161,170,0.45)] ring-1 ring-zinc-300/35";
}

type EntityNodeData = { label: string; type: string; entityId: string };
type MapNodeData = { label: string; mapId: string };

function EntityNode({ data, selected }: NodeProps<Node<EntityNodeData>>) {
  const Icon = TYPE_ICONS[(data as EntityNodeData).type] ?? BookOpen;
  const d = data as EntityNodeData;
  return (
    <div className="flex flex-col items-center gap-1 px-1 pb-0.5">
      <div className="relative flex flex-col items-center">
        <Handle
          type="target"
          position={Position.Left}
          className="!absolute !left-0 !top-1/2 !h-2 !w-2 !-translate-x-px !-translate-y-1/2 !border-0 !bg-zinc-400/85 !opacity-80"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!absolute !right-0 !top-1/2 !h-2 !w-2 !translate-x-px !-translate-y-1/2 !border-0 !bg-zinc-400/85 !opacity-80"
        />
        <div
          className={cn(
            "relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full transition-[transform,ring] duration-150",
            entityDiskClasses(d.type),
            selected && "scale-[1.06] ring-2 ring-[#dcdcdc]/90 shadow-[0_0_26px_-2px_rgba(255,255,255,0.35)]"
          )}
        >
          <Icon className="relative z-[1] h-[22px] w-[22px] text-white/95 drop-shadow-sm" aria-hidden />
        </div>
      </div>
      <span className="max-w-[6.75rem] text-center font-sans text-[10px] font-medium uppercase tracking-[0.04em] text-zinc-500">
        <span className="line-clamp-2">{d.label}</span>
      </span>
    </div>
  );
}

function MapNode({ data, selected }: NodeProps<Node<MapNodeData>>) {
  const d = data as MapNodeData;
  return (
    <div className="flex flex-col items-center gap-1 px-1 pb-0.5">
      <div className="relative flex flex-col items-center">
        <Handle
          type="target"
          position={Position.Left}
          className="!absolute !left-0 !top-[26px] !h-2 !w-2 !-translate-x-px !-translate-y-1/2 !border-0 !bg-orange-400/90 !opacity-90"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!absolute !right-0 !top-[26px] !h-2 !w-2 !translate-x-px !-translate-y-1/2 !border-0 !bg-orange-400/90 !opacity-90"
        />
        <div
          className={cn(
            "flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl border border-orange-400/45 bg-[#1a1612] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_-2px_rgba(251,146,60,0.35)]",
            selected &&
              "ring-2 ring-orange-300/90 shadow-[0_0_24px_-2px_rgba(251,191,36,0.45)] scale-[1.05]"
          )}
        >
          <Map className="h-[22px] w-[22px] text-orange-300 drop-shadow-sm" aria-hidden />
        </div>
      </div>
      <span className="max-w-[6.75rem] text-center font-sans text-[10px] font-medium uppercase tracking-[0.05em] text-orange-700/95">
        <span className="line-clamp-2">{d.label}</span>
      </span>
    </div>
  );
}

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
}: EdgeProps<Edge<{ label?: string }>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const label = data?.label ?? "";
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={cn(
          "!stroke-[#585c66]",
          "[stroke-opacity:0.72] hover:!stroke-opacity-95 hover:!stroke-[#9ca3af]",
          selected && "!stroke-[#c4c4c4] ![stroke-opacity:1] !stroke-[1.85px]"
        )}
        interactionWidth={16}
      />
      {label.trim() !== "" && label.trim() !== "—" && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan max-w-[8rem] cursor-pointer truncate rounded-full border border-zinc-600/55 bg-[#161618]/94 px-2 py-[1px] text-[10px] font-medium uppercase tracking-wide text-zinc-500 backdrop-blur-sm hover:border-zinc-500/75 hover:bg-zinc-900/95 hover:text-zinc-400"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { entity: EntityNode, map: MapNode };
const edgeTypes = { labeled: LabeledEdge };

type GraphNodeData = EntityNodeData | MapNodeData;

function getLayoutedNodesAndEdges(
  nodes: Node<GraphNodeData>[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR"
): { nodes: Node<GraphNodeData>[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 52, ranksep: 72 });
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  const isHorizontal = direction === "LR";
  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
    };
  });
  return { nodes: layoutedNodes, edges };
}

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const { screenToFlowPosition } = useReactFlow();

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

    const linkedWikiIds = new Set<string>();
    const linkedMapIds = new Set<string>();
    (result.relationships ?? []).forEach((r) => {
      linkedWikiIds.add(r.source_id);
      if (r.target_id) linkedWikiIds.add(r.target_id);
      if (r.target_map_id) linkedMapIds.add(r.target_map_id);
    });

    const initialNodes: Node<GraphNodeData>[] = [];
    result.entities.forEach((e) => {
      if (linkedWikiIds.has(e.id)) {
        initialNodes.push({
          id: `wiki:${e.id}`,
          type: "entity",
          position: { x: 0, y: 0 },
          data: { label: e.name, type: e.type, entityId: e.id },
        });
      }
    });
    (result.maps ?? []).forEach((m) => {
      if (linkedMapIds.has(m.id)) {
        initialNodes.push({
          id: `map:${m.id}`,
          type: "map",
          position: { x: 0, y: 0 },
          data: { label: m.name, mapId: m.id },
        });
      }
    });

    const initialEdges: Edge<{ label?: string }>[] = (result.relationships ?? []).map((r) => ({
      id: r.id,
      source: `wiki:${r.source_id}`,
      target: r.target_map_id != null ? `map:${r.target_map_id}` : `wiki:${r.target_id}`,
      type: "labeled",
      data: { label: r.label },
    }));

    const { nodes: layouted, edges: layoutedEdges } = getLayoutedNodesAndEdges(
      initialNodes,
      initialEdges
    );
    setNodes(layouted);
    setEdges(layoutedEdges);
  }, [campaignId, setNodes, setEdges]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;
      const sourceName = (sourceNode.data as EntityNodeData).label ?? (sourceNode.data as MapNodeData).label ?? "";
      const targetName = (targetNode.data as EntityNodeData).label ?? (targetNode.data as MapNodeData).label ?? "";
      const isSourceMap = String(connection.source).startsWith("map:");
      const isTargetMap = String(connection.target).startsWith("map:");
      // source_id deve essere sempre una voce wiki; se l'utente ha trascinato dalla mappa, invertiamo
      const wikiId = isSourceMap ? (connection.target as string).replace(/^wiki:/, "") : (connection.source as string).replace(/^wiki:/, "");
      const mapId = isSourceMap ? (connection.source as string).replace(/^map:/, "") : (isTargetMap ? (connection.target as string).replace(/^map:/, "") : null);
      const otherWikiId = !isSourceMap && !isTargetMap ? (connection.target as string).replace(/^wiki:/, "") : "";
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
    (_event: React.MouseEvent, edge: Edge<{ label?: string }>) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      const sourceName = (sourceNode?.data as EntityNodeData)?.label ?? (sourceNode?.data as MapNodeData)?.label ?? "";
      const targetName = (targetNode?.data as EntityNodeData)?.label ?? (targetNode?.data as MapNodeData)?.label ?? "";
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

  const linkedWikiIds = new Set<string>();
  relationships.forEach((r) => {
    linkedWikiIds.add(r.source_id);
    if (r.target_id) linkedWikiIds.add(r.target_id);
  });
  const unlinkedEntities = entities.filter((e) => {
    const onCanvas = nodes.some((n) => n.id === `wiki:${e.id}`);
    return !linkedWikiIds.has(e.id) && !onCanvas;
  });

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer.getData("application/entity");
      if (!payload) return;
      try {
        const entity = JSON.parse(payload) as WikiEntityForGraph;
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        setNodes((nds) => [
          ...nds,
          {
            id: `wiki:${entity.id}`,
            type: "entity",
            position: { x: position.x - NODE_WIDTH / 2, y: position.y - NODE_HEIGHT / 2 },
            data: { label: entity.name, type: entity.type, entityId: entity.id },
          },
        ]);
      } catch {
        // ignore
      }
    },
    [setNodes, screenToFlowPosition]
  );
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-[#0c0c0e]">
      {/* Sidebar tipo Obsidian — file/non collegate */}
      <div
        className={cn(
          "flex flex-col border-r border-[#252525] bg-[#171717] transition-[width] overflow-hidden",
          sidebarCollapsed ? "w-0" : "w-56"
        )}
      >
        {!sidebarCollapsed && (
          <div className="flex flex-col h-full p-2.5">
            <div className="flex items-center justify-between px-1 py-2">
              <span className="select-none text-[11px] font-semibold uppercase tracking-[0.12em] text-[#979797]">
                Non collegate
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-[#727272] hover:bg-[#2a2a2a] hover:text-[#b5b5b5]"
                onClick={() => setSidebarCollapsed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="mb-3 px-1 text-[10px] leading-relaxed text-[#6b6b6b]">
              Trascina nel canvas come nel graph di Obsidian.
            </p>
            <ul className="flex-1 space-y-1 overflow-y-auto">
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
                    className="flex cursor-grab items-center gap-2 rounded-lg border border-[#2f2f2f] bg-[#1f1f1f] px-2 py-1.5 text-[#c6c6c6] hover:border-[#404040] hover:bg-[#262626] active:cursor-grabbing"
                  >
                    <GripVertical className="h-3 w-3 shrink-0 text-[#545454]" />
                    <Icon className="h-3.5 w-3.5 shrink-0 text-[#8a8a8a]" />
                    <span className="truncate text-[11px]">{e.name}</span>
                  </li>
                );
              })}
              {unlinkedEntities.length === 0 && (
                <li className="px-2 py-6 text-[11px] text-[#595959]">Tutte le voci sono collegate.</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-2 top-2 z-10 rounded-md border border-[#333]/80 bg-[#141414]/90 text-[11px] text-[#a3a3a3] shadow-sm backdrop-blur-sm hover:bg-[#1f1f1f] hover:text-[#e5e5e5]"
          onClick={() => setSidebarCollapsed(false)}
        >
          Non collegate
        </Button>
      )}

      <div className="relative h-full flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          defaultEdgeOptions={{
            style: {
              stroke: "#585c66",
              strokeOpacity: 0.72,
              strokeWidth: 1.25,
            },
          }}
          proOptions={{ hideAttribution: true }}
          zoomOnPinch
          panOnDrag
          className="[&_.react-flow__renderer]:outline-none [&_.react-flow__attribution]:hidden"
          style={{ backgroundColor: "#0c0c0e" }}
          colorMode="dark"
          minZoom={0.12}
          maxZoom={2.25}
          elevateEdgesOnSelect
          connectionLineStyle={{ stroke: "#6b7280", strokeWidth: 1.4, strokeOpacity: 0.9 }}
        >
          <Background
            id="concept-map-dots"
            variant={BackgroundVariant.Dots}
            gap={22}
            size={1.15}
            color="rgba(120,120,132,0.17)"
          />
          <Controls
            className="[&_button]:rounded-md [&_button]:border [&_button]:border-[#333] [&_button]:bg-[#1a1a1a]/95 [&_button]:text-[#bdbdbd] [&_button:hover]:border-[#444] [&_button:hover]:bg-[#252525] [&_button]:shadow-md !border-[#303030]"
          />
          <MiniMap
            className="!m-3 !rounded-lg !border !border-[#333] !bg-[#121212]/94 [&_.react-flow__minimap-mask]:fill-[rgba(8,8,10,0.58)] [&_.react-flow__minimap-node]:cursor-grab"
            pannable
            zoomable
            nodeStrokeWidth={2}
            nodeBorderRadius={4}
            maskStrokeColor="#404040"
            maskColor="rgba(8, 8, 10, 0.62)"
            nodeColor={(n) =>
              String(n.type) === "map"
                ? "rgba(234,88,12,0.55)"
                : (() => {
                    const t = (n.data as EntityNodeData | undefined)?.type;
                    switch (t) {
                      case "npc":
                        return "rgba(139,92,246,0.7)";
                      case "location":
                        return "rgba(34,197,94,0.65)";
                      case "monster":
                        return "rgba(244,63,94,0.65)";
                      case "item":
                        return "rgba(245,158,11,0.68)";
                      case "lore":
                        return "rgba(14,165,233,0.65)";
                      default:
                        return "rgba(113,113,122,0.65)";
                    }
                  })()
            }
          />
        </ReactFlow>
      </div>

      <Dialog open={!!connectModal} onOpenChange={(o) => !o && setConnectModal(null)}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-amber-400">
              Nuova relazione
            </DialogTitle>
          </DialogHeader>
          {connectModal && (
            <p className="text-sm text-zinc-300">
              Che relazione c&apos;è tra <strong>{connectModal.sourceName}</strong> e{" "}
              <strong>{connectModal.targetName}</strong>?
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="rel-label">Etichetta (es. È nemico di, Vive a)</Label>
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
            <Button variant="outline" onClick={() => setConnectModal(null)} className="border-amber-600/40">
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
                  <Button variant="outline" onClick={() => setEditModal(null)} className="border-amber-600/40">
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
  );
}

export function EntityGraph(props: EntityGraphProps) {
  return (
    <ReactFlowProvider>
      <EntityGraphInner {...props} />
    </ReactFlowProvider>
  );
}
