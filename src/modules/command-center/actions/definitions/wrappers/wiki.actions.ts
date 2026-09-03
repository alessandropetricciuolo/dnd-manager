import { createEntity, updateEntity, deleteEntity } from "@/app/campaigns/wiki-actions";
import { WIKI_ENTITY_TYPES } from "@/lib/wiki/entity-types";
import { registerAction } from "../../registry";

function normalizeWikiInput(input: unknown, needsEntityId: boolean) {
  const o = input as Record<string, unknown>;
  if (typeof o.campaignId !== "string" || !o.campaignId.trim()) return { ok: false as const, error: "Campagna obbligatoria." };
  if (needsEntityId && (typeof o.entityId !== "string" || !o.entityId.trim())) return { ok: false as const, error: "ID entità obbligatorio." };
  if (typeof o.title !== "string" || !o.title.trim()) return { ok: false as const, error: "Titolo obbligatorio." };
  if (typeof o.type !== "string" || !(WIKI_ENTITY_TYPES as readonly string[]).includes(o.type)) return { ok: false as const, error: "Tipo entità wiki non valido." };
  const attributes = o.attributes && typeof o.attributes === "object" && !Array.isArray(o.attributes) ? o.attributes as Record<string, unknown> : undefined;
  const imageUrl = typeof o.imageUrl === "string" && o.imageUrl.trim() ? o.imageUrl.trim() : o.imageUrl === null ? null : undefined;
  const stringList = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean))] : undefined;
  const audiencesRaw = o.audiences && typeof o.audiences === "object" && !Array.isArray(o.audiences) ? o.audiences as Record<string, unknown> : undefined;
  const audiences = audiencesRaw ? { userIds: stringList(audiencesRaw.userIds) ?? [], partyIds: stringList(audiencesRaw.partyIds) ?? [] } : undefined;
  const relations = Array.isArray(o.relations) ? o.relations.flatMap((row) => {
    const relation = row && typeof row === "object" ? row as Record<string, unknown> : {};
    if ((relation.targetType !== "wiki" && relation.targetType !== "map") || typeof relation.targetId !== "string" || !relation.targetId.trim()) return [];
    return [{ targetType: relation.targetType, targetId: relation.targetId.trim(), label: typeof relation.label === "string" && relation.label.trim() ? relation.label.trim() : "—" }];
  }) : undefined;
  const sortOrder = o.sortOrder === null ? null : typeof o.sortOrder === "number" && Number.isInteger(o.sortOrder) ? o.sortOrder : undefined;
  const bool = (value: unknown) => typeof value === "boolean" ? value : undefined;
  const linkedMissionId = o.linkedMissionId === null ? null : typeof o.linkedMissionId === "string" ? o.linkedMissionId.trim() || null : undefined;
  const xpValue = typeof o.xpValue === "number" && Number.isFinite(o.xpValue) ? Math.max(0, Math.floor(o.xpValue)) : undefined;
  return { ok: true as const, data: { ...(needsEntityId ? { entityId: (o.entityId as string).trim() } : {}), campaignId: o.campaignId.trim(), title: o.title.trim(), type: o.type.trim(), content: typeof o.content === "string" ? o.content : "", visibility: typeof o.visibility === "string" ? o.visibility : "secret", attributes, imageUrl, tags: stringList(o.tags), audiences, relations, sortOrder, isCore: bool(o.isCore), includeInCampaignAiMemory: bool(o.includeInCampaignAiMemory), linkedMissionId, xpValue } };
}

function appendWikiFormData(fd: FormData, input: Record<string, unknown>) {
  if (input.attributes) fd.set("attributes", JSON.stringify(input.attributes));
  if (input.imageUrl !== undefined) { if (input.imageUrl === null) fd.set("remove_image", "true"); else fd.set("image_url", String(input.imageUrl)); }
  if (input.tags !== undefined) fd.set("tags", JSON.stringify(input.tags));
  if (input.audiences && typeof input.audiences === "object") { const audiences = input.audiences as { userIds?: unknown; partyIds?: unknown }; fd.set("allowed_user_ids", JSON.stringify(audiences.userIds ?? [])); fd.set("allowed_party_ids", JSON.stringify(audiences.partyIds ?? [])); }
  if (input.relations !== undefined) fd.set("relations", JSON.stringify(input.relations));
  if (input.sortOrder !== undefined && input.sortOrder !== null) fd.set("sort_order", String(input.sortOrder));
  if (input.isCore === true) fd.set("is_core", "true");
  if (input.includeInCampaignAiMemory === true) fd.set("include_in_campaign_ai_memory", "true");
  if (input.linkedMissionId !== undefined && input.linkedMissionId !== null) fd.set("linked_mission_id", String(input.linkedMissionId));
  if (input.xpValue !== undefined) fd.set("xp_value", String(input.xpValue));
}

export function registerWikiWrapperActions(): void {
  registerAction({
    name: "wiki.entity.create",
    description: "Crea un'entità wiki (NPC, luogo, lore, …)",
    category: "wiki",
    validate: (input) => normalizeWikiInput(input, false),
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      name: input.title,
      type: input.type,
      content: input.content,
      contentMarkdown: input.content,
      visibility: input.visibility,
      imageUrl: input.imageUrl ?? null,
      attributes: input.attributes ?? {}, tags: input.tags ?? [], audiences: input.audiences ?? { userIds: [], partyIds: [] }, relations: input.relations ?? [], sortOrder: input.sortOrder ?? null, isCore: input.isCore ?? false, includeInCampaignAiMemory: input.includeInCampaignAiMemory ?? false, linkedMissionId: input.linkedMissionId ?? null, xpValue: input.xpValue ?? 0,
    }),
    execute: async (_ctx, input) => {
      const fd = new FormData();
      fd.set("title", input.title);
      fd.set("type", input.type);
      fd.set("content", input.content);
      fd.set("visibility", input.visibility);
      appendWikiFormData(fd, input);

      const result = await createEntity(input.campaignId, fd);
      if (!result.success) throw new Error(result.message);
      return { id: result.id, campaignId: input.campaignId, message: result.message };
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
    validate: (input) => normalizeWikiInput(input, true),
    preview: async (_ctx, input) => ({
      entityId: input.entityId,
      name: input.title,
      type: input.type,
      contentPreview: input.content.slice(0, 200),
      attributes: input.attributes ?? {}, tags: input.tags ?? [], audiences: input.audiences ?? { userIds: [], partyIds: [] }, relations: input.relations ?? [],
    }),
    execute: async (_ctx, input) => {
      const fd = new FormData();
      fd.set("title", input.title);
      fd.set("type", input.type);
      fd.set("content", input.content);
      fd.set("visibility", input.visibility);
      appendWikiFormData(fd, input);

      const result = await updateEntity(input.entityId!, input.campaignId, fd);
      if (!result.success) throw new Error(result.message);
      return { entityId: input.entityId, campaignId: input.campaignId };
    },
    auditEntity: (input) => ({
      entityType: "wiki_entity",
      entityId: input.entityId!,
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
