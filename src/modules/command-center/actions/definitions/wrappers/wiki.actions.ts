import { createEntity } from "@/app/campaigns/wiki-actions";
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
      return {
        ok: true,
        data: {
          campaignId: o.campaignId.trim(),
          title: o.title.trim(),
          type: o.type.trim(),
          content: typeof o.content === "string" ? o.content : "",
          visibility: typeof o.visibility === "string" ? o.visibility : "public",
        },
      };
    },
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      name: input.title,
      type: input.type,
      contentPreview: input.content.slice(0, 200),
      visibility: input.visibility,
    }),
    execute: async (_ctx, input) => {
      const fd = new FormData();
      fd.set("title", input.title);
      fd.set("type", input.type);
      fd.set("content", input.content);
      fd.set("visibility", input.visibility);

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
}
