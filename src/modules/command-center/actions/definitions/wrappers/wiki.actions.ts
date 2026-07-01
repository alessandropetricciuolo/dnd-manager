import { createEntity, updateEntity, deleteEntity } from "@/app/campaigns/wiki-actions";
import { WIKI_ENTITY_TYPES } from "@/lib/wiki/entity-types";
import { registerAction } from "../../registry";

export function registerWikiWrapperActions(): void {
  registerAction({
    name: "wiki.entity.create",
    description: "Crea un'entità wiki (NPC, luogo, lore, …)",
    category: "wiki",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      if (typeof o.campaignId !== "string" || !o.campaignId.trim()) {
        return { ok: false, error: "Campagna obbligatoria." };
      }
      if (typeof o.title !== "string" || !o.title.trim()) {
        return { ok: false, error: "Titolo obbligatorio." };
      }
      if (typeof o.type !== "string" || !(WIKI_ENTITY_TYPES as readonly string[]).includes(o.type)) {
        return { ok: false, error: "Tipo entità wiki non valido." };
      }
      const attributes =
        o.attributes && typeof o.attributes === "object" && !Array.isArray(o.attributes)
          ? (o.attributes as Record<string, unknown>)
          : undefined;
      const imageUrl =
        typeof o.imageUrl === "string" && o.imageUrl.trim() ? o.imageUrl.trim() : undefined;
      return {
        ok: true,
        data: {
          campaignId: o.campaignId.trim(),
          title: o.title.trim(),
          type: o.type.trim(),
          content: typeof o.content === "string" ? o.content : "",
          visibility: typeof o.visibility === "string" ? o.visibility : "public",
          attributes,
          imageUrl,
        },
      };
    },
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      name: input.title,
      type: input.type,
      content: input.content,
      contentMarkdown: input.content,
      visibility: input.visibility,
      imageUrl: input.imageUrl ?? null,
    }),
    execute: async (_ctx, input) => {
      const fd = new FormData();
      fd.set("title", input.title);
      fd.set("type", input.type);
      fd.set("content", input.content);
      fd.set("visibility", input.visibility);
      if (input.attributes) {
        fd.set("attributes", JSON.stringify(input.attributes));
      }
      if (input.imageUrl) {
        fd.set("image_url", input.imageUrl);
      }

      const result = await createEntity(input.campaignId, fd);
      if (!result.success) throw new Error(result.message);
      return {
        campaignId: input.campaignId,
        message: result.message,
      };
    },
    auditEntity: (input) => ({
      entityType: "campaign",
      entityId: input.campaignId,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });

  registerAction({
    name: "wiki.entity.update",
    description: "Aggiorna un'entità wiki esistente",
    category: "wiki",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      if (typeof o.campaignId !== "string" || !o.campaignId.trim()) {
        return { ok: false, error: "Campagna obbligatoria." };
      }
      if (typeof o.entityId !== "string" || !o.entityId.trim()) {
        return { ok: false, error: "ID entità obbligatorio." };
      }
      if (typeof o.title !== "string" || !o.title.trim()) {
        return { ok: false, error: "Titolo obbligatorio." };
      }
      if (typeof o.type !== "string" || !(WIKI_ENTITY_TYPES as readonly string[]).includes(o.type)) {
        return { ok: false, error: "Tipo entità wiki non valido." };
      }
      return {
        ok: true,
        data: {
          entityId: o.entityId.trim(),
          campaignId: o.campaignId.trim(),
          title: o.title.trim(),
          type: o.type.trim(),
          content: typeof o.content === "string" ? o.content : "",
          visibility: typeof o.visibility === "string" ? o.visibility : "public",
        },
      };
    },
    preview: async (_ctx, input) => ({
      entityId: input.entityId,
      name: input.title,
      type: input.type,
      contentPreview: input.content.slice(0, 200),
    }),
    execute: async (_ctx, input) => {
      const fd = new FormData();
      fd.set("title", input.title);
      fd.set("type", input.type);
      fd.set("content", input.content);
      fd.set("visibility", input.visibility);

      const result = await updateEntity(input.entityId, input.campaignId, fd);
      if (!result.success) throw new Error(result.message);
      return { entityId: input.entityId, campaignId: input.campaignId };
    },
    auditEntity: (input) => ({
      entityType: "wiki_entity",
      entityId: input.entityId,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });

  registerAction({
    name: "wiki.entity.delete",
    description: "Elimina un'entità wiki",
    category: "wiki",
    validate: (input) => {
      const o = input as Record<string, unknown>;
      const entityId = typeof o.entityId === "string" ? o.entityId.trim() : "";
      const campaignId = typeof o.campaignId === "string" ? o.campaignId.trim() : "";
      if (!entityId || !campaignId) return { ok: false, error: "Entità e campagna obbligatorie." };
      return { ok: true, data: { entityId, campaignId } };
    },
    preview: async (_ctx, input) => ({
      entityId: input.entityId,
      campaignId: input.campaignId,
      warning: "Eliminazione permanente della voce wiki",
    }),
    execute: async (_ctx, input) => {
      const result = await deleteEntity(input.entityId, input.campaignId);
      if (!result.success) throw new Error(result.message);
      return input;
    },
    auditEntity: (input) => ({
      entityType: "wiki_entity",
      entityId: input.entityId,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });
}
