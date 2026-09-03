import type { AiAssistantArtifact, AiAssistantThread, AiAssistantTurn } from "./contracts";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ThreadRepository = { getOrCreateThread(ownerUserId: string, campaignId: string | null): Promise<AiAssistantThread>; listTurns(threadId: string, limit?: number): Promise<AiAssistantTurn[]>; appendTurn(turn: Omit<AiAssistantTurn, "id" | "sequence" | "createdAt">): Promise<AiAssistantTurn>; getArtifact(id: string): Promise<AiAssistantArtifact | null>; saveArtifact(artifact: AiAssistantArtifact): Promise<AiAssistantArtifact>; createRevision(previous: AiAssistantArtifact, patch: Partial<Pick<AiAssistantArtifact, "kind" | "status" | "payload" | "sourceRefs" | "policyVersion">>): Promise<AiAssistantArtifact>; };

export class InMemoryThreadRepository implements ThreadRepository {
  threads: AiAssistantThread[] = []; turns: AiAssistantTurn[] = []; artifacts: AiAssistantArtifact[] = [];
  async getOrCreateThread(ownerUserId: string, campaignId: string | null) { let t = this.threads.find(x => x.ownerUserId === ownerUserId && x.campaignId === campaignId && x.status === "active"); if (!t) { t = { id: crypto.randomUUID(), ownerUserId, campaignId, mode: "v2_pilot", status: "active", stateVersion: 1, summary: null }; this.threads.push(t); } return t; }
  async listTurns(threadId: string, limit = 12) { return this.turns.filter(x => x.threadId === threadId).slice(-limit); }
  async appendTurn(input: Omit<AiAssistantTurn, "id" | "sequence" | "createdAt">) { const turn = { ...input, id: crypto.randomUUID(), sequence: this.turns.filter(x => x.threadId === input.threadId).length + 1, createdAt: new Date().toISOString() }; this.turns.push(turn); return turn; }
  async getArtifact(id: string) { return this.artifacts.find(x => x.id === id) ?? null; }
  async saveArtifact(a: AiAssistantArtifact) { const i = this.artifacts.findIndex(x => x.id === a.id); if (i < 0) this.artifacts.push(a); else this.artifacts[i] = a; return a; }
  async createRevision(previous: AiAssistantArtifact, patch: Partial<Pick<AiAssistantArtifact, "kind" | "status" | "payload" | "sourceRefs" | "policyVersion">>) { const revision = { ...previous, ...patch, id: crypto.randomUUID(), revision: previous.revision + 1, parentArtifactId: previous.id, savedEntity: null }; return this.saveArtifact(revision); }
}

/** Persistent repository. Authorization is still enforced by the caller and RLS. */
export class SupabaseThreadRepository implements ThreadRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async getOrCreateThread(ownerUserId: string, campaignId: string | null) {
    const existing = await this.supabase.from("ai_assistant_threads").select("*").eq("owner_user_id", ownerUserId).eq("campaign_id", campaignId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return this.fromThread(existing.data);
    const inserted = await this.supabase.from("ai_assistant_threads").insert({ owner_user_id: ownerUserId, campaign_id: campaignId, mode: "v2_pilot", status: "active", state_version: 1 }).select("*").single();
    if (inserted.error) throw inserted.error;
    return this.fromThread(inserted.data);
  }
  async listTurns(threadId: string, limit = 12) { const r = await this.supabase.from("ai_assistant_turns").select("*").eq("thread_id", threadId).order("sequence", { ascending: false }).limit(limit); if (r.error) throw r.error; return (r.data ?? []).reverse().map(this.fromTurn); }
  async appendTurn(input: Omit<AiAssistantTurn, "id" | "sequence" | "createdAt">) { const count = await this.supabase.from("ai_assistant_turns").select("sequence", { count: "exact", head: true }).eq("thread_id", input.threadId); if (count.error) throw count.error; const r = await this.supabase.from("ai_assistant_turns").insert({ thread_id: input.threadId, sequence: (count.count ?? 0) + 1, role: input.role, content: input.content, intent: input.intent, artifact_ids: input.artifactIds }).select("*").single(); if (r.error) throw r.error; return this.fromTurn(r.data); }
  async getArtifact(id: string) { const r = await this.supabase.from("ai_assistant_artifacts").select("*").eq("id", id).maybeSingle(); if (r.error) throw r.error; return r.data ? this.fromArtifact(r.data) : null; }
  async saveArtifact(a: AiAssistantArtifact) { const r = await this.supabase.from("ai_assistant_artifacts").upsert({ id: a.id, thread_id: a.threadId, campaign_id: a.campaignId, kind: a.kind, status: a.status, revision: a.revision, parent_artifact_id: a.parentArtifactId, payload: a.payload, source_refs: a.sourceRefs, policy_version: a.policyVersion, saved_entity: a.savedEntity }).select("*").single(); if (r.error) throw r.error; return this.fromArtifact(r.data); }
  async createRevision(previous: AiAssistantArtifact, patch: Partial<Pick<AiAssistantArtifact, "kind" | "status" | "payload" | "sourceRefs" | "policyVersion">>) {
    // A distinct row per revision gives an immutable parent chain. The
    // database uniqueness constraint on (parent_artifact_id, revision) turns
    // concurrent edits of the same draft into a safe conflict instead of a
    // silent overwrite.
    const next: AiAssistantArtifact = { ...previous, ...patch, id: crypto.randomUUID(), revision: previous.revision + 1, parentArtifactId: previous.id, savedEntity: null };
    const r = await this.supabase.from("ai_assistant_artifacts").insert({ id: next.id, thread_id: next.threadId, campaign_id: next.campaignId, kind: next.kind, status: next.status, revision: next.revision, parent_artifact_id: next.parentArtifactId, payload: next.payload, source_refs: next.sourceRefs, policy_version: next.policyVersion, saved_entity: null }).select("*").single();
    if (r.error) throw r.error;
    return this.fromArtifact(r.data);
  }
  private fromThread = (r: any): AiAssistantThread => ({ id: r.id, ownerUserId: r.owner_user_id, campaignId: r.campaign_id, mode: r.mode, status: r.status, stateVersion: r.state_version, summary: r.summary });
  private fromTurn = (r: any): AiAssistantTurn => ({ id: r.id, threadId: r.thread_id, sequence: r.sequence, role: r.role, content: r.content, intent: r.intent, artifactIds: r.artifact_ids ?? [], createdAt: r.created_at });
  private fromArtifact = (r: any): AiAssistantArtifact => ({ id: r.id, threadId: r.thread_id, campaignId: r.campaign_id, kind: r.kind, status: r.status, revision: r.revision, parentArtifactId: r.parent_artifact_id, payload: r.payload, sourceRefs: r.source_refs ?? [], policyVersion: r.policy_version, savedEntity: r.saved_entity });
}
