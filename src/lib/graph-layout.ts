/**
 * graph-layout.ts
 *
 * Algoritmi di layout ottimizzati per concept map e grafi di conoscenza wiki (D&D Campaign).
 * Risolve il collasso verticale dei grafi densi fornendo:
 * 1. Layout Organico (Force-Directed 2D basato su Fruchterman-Reingold & Coulomb-Hooke)
 * 2. Layout Gerarchico migliorato (Dagre LR / TB con spaziatura calibrata)
 * 3. Layout Radiale (Concentric rings centrati sugli hub primari)
 * 4. Calcolo della centralità di grado (Degree Centrality) e rilevamento componenti connesse.
 */

import dagre from "dagre";
import { Position } from "@xyflow/react";

export type LayoutType = "organic" | "dagre-lr" | "dagre-tb" | "radial";

export interface NodeLayoutMeta {
  id: string;
  width?: number;
  height?: number;
  type?: string;
  label?: string;
}

export interface EdgeLayoutMeta {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface LayoutResultNode {
  id: string;
  x: number;
  y: number;
  degree: number;
  inDegree: number;
  outDegree: number;
  sourcePosition?: Position;
  targetPosition?: Position;
}

export interface LayoutResultEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  sourcePosition?: Position;
  targetPosition?: Position;
}

export interface LayoutOutput {
  nodes: LayoutResultNode[];
  edges: LayoutResultEdge[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number };
}

/** Calcola grado entrante, uscente e totale per ogni nodo */
export function computeDegrees(
  nodeIds: string[],
  edges: EdgeLayoutMeta[]
): Map<string, { inDegree: number; outDegree: number; degree: number }> {
  const map = new Map<string, { inDegree: number; outDegree: number; degree: number }>();
  for (const id of nodeIds) {
    map.set(id, { inDegree: 0, outDegree: 0, degree: 0 });
  }

  for (const e of edges) {
    const src = map.get(e.source);
    if (src) {
      src.outDegree += 1;
      src.degree += 1;
    }
    const tgt = map.get(e.target);
    if (tgt) {
      tgt.inDegree += 1;
      tgt.degree += 1;
    }
  }

  return map;
}

/** Rileva le componenti connesse del grafo non orientato */
function findConnectedComponents(nodeIds: string[], edges: EdgeLayoutMeta[]): string[][] {
  const adj = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    adj.set(id, new Set());
  }
  for (const e of edges) {
    if (adj.has(e.source) && adj.has(e.target)) {
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }
  }

  const visited = new Set<string>();
  const components: string[][] = [];

  for (const id of nodeIds) {
    if (visited.has(id)) continue;
    const comp: string[] = [];
    const queue = [id];
    visited.add(id);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      comp.push(curr);
      const neighbors = adj.get(curr) ?? new Set();
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    components.push(comp);
  }

  // Ordina per dimensione decrescente
  components.sort((a, b) => b.length - a.length);
  return components;
}

/**
 * Calcola l'orientamento ottimale degli handle tra due posizioni 2D.
 */
export function getOptimalHandlePositions(
  srcX: number,
  srcY: number,
  tgtX: number,
  tgtY: number
): { sourcePosition: Position; targetPosition: Position } {
  const dx = tgtX - srcX;
  const dy = tgtY - srcY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { sourcePosition: Position.Right, targetPosition: Position.Left };
    } else {
      return { sourcePosition: Position.Left, targetPosition: Position.Right };
    }
  } else {
    if (dy >= 0) {
      return { sourcePosition: Position.Bottom, targetPosition: Position.Top };
    } else {
      return { sourcePosition: Position.Top, targetPosition: Position.Bottom };
    }
  }
}

/**
 * Layout Organico (Force-Directed 2D).
 * Distribuisce i nodi in 2D evitando la compressione a colonna di Dagre.
 */
