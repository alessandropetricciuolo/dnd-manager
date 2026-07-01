"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTenantAdapter } from "@/modules/command-center/adapters";
import type {
  CommandLinkRow,
  CommandNoteRow,
  CommandNoteStatus,
  WorkspacePageRow,
  WorkspaceTaskPriority,
  WorkspaceTaskRow,
  WorkspaceTaskStatus,
  WorkspacePageType,
} from "@/modules/command-center/types";
import {
  COMMAND_LINK_ENTITY_TYPES,
  COMMAND_NOTE_STATUSES,
  WORKSPACE_TASK_PRIORITIES,
  WORKSPACE_TASK_STATUSES,
  WORKSPACE_PAGE_TYPES,
} from "@/modules/command-center/types/workspace";

const REVALIDATE_PATH = "/command-center";

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

function isCommandNoteStatus(v: string): v is CommandNoteStatus {
  return (COMMAND_NOTE_STATUSES as readonly string[]).includes(v);
}

function isTaskStatus(v: string): v is WorkspaceTaskStatus {
  return (WORKSPACE_TASK_STATUSES as readonly string[]).includes(v);
}

function isTaskPriority(v: string): v is WorkspaceTaskPriority {
  return (WORKSPACE_TASK_PRIORITIES as readonly string[]).includes(v);
}

