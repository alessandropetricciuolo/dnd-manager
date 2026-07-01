import { createGmNote, updateGmNote, deleteGmNote } from "@/app/campaigns/gm-actions";
import { registerAction } from "../../registry";

function toFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

export function registerGmNoteWrapperActions(): void {
  registerAction({
    name: "gm.note.create",
    description: "Crea una nota GM nella campagna (gm_notes legacy)",
    category: "gm",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      if (typeof o.campaignId !== "string" || !o.campaignId.trim()) {
        return { ok: false, error: "Campagna obbligatoria." };
      }
      if (typeof o.title !== "string" || !o.title.trim()) {
        return { ok: false, error: "Titolo obbligatorio." };
      }
      return {
        ok: true,
        data: {
          campaignId: o.campaignId.trim(),
          title: o.title.trim(),
          content: typeof o.content === "string" ? o.content : "",
          sessionId:
            typeof o.sessionId === "string" && o.sessionId.trim() ? o.sessionId.trim() : null,
        },
      };
    },
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      title: input.title,
      content: input.content,
      sessionId: input.sessionId,
      target: "gm_notes",
    }),
    execute: async (_ctx, input) => {
      const fields: Record<string, string> = {
        title: input.title,
        content: input.content,
      };
      if (input.sessionId) fields.session_id = input.sessionId;

      const result = await createGmNote(input.campaignId, toFormData(fields));
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    auditEntity: (_input, result) => ({
      entityType: "gm_note",
      entityId: result.id,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });

  registerAction({
    name: "gm.note.update",
    description: "Aggiorna una nota GM legacy",
    category: "gm",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      if (typeof o.noteId !== "string" || !o.noteId.trim()) {
        return { ok: false, error: "ID nota obbligatorio." };
      }
      if (typeof o.title !== "string" || !o.title.trim()) {
        return { ok: false, error: "Titolo obbligatorio." };
      }
      return {
        ok: true,
        data: {
          noteId: o.noteId.trim(),
          title: o.title.trim(),
          content: typeof o.content === "string" ? o.content : "",
          sessionId:
            typeof o.sessionId === "string" && o.sessionId.trim() ? o.sessionId.trim() : null,
        },
      };
    },
    execute: async (_ctx, input) => {
      const fields: Record<string, string> = {
        title: input.title,
        content: input.content,
      };
      if (input.sessionId) fields.session_id = input.sessionId;

      const result = await updateGmNote(input.noteId, toFormData(fields));
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    auditEntity: (input) => ({
      entityType: "gm_note",
      entityId: input.noteId,
    }),
    revalidatePaths: (input, result) => [
      `/campaigns/${result.campaign_id}`,
      "/command-center",
    ],
  });

  registerAction({
    name: "gm.note.delete",
    description: "Elimina una nota GM legacy",
    category: "gm",
    validate: (input) => {
      const noteId = (input as Record<string, unknown>).noteId;
      if (typeof noteId !== "string" || !noteId.trim()) {
        return { ok: false, error: "ID nota obbligatorio." };
      }
      return { ok: true, data: noteId.trim() };
    },
    execute: async (_ctx, noteId) => {
      const result = await deleteGmNote(noteId);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    auditEntity: (noteId) => ({
      entityType: "gm_note",
      entityId: noteId,
    }),
    revalidatePaths: (_noteId, result) => [
      `/campaigns/${result.campaignId}`,
      "/command-center",
    ],
  });
}