function computeOrganicLayout(
  nodes: NodeLayoutMeta[],
  edges: EdgeLayoutMeta[],
  degreeMap: Map<string, { inDegree: number; outDegree: number; degree: number }>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const nodeIds = nodes.map((n) => n.id);
  const components = findConnectedComponents(nodeIds, edges);

  const componentSpacing = 280;
  const componentBoxes: {
    ids: string[];
    width: number;
    height: number;
    positions: Map<string, { x: number; y: number; vx: number; vy: number }>;
  }[] = [];

  for (const comp of components) {
    const compSet = new Set(comp);
    const compEdges = edges.filter((e) => compSet.has(e.source) && compSet.has(e.target));
    const count = comp.length;

    // Posizioni iniziali per la componente: phyllotaxis / spirale concentrica con hub al centro
    const sortedByDegree = [...comp].sort((a, b) => (degreeMap.get(b)?.degree ?? 0) - (degreeMap.get(a)?.degree ?? 0));
    const compPos = new Map<string, { x: number; y: number; vx: number; vy: number }>();

    sortedByDegree.forEach((id, index) => {
      if (index === 0) {
        compPos.set(id, { x: 0, y: 0, vx: 0, vy: 0 });
      } else {
        // Angolo d'oro per dispersione naturale 2D
        const angle = index * 2.399963;
        const radius = Math.sqrt(index) * 110 + 40;
        // Aspetto orizzontale 16:9
        const x = Math.cos(angle) * radius * 1.25;
        const y = Math.sin(angle) * radius * 0.85;
        compPos.set(id, { x, y, vx: 0, vy: 0 });
      }
    });

    if (count > 1) {
      // Simulazione di forze
      const iterations = Math.min(220, Math.max(120, count * 3));
      const idealEdgeLen = Math.max(140, Math.min(220, 160 + count * 0.8));
      const kRepulsion = 14000;
      const kSpring = 0.045;
      const kCenterGravity = 0.012;

      for (let iter = 0; iter < iterations; iter++) {
        const temp = 1.0 - iter / iterations; // Raffreddamento simulated annealing

        // 1. Repulsione (Coulomb) tra tutte le coppie nella componente
        for (let i = 0; i < count; i++) {
          const idA = comp[i];
          const posA = compPos.get(idA)!;

          for (let j = i + 1; j < count; j++) {
            const idB = comp[j];
            const posB = compPos.get(idB)!;

            let dx = posA.x - posB.x;
            let dy = posA.y - posB.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.01) {
              dx = (Math.random() - 0.5) * 10;
              dy = (Math.random() - 0.5) * 10;
              dist = Math.sqrt(dx * dx + dy * dy);
            }

            // Prevenzione collisione fisica (minimo 110px tra nodi)
            const minAllowedDist = 110;
            let repForce = 0;
            if (dist < minAllowedDist) {
              repForce = (minAllowedDist - dist) * 0.8;
            } else {
              repForce = (kRepulsion / (dist * dist)) * 0.5;
            }

            // Normalizza e applica
            const fx = (dx / dist) * repForce;
            const fy = (dy / dist) * repForce;

            posA.vx += fx;
            posA.vy += fy;
            posB.vx -= fx;
            posB.vy -= fy;
          }
        }

        // 2. Attrazione elastica (Hooke) lungo gli archi
        for (const edge of compEdges) {
          const posSrc = compPos.get(edge.source);
          const posTgt = compPos.get(edge.target);
          if (!posSrc || !posTgt) continue;

          let dx = posTgt.x - posSrc.x;
          let dy = posTgt.y - posSrc.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.01) dist = 0.01;

          const springForce = (dist - idealEdgeLen) * kSpring;
          const fx = (dx / dist) * springForce;
          const fy = (dy / dist) * springForce;

          posSrc.vx += fx;
          posSrc.vy += fy;
          posTgt.vx -= fx;
          posTgt.vy -= fy;
        }

        // 3. Gravità centrale verso il baricentro con proporzione 16:9
        for (let i = 0; i < count; i++) {
          const id = comp[i];
          const pos = compPos.get(id)!;
          pos.vx -= pos.x * kCenterGravity * 0.75;
          pos.vy -= pos.y * kCenterGravity * 1.3;

          // Aggiorna posizione con clamping basato sulla temperatura
          const maxStep = 45 * temp;
          const stepLen = Math.sqrt(pos.vx * pos.vx + pos.vy * pos.vy);
          if (stepLen > maxStep && stepLen > 0.001) {
            pos.x += (pos.vx / stepLen) * maxStep;
            pos.y += (pos.vy / stepLen) * maxStep;
          } else {
            pos.x += pos.vx;
            pos.y += pos.vy;
          }

          // Damping velocità
          pos.vx *= 0.35;
          pos.vy *= 0.35;
        }
      }
    }

    // Calcola bounding box della componente
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const id of comp) {
      const p = compPos.get(id)!;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const compWidth = maxX - minX || 120;
    const compHeight = maxY - minY || 90;
    const compCenterX = (minX + maxX) / 2;
    const compCenterY = (minY + maxY) / 2;

    // Normalizza le coordinate locali rispetto al centro della componente
    for (const id of comp) {
      const p = compPos.get(id)!;
      p.x -= compCenterX;
      p.y -= compCenterY;
    }

    componentBoxes.push({
      ids: comp,
      width: compWidth,
      height: compHeight,
      positions: compPos,
    });
  }

  // Suddividi in componenti connesse (dimensione >= 2) e nodi isolati (dimensione = 1)
  const connectedBoxes = componentBoxes.filter((c) => c.ids.length > 1);
  const isolatedBoxes = componentBoxes.filter((c) => c.ids.length === 1);

  // 2D Shelf Packing per le componenti connesse (rapporto d'aspetto bilanciato 16:9)
  const MAX_ROW_WIDTH = Math.max(1200, Math.min(2400, Math.sqrt(connectedBoxes.length) * 800));
  let curX = 0;
  let curY = 0;
  let rowHeight = 0;

  for (const box of connectedBoxes) {
    if (curX > 0 && curX + box.width > MAX_ROW_WIDTH) {
      // Vai a capo
      curX = 0;
      curY += rowHeight + componentSpacing;
      rowHeight = 0;
    }

    const boxCenterX = curX + box.width / 2;
    const boxCenterY = curY + box.height / 2;

    for (const id of box.ids) {
      const local = box.positions.get(id)!;
      positions.set(id, {
        x: boxCenterX + local.x,
        y: boxCenterY + local.y,
      });
    }

    curX += box.width + componentSpacing;
    if (box.height > rowHeight) rowHeight = box.height;
  }

  // Nodi isolati (se presenti sul canvas): raggruppali ordinatamente in fondo in una griglia
  if (isolatedBoxes.length > 0) {
    const startY = curY + rowHeight + componentSpacing * 1.2;
    const ISOLATED_PER_ROW = 8;
    const ISO_SPACING_X = 140;
    const ISO_SPACING_Y = 110;

    isolatedBoxes.forEach((box, idx) => {
      const col = idx % ISOLATED_PER_ROW;
      const row = Math.floor(idx / ISOLATED_PER_ROW);
      const id = box.ids[0];
      positions.set(id, {
        x: col * ISO_SPACING_X,
        y: startY + row * ISO_SPACING_Y,
      });
    });
  }

  // Centra globalmente tutte le posizioni a (0, 0)
  let totalMinX = Infinity,
    totalMaxX = -Infinity,
    totalMinY = Infinity,
    totalMaxY = -Infinity;
  for (const pos of positions.values()) {
    if (pos.x < totalMinX) totalMinX = pos.x;
    if (pos.x > totalMaxX) totalMaxX = pos.x;
    if (pos.y < totalMinY) totalMinY = pos.y;
    if (pos.y > totalMaxY) totalMaxY = pos.y;
  }
  const globalCenterX = (totalMinX + totalMaxX) / 2;
  const globalCenterY = (totalMinY + totalMaxY) / 2;

  for (const pos of positions.values()) {
    pos.x -= globalCenterX;
    pos.y -= globalCenterY;
  }

  return positions;
}

