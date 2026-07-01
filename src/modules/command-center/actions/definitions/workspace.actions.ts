import {
  COMMAND_LINK_ENTITY_TYPES,
  COMMAND_NOTE_STATUSES,
  WORKSPACE_PAGE_TYPES,
  WORKSPACE_TASK_PRIORITIES,
  WORKSPACE_TASK_STATUSES,
} from "../../types/workspace";
import type { ActionContext, ValidationResult } from "../../types/actions";
import type {
  CommandLinkRow,
  CommandNoteRow,
  CommandNoteStatus,
  WorkspacePageRow,
  WorkspaceTaskPriority,
  WorkspaceTaskRow,
  WorkspaceTaskStatus,
  WorkspacePageType,
} from "../../types";
import { registerAction } from "../registry";

function requireString(value: unknown, field: string): ValidationResult<string> {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: `${field} obbligatorio.` };
  }
  return { ok: true, data: value.trim() };
}

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim() || null : null;
}

export function registerWorkspaceActions(): void {
  registerAction({
    name: "command.note.create",
    description: "Crea una nota nell'inbox Command Center",
    category: "command",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const content = requireString(o.content, "Contenuto");
      if (!content.ok) return content;
      return {
        ok: true,
        data: {
          content: content.data,
          title: optionalString(o.title) ?? undefined,
          campaignId: optionalString(o.campaignId),
          status: (optionalString(o.status) as CommandNoteStatus | null) ?? "inbox",
        },
      };
    },
    preview: async (_ctx, input) => ({
      title: input.title ?? input.content.split("\n")[0]?.slice(0, 120) ?? "Nota senza titolo",
      content: input.content,
      campaignId: input.campaignId,
      status: input.status,
    }),
    execute: async (ctx, input) => {
      const title =
        input.title ||
        input.content.split("\n")[0]?.slice(0, 120) ||
        "Nota senza titolo";

      const { data: inputRow, error: inputErr } = await ctx.supabase
        .from("command_inputs")
        .insert({
          workspace_id: ctx.adapter.resolveWorkspaceId(),
          campaign_id: input.campaignId,
          source: "manual",
          raw_content: input.content,
          created_by: ctx.userId,
        })
        .select("id")
        .single();

      if (inputErr) throw new Error(inputErr.message);

      const { data, error } = await ctx.supabase
        .from("command_notes")
        .insert({
          workspace_id: ctx.adapter.resolveWorkspaceId(),
          campaign_id: input.campaignId,
          title,
          content: input.content,
          status: input.status,
          source_input_id: inputRow.id,
          created_by: ctx.userId,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data as CommandNoteRow;
    },
    auditEntity: (_input, result) => ({
      entityType: "command_note",
      entityId: result.id,
    }),
    revalidatePaths: () => ["/command-center"],
  });

  registerAction({
    name: "command.note.update",
    description: "Aggiorna una nota Command Center",
    category: "command",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const noteId = requireString(o.noteId, "ID nota");
      if (!noteId.ok) return noteId;
      const patch = o.patch as Record<string, unknown> | undefined;
      if (!patch || typeof patch !== "object") {
        return { ok: false, error: "Patch non valida." };
      }
      if (patch.status !== undefined && !(COMMAND_NOTE_STATUSES as readonly string[]).includes(String(patch.status))) {
        return { ok: false, error: "Stato nota non valido." };
      }
      return {
        ok: true,
        data: {
          noteId: noteId.data,
          patch: {
            title: patch.title !== undefined ? String(patch.title).trim() : undefined,
            content: patch.content !== undefined ? String(patch.content) : undefined,
            status: patch.status as CommandNoteStatus | undefined,
            campaignId: patch.campaignId !== undefined ? optionalString(patch.campaignId) : undefined,
          },
        },
      };
    },
    loadBefore: async (ctx, input) => {
      const { data } = await ctx.supabase
        .from("command_notes")
        .select("*")
        .eq("id", input.noteId)
        .eq("created_by", ctx.userId)
        .maybeSingle();
      return (data as Record<string, unknown> | null) ?? null;
    },
    execute: async (ctx, input) => {
      const update: Record<string, unknown> = {};
      if (input.patch.title !== undefined) update.title = input.patch.title;
      if (input.patch.content !== undefined) update.content = input.patch.content;
      if (input.patch.status !== undefined) update.status = input.patch.status;
      if (input.patch.campaignId !== undefined) update.campaign_id = input.patch.campaignId;

      const { data, error } = await ctx.supabase
        .from("command_notes")
        .update(update)
        .eq("id", input.noteId)
        .eq("created_by", ctx.userId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data as CommandNoteRow;
    },
    auditEntity: (input) => ({
      entityType: "command_note",
      entityId: input.noteId,
    }),
    revalidatePaths: () => ["/command-center"],
  });

  registerAction({
    name: "command.link.create",
    description: "Collega una nota a un'entità dell'app",
    category: "command",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const noteId = requireString(o.noteId, "ID nota");
      if (!noteId.ok) return noteId;
      const entityType = requireString(o.entityType, "Tipo entità");
      if (!entityType.ok) return entityType;
      if (!(COMMAND_LINK_ENTITY_TYPES as readonly string[]).includes(entityType.data)) {
        return { ok: false, error: "Tipo entità non valido." };
      }
      const entityId = requireString(o.entityId, "ID entità");
      if (!entityId.ok) return entityId;
      return {
        ok: true,
        data: {
          noteId: noteId.data,
          entityType: entityType.data,
          entityId: entityId.data,
          campaignId: optionalString(o.campaignId),
        },
      };
    },
    authorize: async (ctx, input) => {
      return ctx.adapter.assertCanLinkEntity(
        ctx.supabase,
        input.entityType,
        input.entityId,
        input.campaignId
      );
    },
    execute: async (ctx, input) => {
      const { data: note } = await ctx.supabase
        .from("command_notes")
        .select("id")
        .eq("id", input.noteId)
        .eq("created_by", ctx.userId)
        .maybeSingle();
      if (!note) throw new Error("Nota non trovata.");

      const { data, error } = await ctx.supabase
        .from("command_links")
        .insert({
          workspace_id: ctx.adapter.resolveWorkspaceId(),
          note_id: input.noteId,
          entity_type: input.entityType,
          entity_id: input.entityId,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      await ctx.supabase
        .from("command_notes")
        .update({ status: "linked" })
        .eq("id", input.noteId)
        .eq("created_by", ctx.userId);

      return data as CommandLinkRow;
    },
    auditEntity: (_input, result) => ({
      entityType: "command_link",
      entityId: result.id,
    }),
    revalidatePaths: () => ["/command-center"],
  });

  registerAction({
    name: "command.link.delete",
    description: "Rimuove un collegamento nota-entità",
    category: "command",
    validate: (input) => {
      const linkId = requireString((input as Record<string, unknown>).linkId, "ID collegamento");
      return linkId;
    },
    loadBefore: async (ctx, input) => {
      const { data } = await ctx.supabase
        .from("command_links")
        .select("*")
        .eq("id", input)
        .maybeSingle();
      return (data as Record<string, unknown> | null) ?? null;
    },
    execute: async (ctx, linkId) => {
      const { error } = await ctx.supabase.from("command_links").delete().eq("id", linkId);
      if (error) throw new Error(error.message);
      return { linkId };
    },
    auditEntity: (_input, result) => ({
      entityType: "command_link",
      entityId: result.linkId,
    }),
    revalidatePaths: () => ["/command-center"],
  });

  registerAction({
    name: "workspace.task.create",
    description: "Crea un task nel workspace GM",
    category: "workspace",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const title = requireString(o.title, "Titolo");
      if (!title.ok) return title;
      const priority = optionalString(o.priority) ?? "medium";
      if (!(WORKSPACE_TASK_PRIORITIES as readonly string[]).includes(priority)) {
        return { ok: false, error: "Priorità non valida." };
      }
      return {
        ok: true,
        data: {
          title: title.data,
          description: optionalString(o.description) ?? "",
          campaignId: optionalString(o.campaignId),
          sessionId: optionalString(o.sessionId),
          priority: priority as WorkspaceTaskPriority,
          dueDate: optionalString(o.dueDate),
          sourceNoteId: optionalString(o.sourceNoteId),
        },
      };
    },
    preview: async (_ctx, input) => ({
      title: input.title,
      description: input.description,
      campaignId: input.campaignId,
      priority: input.priority,
    }),
    execute: async (ctx, input) => {
      const { data, error } = await ctx.supabase
        .from("workspace_tasks")
        .insert({
          workspace_id: ctx.adapter.resolveWorkspaceId(),
          campaign_id: input.campaignId,
          session_id: input.sessionId,
          title: input.title,
          description: input.description,
          priority: input.priority,
          due_date: input.dueDate,
          source_note_id: input.sourceNoteId,
          created_by: ctx.userId,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data as WorkspaceTaskRow;
    },
    auditEntity: (_input, result) => ({
      entityType: "workspace_task",
      entityId: result.id,
    }),
    revalidatePaths: () => ["/command-center"],
  });

  registerAction({
    name: "workspace.task.update",
    description: "Aggiorna un task workspace",
    category: "workspace",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const taskId = requireString(o.taskId, "ID task");
      if (!taskId.ok) return taskId;
      const patch = o.patch as Record<string, unknown> | undefined;
      if (!patch || typeof patch !== "object") return { ok: false, error: "Patch non valida." };
      if (patch.status !== undefined && !(WORKSPACE_TASK_STATUSES as readonly string[]).includes(String(patch.status))) {
        return { ok: false, error: "Stato task non valido." };
      }
      if (patch.priority !== undefined && !(WORKSPACE_TASK_PRIORITIES as readonly string[]).includes(String(patch.priority))) {
        return { ok: false, error: "Priorità non valida." };
      }
      return {
        ok: true,
        data: {
          taskId: taskId.data,
          patch: {
            title: patch.title !== undefined ? String(patch.title).trim() : undefined,
            description: patch.description !== undefined ? String(patch.description) : undefined,
            status: patch.status as WorkspaceTaskStatus | undefined,
            priority: patch.priority as WorkspaceTaskPriority | undefined,
            dueDate: patch.dueDate !== undefined ? optionalString(patch.dueDate) : undefined,
            campaignId: patch.campaignId !== undefined ? optionalString(patch.campaignId) : undefined,
          },
        },
      };
    },
    loadBefore: async (ctx, input) => {
      const { data } = await ctx.supabase
        .from("workspace_tasks")
        .select("*")
        .eq("id", input.taskId)
        .eq("created_by", ctx.userId)
        .maybeSingle();
      return (data as Record<string, unknown> | null) ?? null;
    },
    execute: async (ctx, input) => {
      const update: Record<string, unknown> = {};
      if (input.patch.title !== undefined) update.title = input.patch.title;
      if (input.patch.description !== undefined) update.description = input.patch.description;
      if (input.patch.status !== undefined) update.status = input.patch.status;
      if (input.patch.priority !== undefined) update.priority = input.patch.priority;
      if (input.patch.dueDate !== undefined) update.due_date = input.patch.dueDate;
      if (input.patch.campaignId !== undefined) update.campaign_id = input.patch.campaignId;

      const { data, error } = await ctx.supabase
        .from("workspace_tasks")
        .update(update)
        .eq("id", input.taskId)
        .eq("created_by", ctx.userId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data as WorkspaceTaskRow;
    },
    auditEntity: (input) => ({
      entityType: "workspace_task",
      entityId: input.taskId,
    }),
    revalidatePaths: () => ["/command-center"],
  });

  registerAction({
    name: "workspace.page.create",
    description: "Crea una pagina workspace",
    category: "workspace",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const title = requireString(o.title, "Titolo");
      if (!title.ok) return title;
      const pageType = optionalString(o.pageType) ?? "note";
      if (!(WORKSPACE_PAGE_TYPES as readonly string[]).includes(pageType)) {
        return { ok: false, error: "Tipo pagina non valido." };
      }
      return {
        ok: true,
        data: {
          title: title.data,
          contentMarkdown: optionalString(o.contentMarkdown) ?? "",
          campaignId: optionalString(o.campaignId),
          pageType: pageType as WorkspacePageType,
        },
      };
    },
    preview: async (_ctx, input) => ({
      title: input.title,
      contentMarkdown: input.contentMarkdown,
      campaignId: input.campaignId,
      pageType: input.pageType,
    }),
    execute: async (ctx, input) => {
      const { data, error } = await ctx.supabase
        .from("workspace_pages")
        .insert({
          workspace_id: ctx.adapter.resolveWorkspaceId(),
          campaign_id: input.campaignId,
          title: input.title,
          content_markdown: input.contentMarkdown,
          page_type: input.pageType,
          created_by: ctx.userId,
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data as WorkspacePageRow;
    },
    auditEntity: (_input, result) => ({
      entityType: "workspace_page",
      entityId: result.id,
    }),
    revalidatePaths: () => ["/command-center"],
  });

  registerAction({
    name: "workspace.page.update",
    description: "Aggiorna una pagina workspace",
    category: "workspace",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const pageId = requireString(o.pageId, "ID pagina");
      if (!pageId.ok) return pageId;
      const patch = o.patch as Record<string, unknown> | undefined;
      if (!patch || typeof patch !== "object") return { ok: false, error: "Patch non valida." };
      if (patch.pageType !== undefined && !(WORKSPACE_PAGE_TYPES as readonly string[]).includes(String(patch.pageType))) {
        return { ok: false, error: "Tipo pagina non valido." };
      }
      return {
        ok: true,
        data: {
          pageId: pageId.data,
          patch: {
            title: patch.title !== undefined ? String(patch.title).trim() : undefined,
            contentMarkdown: patch.contentMarkdown !== undefined ? String(patch.contentMarkdown) : undefined,
            pageType: patch.pageType as WorkspacePageType | undefined,
            campaignId: patch.campaignId !== undefined ? optionalString(patch.campaignId) : undefined,
          },
        },
      };
    },
    loadBefore: async (ctx, input) => {
      const { data } = await ctx.supabase
        .from("workspace_pages")
        .select("*")
        .eq("id", input.pageId)
        .eq("created_by", ctx.userId)
        .maybeSingle();
      return (data as Record<string, unknown> | null) ?? null;
    },
    execute: async (ctx, input) => {
      const update: Record<string, unknown> = {};
      if (input.patch.title !== undefined) update.title = input.patch.title;
      if (input.patch.contentMarkdown !== undefined) update.content_markdown = input.patch.contentMarkdown;
      if (input.patch.pageType !== undefined) update.page_type = input.patch.pageType;
      if (input.patch.campaignId !== undefined) update.campaign_id = input.patch.campaignId;

      const { data, error } = await ctx.supabase
        .from("workspace_pages")
        .update(update)
        .eq("id", input.pageId)
        .eq("created_by", ctx.userId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return data as WorkspacePageRow;
    },
    auditEntity: (input) => ({
      entityType: "workspace_page",
      entityId: input.pageId,
    }),
    revalidatePaths: () => ["/command-center"],
  });
}
