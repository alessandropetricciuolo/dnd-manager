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
  type WikiEntityForGraph,
  type WikiRelationshipRow,
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

function EntityNode({ data, selected }: NodeProps<Node<EntityNodeData>>) {
  const Icon = TYPE_ICONS[data.type] ?? BookOpen;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border-2 bg-zinc-900 px-3 py-2 shadow-lg min-w-[140px]",
        selected ? "border-amber-500" : "border-amber-600/50"
      )}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-amber-500" />
      <Icon className="h-5 w-5 shrink-0 text-amber-400" />
      <span className="truncate text-sm font-medium text-zinc-100">{data.label}</span>
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
      <BaseEdge id={id} path={edgePath} className="stroke-amber-500/80" />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan rounded bg-zinc-800 px-2 py-0.5 text-xs text-amber-200 border border-amber-600/40"
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { entity: EntityNode };
const edgeTypes = { labeled: LabeledEdge };

function getLayoutedNodesAndEdges(
  nodes: Node<EntityNodeData>[],
  edges: Edge[],
  direction: "LR" | "TB" = "LR"
): { nodes: Node<EntityNodeData>[]; edges: Edge[] } {
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
  const [relationships, setRelationships] = useState<WikiRelationshipRow[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<EntityNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [connectModal, setConnectModal] = useState<{
    sourceId: string;
    targetId: string;
    sourceName: string;
    targetName: string;
  } | null>(null);
  const [relationshipLabel, setRelationshipLabel] = useState("");
  const [savingRelation, setSavingRelation] = useState(false);
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
    setRelationships(result.relationships ?? []);

    const linkedIds = new Set<string>();
    (result.relationships ?? []).forEach((r) => {
      linkedIds.add(r.source_id);
      linkedIds.add(r.target_id);
    });
    const nodeIds = new Set(linkedIds);
    const initialNodes: Node<EntityNodeData>[] = result.entities
      .filter((e) => nodeIds.has(e.id))
      .map((e, i) => ({
        id: e.id,
        type: "entity",
        position: { x: 0, y: 0 },
        data: { label: e.name, type: e.type, entityId: e.id },
      }));
    const initialEdges: Edge<{ label?: string }>[] = (result.relationships ?? []).map((r) => ({
      id: r.id,
      source: r.source_id,
      target: r.target_id,
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
      if (sourceNode && targetNode) {
        setConnectModal({
          sourceId: connection.source,
          targetId: connection.target,
          sourceName: sourceNode.data.label,
          targetName: targetNode.data.label,
        });
        setRelationshipLabel("");
      }
    },
    [nodes]
  );

  const handleSaveRelationship = useCallback(async () => {
    if (!connectModal) return;
    setSavingRelation(true);
    const result = await createWikiRelationship(
      campaignId,
      connectModal.sourceId,
      connectModal.targetId,
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

  const unlinkedEntities = entities.filter((e) => {
    const hasAsSource = relationships.some((r) => r.source_id === e.id);
    const hasAsTarget = relationships.some((r) => r.target_id === e.id);
    const onCanvas = nodes.some((n) => n.id === e.id);
    return !hasAsSource && !hasAsTarget && !onCanvas;
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
            id: entity.id,
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
