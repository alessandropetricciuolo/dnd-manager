import type { AiAssistantArtifact } from "./contracts";

export type MissionBatchResult = { artifactId: string; title: string; status: "ready" | "saved" | "error"; message?: string };

export function isMissionDraftArtifact(artifact: AiAssistantArtifact): boolean {
  return artifact.payload.actionName === "mission.create" && ["draft", "ready_for_review", "failed", "saving"].includes(artifact.status);
}

export function restoreMissionDrafts(artifacts: AiAssistantArtifact[]): AiAssistantArtifact[] {
  const latest = new Map<string, AiAssistantArtifact>();
  for (const artifact of artifacts) {
    if (!isMissionDraftArtifact(artifact)) continue;
    const origin = typeof artifact.payload.actionInput === "object" && artifact.payload.actionInput && !Array.isArray(artifact.payload.actionInput)
      ? (artifact.payload.actionInput as Record<string, unknown>).originPlanArtifactId
      : null;
    const proposalId = typeof artifact.payload.actionInput === "object" && artifact.payload.actionInput && !Array.isArray(artifact.payload.actionInput)
      ? (artifact.payload.actionInput as Record<string, unknown>).proposalId
      : null;
    if (typeof origin !== "string" || !origin || typeof proposalId !== "string") continue;
    const key = `${origin}:${proposalId}`;
    const current = latest.get(key);
    if (!current || current.revision < artifact.revision) latest.set(key, artifact);
  }
  return [...latest.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function missionBatchResults(artifacts: AiAssistantArtifact[], results: Array<{ artifactId: string; ok: boolean; error?: string }>, saved: Set<string>): MissionBatchResult[] {
  return artifacts.map((artifact) => {
    const result = results.find((item) => item.artifactId === artifact.id);
    if (saved.has(artifact.id)) return { artifactId: artifact.id, title: String(artifact.payload.title ?? "Missione"), status: "saved" as const };
    if (result && !result.ok) return { artifactId: artifact.id, title: String(artifact.payload.title ?? "Missione"), status: "error" as const, message: result.error ?? "Salvataggio non riuscito." };
    return { artifactId: artifact.id, title: String(artifact.payload.title ?? "Missione"), status: "ready" as const };
  });
}
