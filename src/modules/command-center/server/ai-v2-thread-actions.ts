"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { getTenantAdapter } from "@/modules/command-center/adapters";
import { checkAiAssistantV2PilotAccess } from "../ai-v2/access";

type Result<T> = { success: true; data: T } | { success: false; error: string };
type Thread = Record<string, unknown>;

async function guard(campaignId: string | null) {
  const supabase = await createSupabaseServerClient();
  const access = await getTenantAdapter().assertCanAccessCommandCenter(supabase);
  if (!access.ok) return { ok: false as const, error: access.error };
  const role = access.ctx.role === "admin" ? "admin" : access.ctx.role === "gm" ? "gm" : null;
  if (!role) return { ok: false as const, error: "Solo GM e Admin possono usare l'Assistente GM v2." };
  if (role === "gm" && !campaignId) return { ok: false as const, error: "Seleziona una campagna." };
  if (role === "gm" && campaignId) {
    const { data, error } = await supabase.rpc("can_manage_campaign_as_gm", { p_campaign_id: campaignId });
    if (error || data !== true) return { ok: false as const, error: "Non sei autorizzato a gestire questa campagna." };
  }
  const entitlement = await checkAiAssistantV2PilotAccess(createSupabaseAdminClient(), { userId: access.ctx.userId, role, campaignId });
  if (!entitlement.ok) return { ok: false as const, error: entitlement.error };
  return { ok: true as const, supabase: createSupabaseAdminClient(), userId: access.ctx.userId, role };
}

async function authenticateAny() {
  const supabase = await createSupabaseServerClient();
  const access = await getTenantAdapter().assertCanAccessCommandCenter(supabase);
  if (!access.ok) return { ok: false as const, error: access.error };
  const role = access.ctx.role === "admin" ? "admin" : access.ctx.role === "gm" ? "gm" : null;
  if (!role) return { ok: false as const, error: "Solo GM e Admin possono usare l'Assistente GM v2." };
  return { ok: true as const, userId: access.ctx.userId, role };
}

export async function createAiAssistantV2Thread(input: { campaignId: string | null }): Promise<Result<Thread>> {
  const checked = await guard(input.campaignId);
  if (!checked.ok) return { success: false, error: checked.error };
  const { data, error } = await checked.supabase.from("ai_assistant_threads").insert({ owner_user_id: checked.userId, campaign_id: input.campaignId, mode: "v2_pilot", status: "active", state_version: 1, title: null } as never).select("*").single();
  if (error || !data) return { success: false, error: "Non è stato possibile creare la conversazione." };
  return { success: true, data: data as unknown as Thread };
}

export async function listAiAssistantV2Threads(input: { campaignId: string | null; includeArchived?: boolean }): Promise<Result<Thread[]>> {
  const checked = await guard(input.campaignId);
  if (!checked.ok) return { success: false, error: checked.error };
  let query = checked.supabase.from("ai_assistant_threads").select("*").order("updated_at", { ascending: false }).limit(50);
  if (input.campaignId) query = query.eq("campaign_id", input.campaignId);
  if (!input.includeArchived) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) return { success: false, error: "Non è stato possibile caricare la cronologia." };
  return { success: true, data: (data ?? []) as unknown as Thread[] };
}

export async function getAiAssistantV2Thread(input: { threadId: string }): Promise<Result<{ thread: Thread; turns: Thread[]; artifacts: Thread[] }>> {
  const actor = await authenticateAny();
  if (!actor.ok) return { success: false, error: actor.error };
  const supabase = createSupabaseAdminClient();
  let threadQuery = supabase.from("ai_assistant_threads").select("*").eq("id", input.threadId);
  if (actor.role !== "admin") threadQuery = threadQuery.eq("owner_user_id", actor.userId);
  const { data: thread, error } = await threadQuery.maybeSingle();
  if (error || !thread) return { success: false, error: "Conversazione non trovata." };
  const checked = await guard((thread as Thread).campaign_id as string | null);
  if (!checked.ok) return { success: false, error: checked.error };
  if ((thread as Thread).owner_user_id !== actor.userId && actor.role !== "admin") return { success: false, error: "Conversazione non autorizzata." };
  const [turns, artifacts] = await Promise.all([
    supabase.from("ai_assistant_turns").select("*").eq("thread_id", input.threadId).order("sequence", { ascending: true }),
    supabase.from("ai_assistant_artifacts").select("*").eq("thread_id", input.threadId).order("created_at", { ascending: true }),
  ]);
  if (turns.error || artifacts.error) return { success: false, error: "Non è stato possibile riprendere la conversazione." };
  return { success: true, data: { thread: thread as unknown as Thread, turns: (turns.data ?? []) as unknown as Thread[], artifacts: (artifacts.data ?? []) as unknown as Thread[] } };
}

