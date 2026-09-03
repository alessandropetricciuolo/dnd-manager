import { WIKI_ENTITY_TYPES, type WikiEntityType } from "@/lib/wiki/entity-types";

export type WikiArtifactRelation = { targetType: "wiki" | "map"; targetId: string; label: string };
export type WikiArtifactAudiences = { userIds: string[]; partyIds: string[] };

/**
 * The v2 draft contract deliberately mirrors the ordinary Wiki form.  Keeping
 * it here makes preview, revision and the action bridge operate on one shape.
 */
export type WikiArtifactActionInput = {
  entityId?: string;
  type: WikiEntityType;
  title?: string;
  content?: string;
  visibility?: "public" | "secret" | "selective";
  attributes?: Record<string, unknown>;
  imageUrl?: string | null;
  tags?: string[];
  audiences?: WikiArtifactAudiences;
  relations?: WikiArtifactRelation[];
  sortOrder?: number | null;
  isCore?: boolean;
  includeInCampaignAiMemory?: boolean;
  linkedMissionId?: string | null;
  xpValue?: number;
};

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): string | undefined => typeof value === "string" ? value.trim() : undefined;
const bool = (value: unknown): boolean | undefined => typeof value === "boolean" ? value : undefined;

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function relations(value: unknown): WikiArtifactRelation[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((item) => {
    const relation = record(item);
    const targetType = relation.targetType;
    const targetId = text(relation.targetId);
    if ((targetType !== "wiki" && targetType !== "map") || !targetId) return [];
    return [{ targetType, targetId, label: text(relation.label) || "—" }];
  });
}

/** Rejects transport-only and malformed fields before an AI draft reaches a write wrapper. */
export function normalizeWikiArtifactActionInput(value: unknown): Partial<WikiArtifactActionInput> {
  const input = record(value);
  const type = text(input.type);
  const visibility = text(input.visibility);
  const out: Partial<WikiArtifactActionInput> = {};
  if (type && (WIKI_ENTITY_TYPES as readonly string[]).includes(type)) out.type = type as WikiEntityType;
  for (const key of ["entityId", "title", "content"] as const) {
    const next = text(input[key]);
    if (next !== undefined) out[key] = next;
  }
  if (visibility === "public" || visibility === "secret" || visibility === "selective") out.visibility = visibility;
  if (input.attributes && typeof input.attributes === "object" && !Array.isArray(input.attributes)) out.attributes = input.attributes as Record<string, unknown>;
  if (typeof input.imageUrl === "string") out.imageUrl = input.imageUrl.trim() || null;
  if (input.imageUrl === null) out.imageUrl = null;
  const tags = stringList(input.tags); if (tags) out.tags = tags;
  const relationRows = relations(input.relations); if (relationRows) out.relations = relationRows;
  const audienceInput = record(input.audiences);
  const userIds = stringList(audienceInput.userIds);
  const partyIds = stringList(audienceInput.partyIds);
  if (userIds || partyIds) out.audiences = { userIds: userIds ?? [], partyIds: partyIds ?? [] };
  if (input.sortOrder === null) out.sortOrder = null;
  if (typeof input.sortOrder === "number" && Number.isInteger(input.sortOrder)) out.sortOrder = input.sortOrder;
  for (const key of ["isCore", "includeInCampaignAiMemory"] as const) { const next = bool(input[key]); if (next !== undefined) out[key] = next; }
  if (input.linkedMissionId === null) out.linkedMissionId = null;
  const linkedMissionId = text(input.linkedMissionId); if (linkedMissionId !== undefined) out.linkedMissionId = linkedMissionId || null;
  if (typeof input.xpValue === "number" && Number.isFinite(input.xpValue)) out.xpValue = Math.max(0, Math.floor(input.xpValue));
  return out;
}

/** Deep merge means a natural-language revision can change one nested field without erasing the rest. */
export function mergeWikiArtifactActionInput(current: unknown, patch: unknown): Record<string, unknown> {
  const base = record(current); const next = normalizeWikiArtifactActionInput(patch);
  const baseAttributes = record(base.attributes); const patchAttributes = record(next.attributes);
  const merged: Record<string, unknown> = { ...base, ...next };
  if (Object.keys(baseAttributes).length || Object.keys(patchAttributes).length) {
    merged.attributes = { ...baseAttributes, ...patchAttributes, ...(baseAttributes.combat_stats || patchAttributes.combat_stats ? { combat_stats: { ...record(baseAttributes.combat_stats), ...record(patchAttributes.combat_stats) } } : {}) };
  }
  return merged;
}
