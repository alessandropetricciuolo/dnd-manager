"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTenantAdapter } from "@/modules/command-center/adapters";
import { executeAction } from "@/modules/command-center/actions";
import { runAiDraftAssistant } from "@/modules/command-center/ai-control-plane/draft-assistant";
import { runAiChatAssistant, type AiChatAssistantResult } from "@/modules/command-center/ai-control-plane/chat-assistant";
import type {
  RunAiDraftAssistantParams,
  RunAiChatAssistantParams,
} from "@/modules/command-center/ai-control-plane/draft-assistant.types";
import type {
  CommandLinkRow,
  CommandNoteRow,
  CommandNoteStatus,
  WorkspacePageRow,
  WorkspaceTaskPriority,
  WorkspaceTaskRow,
  WorkspaceTaskStatus,
  WorkspacePageType,
  AppAuditEventRow,
  AiActionRequestRow,
  AiDraftAssistantResult,
} from "@/modules/command-center/types";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function getAuthSupabase() {
  const adapter = getTenantAdapter();
  const supabase = await createSupabaseServerClient();
  const access = await adapter.assertCanAccessCommandCenter(supabase);
  if (!access.ok) return { ok: false as const, error: access.error };
  return { ok: true as const, supabase, ctx: access.ctx, adapter };
}

function mapRegistryError<T>(result: { success: true; data: T } | { success: false; error: string }): ActionResult<T> {
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

// ---------- Notes ----------

export async function listCommandNotesAction(
  campaignId?: string | null,
  status?: CommandNoteStatus | "all"
): Promise<ActionResult<CommandNoteRow[]>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  let query = auth.supabase
    .from("command_notes")
    .select("*")
    .eq("created_by", auth.ctx.userId)
    .order("updated_at", { ascending: false });

  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (status && status !== "all") query = query.eq("status", status);
  else query = query.neq("status", "archived");

  const { data, error } = await query;
  if (error) {
    console.error("[listCommandNotesAction]", error);
    return { success: false, error: error.message };
  }
  return { success: true, data: (data ?? []) as CommandNoteRow[] };
}

export async function getCommandNoteAction(noteId: string): Promise<ActionResult<CommandNoteRow>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("command_notes")
    .select("*")
    .eq("id", noteId)
    .eq("created_by", auth.ctx.userId)
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Nota non trovata." };
  }
  return { success: true, data: data as CommandNoteRow };
}

export async function createCommandNoteAction(input: {
  title?: string;
  content: string;
  campaignId?: string | null;
  status?: CommandNoteStatus;
  source?: "manual" | "voice" | "text";
  transcript?: string | null;
  language?: string;
  inputMetadata?: Record<string, unknown>;
}): Promise<ActionResult<CommandNoteRow>> {
  return mapRegistryError(
    await executeAction<CommandNoteRow>("command.note.create", {
      title: input.title,
      content: input.content,
      campaignId: input.campaignId ?? null,
      status: input.status ?? "inbox",
      source: input.source ?? "manual",
      transcript: input.transcript ?? null,
      language: input.language ?? "it",
      inputMetadata: input.inputMetadata ?? {},
    })
  );
}

export async function updateCommandNoteAction(
  noteId: string,
  patch: {
    title?: string;
    content?: string;
    status?: CommandNoteStatus;
    campaignId?: string | null;
  }
): Promise<ActionResult<CommandNoteRow>> {
  return mapRegistryError(
    await executeAction<CommandNoteRow>("command.note.update", { noteId, patch })
  );
}

// ---------- Tasks ----------

export async function listWorkspaceTasksAction(
  campaignId?: string | null
): Promise<ActionResult<WorkspaceTaskRow[]>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  let query = auth.supabase
    .from("workspace_tasks")
    .select("*")
    .eq("created_by", auth.ctx.userId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error } = await query;
  if (error) {
    console.error("[listWorkspaceTasksAction]", error);
    return { success: false, error: error.message };
  }
  return { success: true, data: (data ?? []) as WorkspaceTaskRow[] };
}

