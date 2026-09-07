import {
  applyFowPatches,
  createTacticalScene,
  deriveFowFromFeatures,
  saveTacticalSceneRevision,
  transitionTacticalScene,
} from "./index";
import type { SceneLifecycle, SceneOverlayItem, TacticalScene } from "./types";

/** State held by the R6.3 GM workspace. It is intentionally not persisted. */
export type TacticalWorkspaceState = {
  draft: TacticalScene;
  published: TacticalScene | null;
  history: TacticalScene[];
  discardedRevisionNos: number[];
};

export function createWorkspaceState(scene: TacticalScene): TacticalWorkspaceState {
  return { draft: scene, published: null, history: [], discardedRevisionNos: [] };
}

export function createLocalWorkspaceScene(campaignId: string, name = "Scena rapida") {
  return createWorkspaceState(createTacticalScene({
    id: `local-${crypto.randomUUID()}`,
    campaignId,
    name,
    floors: [{
      id: "floor-1",
      label: "Piano principale",
      sortOrder: 0,
      width: 1600,
      height: 900,
      asset: { id: "local-placeholder", origin: "generated", storageKey: "local://placeholder", mimeType: "image/svg+xml", width: 1600, height: 900 },
      grid: { visible: false, kind: "square", cellSize: 80, offsetX: 0, offsetY: 0 },
      layers: [{ id: "layer-1", label: "Ambiente", sortOrder: 0, visible: true, opacity: 1, features: [] }],
    }],
  }));
}

export function editWorkspace(state: TacticalWorkspaceState, next: Omit<TacticalScene, "revisionNo" | "parentRevisionId">): TacticalWorkspaceState {
  return { ...state, draft: saveTacticalSceneRevision(state.draft, state.draft.revisionNo, next), history: [...state.history, state.draft] };
}

export function setWorkspaceLifecycle(state: TacticalWorkspaceState, lifecycle: SceneLifecycle, expectedRevisionNo = state.draft.revisionNo): TacticalWorkspaceState {
  return { ...state, draft: transitionTacticalScene(state.draft, lifecycle, expectedRevisionNo) };
}

export function deriveWorkspaceFow(state: TacticalWorkspaceState, floorId: string): TacticalWorkspaceState {
  const derived = deriveFowFromFeatures(state.draft, floorId);
  return editWorkspace(state, derived);
}

export function toggleWorkspaceRegion(state: TacticalWorkspaceState, regionId: string, revealed: boolean): TacticalWorkspaceState {
  const next = { ...state.draft, fow: { ...state.draft.fow, patches: [...state.draft.fow.patches, { id: `patch-${crypto.randomUUID()}`, regionId, operation: revealed ? "reveal" as const : "hide" as const }] } };
  return editWorkspace(state, next);
}

export function materializeWorkspaceFow(state: TacticalWorkspaceState): TacticalWorkspaceState {
  return editWorkspace(state, applyFowPatches(state.draft));
}

export type WorkspaceOverlayKind = "text" | "marker" | "area" | "circle" | "measure" | "timer";

export function addWorkspaceOverlay(state: TacticalWorkspaceState, type: WorkspaceOverlayKind, label = "") : TacticalWorkspaceState {
  const id = `overlay-${crypto.randomUUID()}`;
  const items: Record<WorkspaceOverlayKind, SceneOverlayItem> = {
    text: { id, type: "text", x: .5, y: .42, text: label.trim() || "Nota GM", color: "#f5d486", size: 18 },
    marker: { id, type: "marker", x: .5, y: .5, label: label.trim() || "!", color: "#f5b942" },
    area: { id, type: "area", polygon: [{ x: .3, y: .3 }, { x: .55, y: .3 }, { x: .55, y: .55 }, { x: .3, y: .55 }], color: "#c77b30", opacity: .3 },
    circle: { id, type: "circle", x: .5, y: .5, radius: .1, color: "#f5d486" },
    measure: { id, type: "measure", x: .5, y: .5, radius: .18, color: "#90c5d8" },
    timer: { id, type: "timer", x: .5, y: .12, seconds: 30, label: label.trim() || "Round", color: "#f5d486" },
  };
  return editWorkspace(state, { ...state.draft, overlay: { ...state.draft.overlay, draft: [...state.draft.overlay.draft, items[type]] } });
}

export function removeWorkspaceOverlay(state: TacticalWorkspaceState, overlayId: string): TacticalWorkspaceState {
  return editWorkspace(state, { ...state.draft, overlay: { ...state.draft.overlay, draft: state.draft.overlay.draft.filter((item) => item.id !== overlayId) } });
}

/** Runtime reveal changes the projection snapshot only; the structural draft stays untouched. */
export function updatePublishedFow(state: TacticalWorkspaceState, regionId: string, revealed: boolean): TacticalWorkspaceState {
  if (!state.published) return state;
  const fow = { ...state.published.fow, regions: state.published.fow.regions.map((region) => region.id === regionId ? { ...region, revealed } : region) };
  return { ...state, published: { ...state.published, fow } };
}

/** Publishes a local snapshot only; no server/database write is performed. */
export function publishWorkspace(state: TacticalWorkspaceState): TacticalWorkspaceState {
  if (state.draft.lifecycle !== "ready" && state.draft.lifecycle !== "live") throw new Error("La scena deve essere pronta prima della proiezione");
  const published = { ...applyFowPatches(state.draft), lifecycle: "live" as const, overlay: { ...state.draft.overlay, published: structuredClone(state.draft.overlay.draft) } };
  return { ...state, draft: published, published: structuredClone(published) };
}

export function discardWorkspaceRevision(state: TacticalWorkspaceState): TacticalWorkspaceState {
  const previous = state.history.at(-1);
  if (!previous) return state;
  return { ...state, draft: previous, history: state.history.slice(0, -1), discardedRevisionNos: [...state.discardedRevisionNos, state.draft.revisionNo] };
}

export function rollbackWorkspacePublication(state: TacticalWorkspaceState): TacticalWorkspaceState {
  return state.published ? { ...state, draft: { ...state.published, lifecycle: "ready" }, published: null } : state;
}