function isPageType(v: string): v is WorkspacePageType {
  return (WORKSPACE_PAGE_TYPES as readonly string[]).includes(v);
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
}): Promise<ActionResult<CommandNoteRow>> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const content = input.content.trim();
  if (!content) return { success: false, error: "Il contenuto è obbligatorio." };

  const title =
    input.title?.trim() ||
    content.split("\n")[0]?.slice(0, 120) ||
    "Nota senza titolo";

  const { data: inputRow, error: inputErr } = await auth.supabase
    .from("command_inputs")
    .insert({
      workspace_id: auth.adapter.resolveWorkspaceId(),
      campaign_id: input.campaignId ?? null,
      source: "manual",
      raw_content: content,
      created_by: auth.ctx.userId,
    })
    .select("id")
    .single();

  if (inputErr) {
    console.error("[createCommandNoteAction] input", inputErr);
    return { success: false, error: inputErr.message };
  }

  const { data, error } = await auth.supabase
    .from("command_notes")
    .insert({
      workspace_id: auth.adapter.resolveWorkspaceId(),
      campaign_id: input.campaignId ?? null,
      title,
      content,
      status: input.status ?? "inbox",
      source_input_id: inputRow.id,
      created_by: auth.ctx.userId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createCommandNoteAction]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: data as CommandNoteRow };
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
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.content !== undefined) update.content = patch.content;
  if (patch.status !== undefined) {
    if (!isCommandNoteStatus(patch.status)) {
      return { success: false, error: "Stato nota non valido." };
    }
    update.status = patch.status;
  }
  if (patch.campaignId !== undefined) update.campaign_id = patch.campaignId;

  const { data, error } = await auth.supabase
    .from("command_notes")
    .update(update)
    .eq("id", noteId)
    .eq("created_by", auth.ctx.userId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateCommandNoteAction]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: data as CommandNoteRow };
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
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const title = input.title.trim();
  if (!title) return { success: false, error: "Il titolo è obbligatorio." };

  const { data, error } = await auth.supabase
    .from("workspace_tasks")
    .insert({
      workspace_id: auth.adapter.resolveWorkspaceId(),
      campaign_id: input.campaignId ?? null,
      session_id: input.sessionId ?? null,
      title,
      description: input.description?.trim() ?? "",
      priority: input.priority ?? "medium",
      due_date: input.dueDate ?? null,
      source_note_id: input.sourceNoteId ?? null,
      created_by: auth.ctx.userId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createWorkspaceTaskAction]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: data as WorkspaceTaskRow };
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
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.status !== undefined) {
    if (!isTaskStatus(patch.status)) return { success: false, error: "Stato task non valido." };
    update.status = patch.status;
  }
  if (patch.priority !== undefined) {
    if (!isTaskPriority(patch.priority)) return { success: false, error: "Priorità non valida." };
    update.priority = patch.priority;
  }
  if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
  if (patch.campaignId !== undefined) update.campaign_id = patch.campaignId;

  const { data, error } = await auth.supabase
    .from("workspace_tasks")
    .update(update)
    .eq("id", taskId)
    .eq("created_by", auth.ctx.userId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateWorkspaceTaskAction]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: data as WorkspaceTaskRow };
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
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const title = input.title.trim();
  if (!title) return { success: false, error: "Il titolo è obbligatorio." };
  const pageType = input.pageType ?? "note";
  if (!isPageType(pageType)) return { success: false, error: "Tipo pagina non valido." };

  const { data, error } = await auth.supabase
    .from("workspace_pages")
    .insert({
      workspace_id: auth.adapter.resolveWorkspaceId(),
      campaign_id: input.campaignId ?? null,
      title,
      content_markdown: input.contentMarkdown ?? "",
      page_type: pageType,
      created_by: auth.ctx.userId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createWorkspacePageAction]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: data as WorkspacePageRow };
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
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const update: Record<string, unknown> = {};
  if (patch.title !== undefined) update.title = patch.title.trim();
  if (patch.contentMarkdown !== undefined) update.content_markdown = patch.contentMarkdown;
  if (patch.pageType !== undefined) {
    if (!isPageType(patch.pageType)) return { success: false, error: "Tipo pagina non valido." };
    update.page_type = patch.pageType;
  }
  if (patch.campaignId !== undefined) update.campaign_id = patch.campaignId;

  const { data, error } = await auth.supabase
    .from("workspace_pages")
    .update(update)
    .eq("id", pageId)
    .eq("created_by", auth.ctx.userId)
    .select("*")
    .single();

  if (error) {
    console.error("[updateWorkspacePageAction]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: data as WorkspacePageRow };
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
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!(COMMAND_LINK_ENTITY_TYPES as readonly string[]).includes(input.entityType)) {
    return { success: false, error: "Tipo entità non valido." };
  }

  const linkCheck = await auth.adapter.assertCanLinkEntity(
    auth.supabase,
    input.entityType,
    input.entityId,
    input.campaignId
  );
  if (!linkCheck.ok) return { success: false, error: linkCheck.error };

  const { data: note } = await auth.supabase
    .from("command_notes")
    .select("id")
    .eq("id", input.noteId)
    .eq("created_by", auth.ctx.userId)
    .maybeSingle();
  if (!note) return { success: false, error: "Nota non trovata." };

  const { data, error } = await auth.supabase
    .from("command_links")
    .insert({
      workspace_id: auth.adapter.resolveWorkspaceId(),
      note_id: input.noteId,
      entity_type: input.entityType,
      entity_id: input.entityId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[createCommandLinkAction]", error);
    return { success: false, error: error.message };
  }

  await auth.supabase
    .from("command_notes")
    .update({ status: "linked" })
    .eq("id", input.noteId)
    .eq("created_by", auth.ctx.userId);

  revalidatePath(REVALIDATE_PATH);
  return { success: true, data: data as CommandLinkRow };
}

export async function deleteCommandLinkAction(linkId: string): Promise<ActionResult> {
  const auth = await getAuthSupabase();
  if (!auth.ok) return { success: false, error: auth.error };

  const { error } = await auth.supabase.from("command_links").delete().eq("id", linkId);
  if (error) {
    console.error("[deleteCommandLinkAction]", error);
    return { success: false, error: error.message };
  }

  revalidatePath(REVALIDATE_PATH);
  return { success: true };
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
      labels[key] = data?.name ?? link.entity_id.slice(0, 8);
    } else if (link.entity_type === "session") {
      const { data } = await auth.supabase.from("sessions").select("title, scheduled_at").eq("id", link.entity_id).maybeSingle();
      labels[key] = data?.title ?? new Date(data?.scheduled_at ?? "").toLocaleDateString("it-IT");
    } else if (link.entity_type === "mission" || link.entity_type === "quest") {
      const { data } = await auth.supabase.from("campaign_missions").select("title").eq("id", link.entity_id).maybeSingle();
      labels[key] = data?.title ?? "Missione";
    } else {
      const { data } = await auth.supabase.from("wiki_entities").select("name, type").eq("id", link.entity_id).maybeSingle();
      labels[key] = data ? `${data.name} (${data.type})` : "Wiki";
    }
  }

  return { success: true, data: labels };
}