export async function createWorkspaceTaskAction(input: {
  title: string;
  description?: string;
  campaignId?: string | null;
  sessionId?: string | null;
  priority?: WorkspaceTaskPriority;
  dueDate?: string | null;
  sourceNoteId?: string | null;
}): Promise<ActionResult<WorkspaceTaskRow>> {
  return mapRegistryError(
    await executeAction<WorkspaceTaskRow>("workspace.task.create", input)
  );
}

export async function updateWorkspaceTaskAction(
  taskId: string,
  patch: {
    title?: string;
    description?: string;
    status?: WorkspaceTaskStatus;
    priority?: WorkspaceTaskPriority;
    dueDate?: string | null;
    campaignId?: string | null;
  }
): Promise<ActionResult<WorkspaceTaskRow>> {
  return mapRegistryError(
    await executeAction<WorkspaceTaskRow>("workspace.task.update", { taskId, patch })
  );
}

// ---------- Pages ----------

export async function listWorkspacePagesAction(
  campaignId?: string | null
): Promise<ActionResult<WorkspacePageRow[]>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  let query = auth.supabase
    .from("workspace_pages")
    .select("*")
    .eq("created_by", auth.ctx.userId)
    .order("updated_at", { ascending: false });

  if (campaignId) query = query.eq("campaign_id", campaignId);

  const { data, error } = await query;
  if (error) {
    console.error("[listWorkspacePagesAction]", error);
    return { success: false, error: error.message };
  }
  return { success: true, data: (data ?? []) as WorkspacePageRow[] };
}

export async function createWorkspacePageAction(input: {
  title: string;
  contentMarkdown?: string;
  campaignId?: string | null;
  pageType?: WorkspacePageType;
}): Promise<ActionResult<WorkspacePageRow>> {
  return mapRegistryError(
    await executeAction<WorkspacePageRow>("workspace.page.create", input)
  );
}

export async function updateWorkspacePageAction(
  pageId: string,
  patch: {
    title?: string;
    contentMarkdown?: string;
    pageType?: WorkspacePageType;
    campaignId?: string | null;
  }
): Promise<ActionResult<WorkspacePageRow>> {
  return mapRegistryError(
    await executeAction<WorkspacePageRow>("workspace.page.update", { pageId, patch })
  );
}

// ---------- Links ----------

export async function listCommandLinksForNoteAction(
  noteId: string
): Promise<ActionResult<CommandLinkRow[]>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("command_links")
    .select("*")
    .eq("note_id", noteId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listCommandLinksForNoteAction]", error);
    return { success: false, error: error.message };
  }
  return { success: true, data: (data ?? []) as CommandLinkRow[] };
}

export async function createCommandLinkAction(input: {
  noteId: string;
  entityType: string;
  entityId: string;
  campaignId?: string | null;
}): Promise<ActionResult<CommandLinkRow>> {
  return mapRegistryError(
    await executeAction<CommandLinkRow>("command.link.create", input)
  );
}

export async function deleteCommandLinkAction(linkId: string): Promise<ActionResult> {
  const result = await executeAction("command.link.delete", { linkId });
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

// ---------- Audit ----------

export async function listAuditEventsAction(
  limit = 30
): Promise<ActionResult<AppAuditEventRow[]>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("app_audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(100, Math.max(1, limit)));

  if (error) {
    console.error("[listAuditEventsAction]", error);
    return { success: false, error: error.message };
  }
  return { success: true, data: (data ?? []) as AppAuditEventRow[] };
}

// ---------- Pickers ----------

export async function listCampaignsForCommandCenterAction(): Promise<
  ActionResult<{ id: string; name: string }[]>
> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const campaigns = await auth.adapter.listCampaignsForPicker(auth.supabase);
  return { success: true, data: campaigns };
}

