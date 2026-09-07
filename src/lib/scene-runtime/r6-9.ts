import { adaptLegacyToTacticalScene, type LegacyExplorationMapRow, type LegacyFowRegionRow, type LegacySceneDocumentRow, type LegacyReadReport } from "./legacy-read-adapter";
import type { TacticalScene } from "./types";

/** R6.9 rollout is opt-in per campaign; legacy routes remain authoritative. */
export type TacticalSceneFeatureFlag = { campaignId: string; enabled: boolean; legacyReadOnly: true };

export function isTacticalWorkspaceEnabled(
  flag: TacticalSceneFeatureFlag | undefined,
  campaignId: string,
): boolean {
  return Boolean(flag?.campaignId === campaignId && flag.enabled && flag.legacyReadOnly);
}

export type TacticalSyncStatus = "connecting" | "connected" | "reconnecting" | "offline";
export type TacticalSyncEvent = { status: TacticalSyncStatus; reloadRequired: boolean; message: string };

/** Realtime is only a hint; every reconnect requires a server snapshot reload. */
export function classifyTacticalRealtimeStatus(status: string): TacticalSyncEvent {
  if (status === "SUBSCRIBED") return { status: "connected", reloadRequired: false, message: "Sincronizzazione live attiva." };
  if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") return { status: "reconnecting", reloadRequired: true, message: "Connessione live interrotta: recupero lo snapshot…" };
  if (status === "CLOSED") return { status: "offline", reloadRequired: true, message: "Canale live chiuso: il prossimo collegamento rileggerà lo snapshot." };
  return { status: "connecting", reloadRequired: false, message: "Connessione live in corso…" };
}

export type TacticalActionErrorKind = "forbidden" | "conflict" | "missing" | "placeholder" | "network" | "invalid" | "unknown";

export function classifyTacticalActionError(message: string): TacticalActionErrorKind {
  const value = message.toLowerCase();
  if (value.includes("forbidden") || value.includes("solo gm") || value.includes("autenticazione")) return "forbidden";
  if (value.includes("conflict") || value.includes("conflitto") || value.includes("revision")) return "conflict";
  if (value.includes("not_found") || value.includes("non trovata") || value.includes("inesistente")) return "missing";
  if (value.includes("placeholder") || value.includes("mappa obbligatoria")) return "placeholder";
  if (value.includes("invalid") || value.includes("non valido")) return "invalid";
  if (value.includes("network") || value.includes("fetch") || value.includes("failed") || value.includes("timeout")) return "network";
  return "unknown";
}

export type LegacyBackfillItem = {
  key: string;
  legacySceneId: string;
  checksum: string;
  scene?: TacticalScene;
  report: LegacyReadReport;
  state: "ready" | "blocked";
  rollback: { legacySceneId: string; tacticalSceneId: string | null };
};

export type LegacyBackfillPlan = { items: LegacyBackfillItem[]; orphans: string[]; ambiguities: string[] };

// Stable, dependency-free checksum used to make reruns idempotent and auditable.
function checksum(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Pure, read-only backfill planner. It never mutates legacy rows or creates DB records. */
export function planLegacyBackfill(input: {
  sceneDocuments: LegacySceneDocumentRow[];
  explorationMaps: LegacyExplorationMapRow[];
  fowRegions: LegacyFowRegionRow[];
}): LegacyBackfillPlan {
  const items: LegacyBackfillItem[] = [];
  const orphans: string[] = [];
  const ambiguities: string[] = [];
  const seen = new Set<string>();
  for (const sceneDocument of input.sceneDocuments) {
    const key = `${sceneDocument.id}:${sceneDocument.document_version}`;
    if (seen.has(key)) { ambiguities.push(`duplicate:${key}`); continue; }
    seen.add(key);
    const maps = input.explorationMaps.filter((map) => map.scene_document_id === sceneDocument.id);
    const result = adaptLegacyToTacticalScene({ sceneDocument, explorationMaps: maps, fowRegions: input.fowRegions });
    const report = result.report;
    report.entries.filter((entry) => entry.severity === "orphan").forEach((entry) => orphans.push(`${sceneDocument.id}:${entry.code}`));
    report.entries.filter((entry) => entry.severity === "ambiguity").forEach((entry) => ambiguities.push(`${sceneDocument.id}:${entry.code}`));
    const state = result.scene ? "ready" : "blocked";
    items.push({ key, legacySceneId: sceneDocument.id, checksum: checksum({ sceneDocument, maps, fow: input.fowRegions }), scene: result.scene, report, state, rollback: { legacySceneId: sceneDocument.id, tacticalSceneId: null } });
  }
  input.explorationMaps.filter((map) => !map.scene_document_id || !seen.has(`${map.scene_document_id}:1`) && !input.sceneDocuments.some((scene) => scene.id === map.scene_document_id)).forEach((map) => orphans.push(`map:${map.id}`));
  return { items, orphans: [...new Set(orphans)].sort(), ambiguities: [...new Set(ambiguities)].sort() };
}

export function canApplyBackfillItem(item: LegacyBackfillItem, existingChecksum?: string): boolean {
  return item.state === "ready" && item.scene !== undefined && existingChecksum !== item.checksum;
}

/** Rollback is record-scoped and intentionally returns the exact target only. */
export function rollbackBackfillItem(item: LegacyBackfillItem): LegacyBackfillItem["rollback"] {
  return { ...item.rollback };
}
