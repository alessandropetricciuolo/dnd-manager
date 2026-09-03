import type { AiAssistantArtifact } from "./contracts";
export function isRevisionCurrent(artifact: AiAssistantArtifact, revision: number): boolean { return artifact.revision === revision; }
export function assertArtifactCampaign(artifact: AiAssistantArtifact, campaignId: string | null): void { if (artifact.campaignId !== campaignId) throw new Error("Artefatto appartenente a una campagna diversa"); }