export async function listSessionsForCommandCenterAction(
  campaignId: string
): Promise<ActionResult<{ id: string; title: string | null; scheduled_at: string }[]>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("sessions")
    .select("id, title, scheduled_at")
    .eq("campaign_id", campaignId)
    .order("scheduled_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[listSessionsForCommandCenterAction]", error);
    return { success: false, error: error.message };
  }
  return { success: true, data: data ?? [] };
}

export async function listWikiEntitiesForCommandCenterAction(
  campaignId: string
): Promise<ActionResult<{ id: string; name: string; type: string }[]>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("wiki_entities")
    .select("id, name, type")
    .eq("campaign_id", campaignId)
    .order("name", { ascending: true })
    .limit(200);

  if (error) {
    console.error("[listWikiEntitiesForCommandCenterAction]", error);
    return { success: false, error: error.message };
  }
  return { success: true, data: data ?? [] };
}

export async function resolveCommandLinkLabelsAction(
  links: { entity_type: string; entity_id: string }[]
): Promise<ActionResult<Record<string, string>>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const labels: Record<string, string> = {};

  for (const link of links) {
    const key = `${link.entity_type}:${link.entity_id}`;
    if (link.entity_type === "campaign") {
      const { data } = await auth.supabase.from("campaigns").select("name").eq("id", link.entity_id).maybeSingle();
      labels[key] = (data as { name?: string } | null)?.name ?? link.entity_id.slice(0, 8);
    } else if (link.entity_type === "session") {
      const { data } = await auth.supabase.from("sessions").select("title, scheduled_at").eq("id", link.entity_id).maybeSingle();
      const row = data as { title?: string | null; scheduled_at?: string } | null;
      labels[key] = row?.title ?? new Date(row?.scheduled_at ?? "").toLocaleDateString("it-IT");
    } else if (link.entity_type === "mission" || link.entity_type === "quest") {
      const { data } = await auth.supabase.from("campaign_missions").select("title").eq("id", link.entity_id).maybeSingle();
      labels[key] = (data as { title?: string } | null)?.title ?? "Missione";
    } else {
      const { data } = await auth.supabase.from("wiki_entities").select("name, type").eq("id", link.entity_id).maybeSingle();
      const row = data as { name?: string; type?: string } | null;
      labels[key] = row ? `${row.name} (${row.type})` : "Wiki";
    }
  }

  return { success: true, data: labels };
}

// ---------- AI Draft (Fase 3) ----------

export async function runAiDraftAssistantAction(
  input: RunAiDraftAssistantParams
): Promise<ActionResult<AiDraftAssistantResult>> {
  const result = await runAiDraftAssistant(input);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function runAiChatAssistantAction(
  input: RunAiChatAssistantParams
): Promise<ActionResult<AiChatAssistantResult>> {
  const result = await runAiChatAssistant(input);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: result.data };
}

export async function listAiProposalsAction(
  campaignId?: string | null,
  status: "proposed" | "all" = "proposed"
): Promise<ActionResult<AiActionRequestRow[]>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  let query = auth.supabase
    .from("ai_action_requests")
    .select("*")
    .eq("requested_by", auth.ctx.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (campaignId) query = query.eq("campaign_id", campaignId);
  if (status === "proposed") query = query.eq("status", "proposed");

  const { data, error } = await query;
  if (error) {
    console.error("[listAiProposalsAction]", error);
    return { success: false, error: error.message };
  }
  return { success: true, data: (data ?? []) as AiActionRequestRow[] };
}

export async function rejectAiProposalAction(proposalId: string): Promise<ActionResult> {
  const result = await executeAction("ai.proposal.reject", { proposalId });
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

export async function executeAiProposalAction(proposalId: string): Promise<
  ActionResult<{ proposalId: string; actionName: string; result: unknown }>
> {
  const result = await executeAction<{ proposalId: string; actionName: string; result: unknown }>(
    "ai.proposal.execute",
    { proposalId }
  );
  if (!result.success) return { success: false, error: result.error };
  return { success: true, data: result.data };
}
