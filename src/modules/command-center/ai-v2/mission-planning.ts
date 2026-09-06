import type { AiAssistantArtifact } from "./contracts";

export type MissionProposal = { id: string; grade: string; title: string; premise: string; committente: string; ubicazione: string; canonicalReferences: string[] };
export function isLongCampaignContext(context: string | undefined) { return /TIPO CAMPAGNA\s*:\s*long\b/i.test(context ?? ""); }
export function looksLikeMissionPackage(message: string) { return /\b(?:missioni|missione|quest)\b/i.test(message) && /\b(?:\d+|un[ae]?)\b/i.test(message); }
export function normalizeMissionProposals(value: unknown): MissionProposal[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).flatMap((item, index) => { if (!item || typeof item !== "object" || Array.isArray(item)) return []; const row = item as Record<string, unknown>; const s = (key: string) => typeof row[key] === "string" ? String(row[key]).trim() : ""; const title = s("title"); if (!title) return []; const refs = Array.isArray(row.canonicalReferences) ? row.canonicalReferences.filter((x): x is string => typeof x === "string") : []; return [{ id: s("id") || `proposal-${index + 1}`, grade: s("grade"), title, premise: s("premise"), committente: s("committente"), ubicazione: s("ubicazione"), canonicalReferences: refs }]; });
}
export function isMissionPlanArtifact(artifact: AiAssistantArtifact | null) { return Boolean(artifact && (artifact.kind === "mission_plan" || artifact.payload.planOnly === true)); }

export function extractMissionProposalSelection(message: string, proposals: MissionProposal[]): string[] {
  const match = message.match(/(?:(?:propost[ae]|mission[ie])\s*)?(?:numero|n\.?|#|selezion(?:a|o)|sviluppa|approva)\s*(?:(?:le|la|i|gli|il)\s+)?(?:propost[ae]|mission[ie])?\s*([\d\s, e-]+)/i) ?? message.match(/(?:propost[ae]|mission[ie])\s*([\d\s, e-]+)/i);
  if (!match) return [];
  const indexes = [...match[1].matchAll(/\d+/g)].map((m) => Number(m[0]) - 1).filter((i) => i >= 0 && i < proposals.length);
  return [...new Set(indexes)].map((i) => proposals[i].id);
}

export function validateMissionEvidenceIds(value: unknown, evidenceIds: Set<string>): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && evidenceIds.has(item)) : [];
}