/**
 * Layout Gerarchico migliorato tramite Dagre (LR / TB).
 */
function computeDagreLayout(
  nodes: NodeLayoutMeta[],
  edges: EdgeLayoutMeta[],
  direction: "LR" | "TB"
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  // Ampia separazione per evitare sovrapposizioni di testo ed etichette
  g.setGraph({
    rankdir: direction,
    nodesep: 90,
    ranksep: 180,
    marginx: 40,
    marginy: 40,
  });

  nodes.forEach((n) => {
    g.setNode(n.id, { width: n.width ?? 120, height: n.height ?? 96 });
  });

  edges.forEach((e) => {
    g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  nodes.forEach((node) => {
    const pos = g.node(node.id);
    if (pos) {
      positions.set(node.id, {
        x: pos.x - (node.width ?? 120) / 2,
        y: pos.y - (node.height ?? 96) / 2,
      });
    } else {
      positions.set(node.id, { x: 0, y: 0 });
    }
  });

  return positions;
}

/**
 * Layout Radiale / Concentrico.
 * Posiziona gli hub principali al centro e i nodi satellite su anelli concentrici.
 */
function computeRadialLayout(
  nodes: NodeLayoutMeta[],
  edges: EdgeLayoutMeta[],
  degreeMap: Map<string, { inDegree: number; outDegree: number; degree: number }>
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodes.length === 0) return positions;

  const sorted = [...nodes].sort(
    (a, b) => (degreeMap.get(b.id)?.degree ?? 0) - (degreeMap.get(a.id)?.degree ?? 0)
  );

  // Suddivisione in fasce:
  // Centro: top 2-3 nodi (hub massimi)
  // Fascia 1: nodi grado alto (r=260)
  // Fascia 2: nodi grado medio (r=480)
  // Fascia 3: foglie / orfani (r=720)
  const tier0: NodeLayoutMeta[] = [];
  const tier1: NodeLayoutMeta[] = [];
  const tier2: NodeLayoutMeta[] = [];
  const tier3: NodeLayoutMeta[] = [];

  sorted.forEach((n, idx) => {
    const deg = degreeMap.get(n.id)?.degree ?? 0;
    if (idx === 0 && deg > 0) {
      tier0.push(n);
    } else if (deg >= 5 || (idx < 6 && deg > 1)) {
      tier1.push(n);
    } else if (deg >= 2) {
      tier2.push(n);
    } else {
      tier3.push(n);
    }
  });

  if (tier0.length === 1) {
    positions.set(tier0[0].id, { x: 0, y: 0 });
  } else {
    distributeOnRing(tier0, 90, 0, positions);
  }

  distributeOnRing(tier1, 260, 0.2, positions);
  distributeOnRing(tier2, 500, 0.4, positions);
  distributeOnRing(tier3, 760, 0.6, positions);

  return positions;
}

function distributeOnRing(
  ringNodes: NodeLayoutMeta[],
  radius: number,
  offsetAngle: number,
  output: Map<string, { x: number; y: number }>
) {
  const count = ringNodes.length;
  if (count === 0) return;
  const angleStep = (2 * Math.PI) / count;
  ringNodes.forEach((node, i) => {
    const angle = i * angleStep + offsetAngle;
    // Ovale 16:9
    const x = Math.cos(angle) * radius * 1.35;
    const y = Math.sin(angle) * radius * 0.95;
    output.set(node.id, { x, y });
  });
}

/**
 * Funzione principale di layout del grafo.
 */
export function layoutGraph(
  nodes: NodeLayoutMeta[],
  edges: EdgeLayoutMeta[],
  layoutType: LayoutType = "organic"
): LayoutOutput {
  const degreeMap = computeDegrees(
    nodes.map((n) => n.id),
    edges
  );

  let rawPositions: Map<string, { x: number; y: number }>;

  switch (layoutType) {
    case "dagre-lr":
      rawPositions = computeDagreLayout(nodes, edges, "LR");
      break;
    case "dagre-tb":
      rawPositions = computeDagreLayout(nodes, edges, "TB");
      break;
    case "radial":
      rawPositions = computeRadialLayout(nodes, edges, degreeMap);
      break;
    case "organic":
    default:
      rawPositions = computeOrganicLayout(nodes, edges, degreeMap);
      break;
  }

  // Costruisci i nodi posizionati
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  const positionedNodes: LayoutResultNode[] = nodes.map((n) => {
    const pos = rawPositions.get(n.id) ?? { x: 0, y: 0 };
    const degInfo = degreeMap.get(n.id) ?? { inDegree: 0, outDegree: 0, degree: 0 };

    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.y > maxY) maxY = pos.y;

    const isHorizontal = layoutType === "dagre-lr";
    const isVertical = layoutType === "dagre-tb";

    return {
      id: n.id,
      x: pos.x,
      y: pos.y,
      degree: degInfo.degree,
      inDegree: degInfo.inDegree,
      outDegree: degInfo.outDegree,
      sourcePosition: isHorizontal ? Position.Right : isVertical ? Position.Bottom : undefined,
      targetPosition: isHorizontal ? Position.Left : isVertical ? Position.Top : undefined,
    };
  });

  // Costruisci gli archi con posizioni ottimali
  const positionedEdges: LayoutResultEdge[] = edges.map((e) => {
    const srcPos = rawPositions.get(e.source) ?? { x: 0, y: 0 };
    const tgtPos = rawPositions.get(e.target) ?? { x: 0, y: 0 };
    const handles = getOptimalHandlePositions(srcPos.x, srcPos.y, tgtPos.x, tgtPos.y);

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      sourcePosition: layoutType === "dagre-lr" ? Position.Right : layoutType === "dagre-tb" ? Position.Bottom : handles.sourcePosition,
      targetPosition: layoutType === "dagre-lr" ? Position.Left : layoutType === "dagre-tb" ? Position.Top : handles.targetPosition,
    };
  });

  const width = maxX - minX || 800;
  const height = maxY - minY || 600;

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
    bounds: { minX, maxX, minY, maxY, width, height },
  };
}
