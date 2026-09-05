export type AiAssistantIntent = "answer" | "create" | "revise" | "generate_image" | "save" | "discard" | "ask_clarification";
export type AiAssistantArtifactStatus = "draft" | "ready_for_review" | "approved" | "saving" | "saved" | "discarded" | "failed";
export type AiAssistantArtifactKind = "narrative" | "wiki" | "image" | "rules" | "sheet" | "action";

export type AiAssistantSourceRef = { evidenceId: string; sourceType: string; sourceId: string; title: string; href: string; similarity: number | null };
/**
 * Artifacts are immutable revisions. `parentArtifactId` points at the exact
 * previous revision, rather than at a mutable row, so a conversational edit
 * can always be audited and safely retried.
 */
export type AiAssistantArtifact = { id: string; threadId: string; campaignId: string | null; kind: AiAssistantArtifactKind; status: AiAssistantArtifactStatus; revision: number; parentArtifactId: string | null; payload: Record<string, unknown>; sourceRefs: AiAssistantSourceRef[]; policyVersion: string | null; savedEntity: { type: string; id: string } | null };
export type AiAssistantThread = { id: string; ownerUserId: string; campaignId: string | null; mode: "v2_pilot"; status: "active" | "archived"; stateVersion: number; title: string | null; summary: string | null; };
export type AiAssistantTurn = { id: string; threadId: string; sequence: number; role: "user" | "assistant"; content: string; intent: AiAssistantIntent | null; artifactIds: string[]; createdAt: string; };
export type AiAssistantTurnResult = { threadId: string; assistantMessage: string; intent: AiAssistantIntent; evidence: AiAssistantSourceRef[]; artifactOperations: Array<{ op: "create"; artifact: AiAssistantArtifact } | { op: "revise"; artifactId: string; patch: Array<{ op: "replace"; path: string; value: unknown }>; } | { op: "request_confirmation"; artifactId: string; actionName: string }>; clarification: { required: boolean; question: string | null }; artifact?: AiAssistantArtifact; };
