"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import dagre from "dagre";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
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

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  npc: User,
  location: MapPin,
  monster: Skull,
  item: Sword,
  lore: ScrollText,
};

type EntityNodeData = { label: string; type: string; entityId: string };
type MapNodeData = { label: string; mapId: string };

function EntityNode({ data, selected }: NodeProps<Node<EntityNodeData>>) {
  const Icon = TYPE_ICONS[(data as EntityNodeData).type] ?? BookOpen;
  const d = data as EntityNodeData;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border-2 bg-zinc-900 px-3 py-2 shadow-lg min-w-[140px]",
        selected ? "border-amber-500" : "border-amber-600/50"
      )}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-amber-500" />
      <Icon className="h-5 w-5 shrink-0 text-amber-400" />
      <span className="truncate text-sm font-medium text-zinc-100">{d.label}</span>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-amber-500" />
    </div>
  );
}

function MapNode({ data, selected }: NodeProps<Node<MapNodeData>>) {
  const d = data as MapNodeData;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-none border-4 border-amber-400 bg-zinc-900 px-3 py-2 shadow-lg min-w-[140px]",
        selected ? "border-amber-300" : "border-amber-400"
      )}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-amber-500" />
      <Map className="h-5 w-5 shrink-0 text-amber-400" />
      <span className="truncate text-sm font-medium text-zinc-100">{d.label}</span>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-amber-500" />
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
        className={cn("stroke-amber-500/80 hover:stroke-amber-400", selected && "stroke-amber-400 stroke-[3px]")}
        style={{ strokeWidth: selected ? 3 : 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan rounded bg-zinc-800 px-2 py-0.5 text-xs text-amber-200 border border-amber-600/40 cursor-pointer hover:bg-zinc-700"
        >
          {label}
        </div>
      </EdgeLabelRenderer>
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
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 60 });
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
    <div className="flex h-full w-full">
      {/* Sidebar Entità Slegate */}
      <div
        className={cn(
          "flex flex-col border-r border-amber-600/20 bg-zinc-950 transition-[width] overflow-hidden",
          sidebarCollapsed ? "w-0" : "w-56"
        )}
      >
        {!sidebarCollapsed && (
          <div className="flex flex-col p-2 h-full">
            <div className="flex items-center justify-between py-2 px-1">
              <span className="text-xs font-medium text-amber-400/90">Entità slegate</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-400 hover:text-zinc-200"
                onClick={() => setSidebarCollapsed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-zinc-500 mb-2 px-1">
              Trascina sulla lavagna per aggiungerle al grafo.
            </p>
            <ul className="flex-1 overflow-y-auto space-y-1">
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
                    className="flex items-center gap-2 rounded-md border border-amber-600/20 bg-zinc-900/80 px-2 py-1.5 cursor-grab active:cursor-grabbing text-zinc-200 hover:bg-zinc-800"
                  >
                    <GripVertical className="h-3 w-3 text-zinc-500 shrink-0" />
                    <Icon className="h-4 w-4 shrink-0 text-amber-400/80" />
                    <span className="truncate text-xs">{e.name}</span>
                  </li>
                );
              })}
              {unlinkedEntities.length === 0 && (
                <li className="text-xs text-zinc-500 px-2 py-4">Nessuna entità senza relazioni</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {sidebarCollapsed && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-2 top-2 z-10 text-amber-400 hover:bg-amber-600/20"
          onClick={() => setSidebarCollapsed(false)}
        >
          Entità slegate
        </Button>
      )}

      <div className="flex-1 h-full">
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
          className="bg-zinc-950"
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background color="rgba(251,191,36,0.08)" gap={16} />
          <Controls className="!bg-zinc-900 !border-amber-600/30 !text-zinc-200" />
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