async function mutateThread(input: { threadId: string; patch: Record<string, unknown> }): Promise<Result<Thread>> {
  const current = await getAiAssistantV2Thread({ threadId: input.threadId });
  if (!current.success) return current;
  const checked = await guard((current.data.thread.campaign_id as string | null) ?? null);
  if (!checked.ok) return { success: false, error: checked.error };
  const currentVersion = Number(current.data.thread.state_version ?? 0);
  const { data, error } = await checked.supabase.from("ai_assistant_threads").update({ ...input.patch, state_version: currentVersion + 1 } as never).eq("id", input.threadId).eq("state_version", currentVersion).select("*").maybeSingle();
  if (error || !data) return { success: false, error: "La conversazione è cambiata: ricarica prima di continuare." };
  return { success: true, data: data as unknown as Thread };
}

export async function renameAiAssistantV2Thread(input: { threadId: string; title: string }) {
  const title = input.title.trim();
  if (!title || title.length > 120) return { success: false as const, error: "Il titolo deve contenere da 1 a 120 caratteri." };
  return mutateThread({ threadId: input.threadId, patch: { title } });
}

export async function archiveAiAssistantV2Thread(input: { threadId: string; archived: boolean }) {
  return mutateThread({ threadId: input.threadId, patch: { status: input.archived ? "archived" : "active" } });
}

export async function feedbackAiAssistantV2(input: { artifactId?: string; turnId?: string; rating: "approved" | "needs_review" | "incorrect"; note?: string }) {
  if (!input.artifactId && !input.turnId) return { success: false as const, error: "Indica una bozza o un messaggio." };
  if ((input.note ?? "").length > 2000) return { success: false as const, error: "La nota è troppo lunga." };
  const actor = await authenticateAny();
  if (!actor.ok) return { success: false as const, error: actor.error };
  const db = createSupabaseAdminClient();
  let campaignId: string | null = null;
  let targetThreadId: string | null = null;
  if (input.artifactId) {
    const { data } = await db.from("ai_assistant_artifacts").select("campaign_id, thread_id").eq("id", input.artifactId).maybeSingle();
    campaignId = (data as { campaign_id?: string | null; thread_id?: string | null } | null)?.campaign_id ?? null;
    targetThreadId = (data as { thread_id?: string | null } | null)?.thread_id ?? null;
  } else if (input.turnId) {
    const { data } = await db.from("ai_assistant_turns").select("thread_id").eq("id", input.turnId).maybeSingle();
    const turnRow = data as { thread_id?: string } | null;
    if (turnRow?.thread_id) {
      targetThreadId = turnRow.thread_id;
      const { data: thread } = await db.from("ai_assistant_threads").select("campaign_id").eq("id", turnRow.thread_id).maybeSingle();
      campaignId = (thread as { campaign_id?: string | null } | null)?.campaign_id ?? null;
    }
  }
  if (!targetThreadId) return { success: false as const, error: "Bozza o messaggio non trovato." };
  const { data: targetThread } = await db.from("ai_assistant_threads").select("owner_user_id").eq("id", targetThreadId).maybeSingle();
  const targetOwner = (targetThread as { owner_user_id?: string } | null)?.owner_user_id;
  if (!targetOwner || (actor.role !== "admin" && targetOwner !== actor.userId)) return { success: false as const, error: "Feedback non autorizzato." };
  const checked = await guard(campaignId);
  if (!checked.ok) return { success: false, error: checked.error };
  const { error } = await checked.supabase.from("ai_assistant_feedback").insert({ artifact_id: input.artifactId ?? null, turn_id: input.turnId ?? null, rating: input.rating, note: input.note?.trim() || null, created_by: checked.userId } as never);
  if (error) return { success: false as const, error: "Non è stato possibile registrare il feedback." };
  return { success: true as const, data: null };
}
