import type { NormPoint, NormPolygon, TacticalScene } from "./types";
export type ProjectionEffectKind = "fire" | "poison" | "smoke" | "mist" | "ice" | "lightning" | "darkness";
export type ProjectionEffectGeometry = "square" | "circle" | "spray" | "polygon";
export type ProjectionEffect = { id: string; floorId: string; kind: ProjectionEffectKind; geometry: ProjectionEffectGeometry; polygon: NormPolygon; color: string; opacity: number; visible: boolean; scale: number };
export type ProjectionEffects = { draft: ProjectionEffect[]; published: ProjectionEffect[] | null; dayNight: "day" | "night" };
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const colors: Record<ProjectionEffectKind, string> = { fire: "#f97316", poison: "#84cc16", smoke: "#94a3b8", mist: "#cbd5e1", ice: "#67e8f9", lightning: "#fde047", darkness: "#111827" };
export function makeEffectPolygon(geometry: ProjectionEffectGeometry, start: NormPoint, end: NormPoint): NormPolygon {
  const x1 = Math.min(start.x, end.x), x2 = Math.max(start.x, end.x), y1 = Math.min(start.y, end.y), y2 = Math.max(start.y, end.y);
  if (geometry === "circle") { const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2, rx = Math.max(.015, Math.abs(end.x - start.x) / 2), ry = Math.max(.015, Math.abs(end.y - start.y) / 2); return Array.from({ length: 20 }, (_, i) => ({ x: clamp(cx + Math.cos(i * Math.PI * 2 / 20) * rx), y: clamp(cy + Math.sin(i * Math.PI * 2 / 20) * ry) })); }
  if (geometry === "spray") { const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2, rx = Math.max(.02, Math.abs(end.x - start.x) / 2), ry = Math.max(.02, Math.abs(end.y - start.y) / 2); return Array.from({ length: 14 }, (_, i) => ({ x: clamp(cx + Math.cos(i * 2.4) * rx * (0.55 + (i % 3) / 4)), y: clamp(cy + Math.sin(i * 2.4) * ry * (0.55 + (i % 4) / 5)) })); }
  return [{ x: clamp(x1), y: clamp(y1) }, { x: clamp(x2), y: clamp(y1) }, { x: clamp(x2), y: clamp(y2) }, { x: clamp(x1), y: clamp(y2) }];
}
const effectsOf = (scene: TacticalScene) => scene.effects ?? { draft: [], published: null, dayNight: "day" as const };
export function addProjectionEffect(scene: TacticalScene, floorId: string, kind: ProjectionEffectKind, geometry: ProjectionEffectGeometry, polygon: NormPolygon): TacticalScene { const effect: ProjectionEffect = { id: `effect-${crypto.randomUUID()}`, floorId, kind, geometry, polygon, color: colors[kind], opacity: .72, visible: true, scale: 1 }; const effects = effectsOf(scene); return { ...scene, effects: { ...effects, draft: [...effects.draft, effect] } }; }
export function updateProjectionEffect(scene: TacticalScene, effectId: string, patch: Partial<Pick<ProjectionEffect, "polygon" | "visible" | "opacity" | "scale">>): TacticalScene { const effects = effectsOf(scene); return { ...scene, effects: { ...effects, draft: effects.draft.map((effect) => effect.id === effectId ? { ...effect, ...patch, opacity: patch.opacity === undefined ? effect.opacity : clamp(patch.opacity), scale: patch.scale === undefined ? effect.scale : Math.max(.25, Math.min(4, patch.scale)) } : effect) } }; }
export function removeProjectionEffect(scene: TacticalScene, effectId: string): TacticalScene { const effects = effectsOf(scene); return { ...scene, effects: { ...effects, draft: effects.draft.filter((effect) => effect.id !== effectId) } }; }
export function publishProjectionEffects(scene: TacticalScene): TacticalScene { const effects = effectsOf(scene); return { ...scene, effects: { ...effects, published: structuredClone(effects.draft) } }; }
export function setProjectionDayNight(scene: TacticalScene, dayNight: "day" | "night"): TacticalScene { const effects = effectsOf(scene); return { ...scene, effects: { ...effects, dayNight } }; }
