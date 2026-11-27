import { getWikiContentBody, getWikiContentDescription } from "@/lib/wiki/content";
import {
  getReviewCampaignId,
  isReviewCampaignOwner,
  resolveTrustedProfileRole,
} from "../../../mobile/src/auth/access";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MOBILE_WIKI_PAGE_SIZE = 500;

/** Keys in wiki_entities.attributes that must NEVER leave the server for Player requests. */
export const SENSITIVE_WIKI_ATTRIBUTE_KEYS = [
  "loot",
  "combat_stats",
  "relationships",
  "gm_notes",
  "include_in_campaign_ai_memory",
] as const;

export type MobileWikiRole = "player" | "gm" | "admin";

export interface MobileWikiCampaignRow {
  id: string;
  name: string;
  type: string | null;
  gm_id: string | null;
  is_public: boolean;
}

export interface RawWikiEntityRow {
  id: string;
  campaign_id: string;
  name: string;
  type: string;
  content?: unknown;
  attributes?: Record<string, unknown> | null;
  image_url?: string | null;
  telegram_fallback_id?: string | null;
  sort_order?: number | null;
  linked_mission_id?: string | null;
  tags?: string[] | null;
  visibility?: string | null;
  is_secret?: boolean | null;
  admin_only?: boolean | null;
  is_campaign_document?: boolean | null;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RawCampaignMapRow {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string;
  description?: string | null;
  map_type?: string | null;
  visibility?: string | null;
  parent_map_id?: string | null;
  wiki_entity_id?: string | null;
  admin_only?: boolean | null;
  created_at?: string | null;
}

export interface RawWikiRelationshipRow {
  id: string;
  campaign_id: string;
  source_id: string;
  target_id?: string | null;
  target_map_id?: string | null;
  label?: string | null;
}

export interface MobileWikiIndexItem {
  id: string;
  campaign_id: string;
  name: string;
  type: string;
  snippet: string;
  image_url: string | null;
  telegram_fallback_id: string | null;
  sort_order: number | null;
  is_chapter: boolean;
  linked_mission_id: string | null;
  tags: string[];
  updated_at: string | null;
  // GM / Admin metadata (omitted or neutralized for players)
  visibility?: "public" | "selective" | "secret";
  archived_at?: string | null;
  is_campaign_document?: boolean;
  admin_only?: boolean;
  monster_combat_preview?: {
    hp?: string;
    ac?: string;
    cr?: string;
  } | null;
}

export interface MobileWikiResolvedRelation {
  id: string;
  direction: "outgoing" | "incoming";
  label: string;
  targetKind: "wiki" | "map";
  targetId: string;
  targetName: string;
  targetType: string;
  targetVisibility?: "public" | "selective" | "secret";
  targetAdminOnly?: boolean;
}

export interface MobileWikiEntityDetail {
  id: string;
  campaign_id: string;
  name: string;
  type: string;
  description: string;
  body: string;
  attributes: Record<string, unknown>;
  image_url: string | null;
  telegram_fallback_id: string | null;
  sort_order: number | null;
  is_chapter: boolean;
  linked_mission_id: string | null;
  tags: string[];
  updated_at: string | null;
  visibility?: "public" | "selective" | "secret";
  archived_at?: string | null;
  is_campaign_document?: boolean;
  admin_only?: boolean;
  relations: MobileWikiResolvedRelation[];
  linked_map_ids: string[];
}

export interface MobileWikiDependencies {
  authenticateBearer: (
    accessToken: string,
  ) => Promise<{ id: string; appMetadata?: unknown } | null>;
  getProfileRole: (userId: string) => Promise<string | null>;
  getCampaign: (campaignId: string) => Promise<MobileWikiCampaignRow | null>;
  isCampaignMember: (campaignId: string, userId: string) => Promise<boolean>;
  fetchPlayerPermissions: (
    campaignId: string,
    userId: string,
  ) => Promise<{ permittedWikiIds: Set<string>; permittedMapIds: Set<string> }>;
  fetchPlayerExplorations: (
    userId: string,
  ) => Promise<{ unlockedWikiIds: Set<string>; unlockedMapIds: Set<string> }>;
  listCampaignWikiEntities: (options: {
    campaignId: string;
    includeAdminOnly: boolean;
    includeDocuments: boolean;
    includeArchived: boolean;
  }) => Promise<RawWikiEntityRow[]>;
  listCampaignMaps: (options: {
    campaignId: string;
    includeAdminOnly: boolean;
  }) => Promise<RawCampaignMapRow[]>;
  getWikiEntityById: (
    campaignId: string,
    entityId: string,
  ) => Promise<RawWikiEntityRow | null>;
  listEntityRelationships: (
    campaignId: string,
    entityId: string,
  ) => Promise<RawWikiRelationshipRow[]>;
  listMinimalWikiTargetsByIds: (
    campaignId: string,
    ids: string[],
  ) => Promise<
    Array<{
      id: string;
      name: string;
      type: string;
      visibility?: string | null;
      is_secret?: boolean | null;
      admin_only?: boolean | null;
      is_campaign_document?: boolean | null;
      archived_at?: string | null;
    }>
  >;
}

export interface MobileWikiIndexQueryOptions {
  includeAdminOnly?: boolean;
  includeArchived?: boolean;
  includeDocuments?: boolean;
}

export interface MobileWikiDetailQueryOptions {
  includeAdminOnly?: boolean;
}

interface ResolvedActor {
  userId: string;
  role: MobileWikiRole;
  isAdmin: boolean;
  canReadGmContent: boolean;
  campaign: MobileWikiCampaignRow;
}

function normalizeVisibility(
  visibility?: string | null,
  isSecret?: boolean | null,
): "public" | "selective" | "secret" {
  if (visibility === "selective") return "selective";
  if (visibility === "secret" || isSecret === true) return "secret";
  return "public";
}

function buildPlainSnippet(content: unknown, maxLen = 180): string {
  const desc = getWikiContentDescription(content);
  if (desc) {
    return desc.length > maxLen ? `${desc.slice(0, maxLen - 1).trimEnd()}…` : desc;
  }
  const body = getWikiContentBody(content)
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!body) return "";
  return body.length > maxLen ? `${body.slice(0, maxLen - 1).trimEnd()}…` : body;
}

export function sanitizeWikiAttributesForPlayer(
  rawAttributes: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!rawAttributes || typeof rawAttributes !== "object" || Array.isArray(rawAttributes)) {
    return {};
  }
  const clean: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(rawAttributes)) {
    if (
      SENSITIVE_WIKI_ATTRIBUTE_KEYS.includes(
        key as (typeof SENSITIVE_WIKI_ATTRIBUTE_KEYS)[number],
      )
    ) {
      continue;
    }
    clean[key] = val;
  }
  return clean;
}

function extractMonsterPreview(
  type: string,
  attributes: Record<string, unknown> | null | undefined,
): { hp?: string; ac?: string; cr?: string } | null {
  if (type !== "monster" && type !== "npc") return null;
  if (!attributes || typeof attributes !== "object") return null;
  const stats = attributes.combat_stats;
  if (!stats || typeof stats !== "object" || Array.isArray(stats)) return null;
  const rec = stats as Record<string, unknown>;
  const hp = typeof rec.hp === "string" && rec.hp.trim() ? rec.hp.trim() : undefined;
  const ac = typeof rec.ac === "string" && rec.ac.trim() ? rec.ac.trim() : undefined;
  const cr = typeof rec.cr === "string" && rec.cr.trim() ? rec.cr.trim() : undefined;
  if (!hp && !ac && !cr) return null;
  return { hp, ac, cr };
}

async function resolveActorAndCampaign(
  campaignId: string,
  accessToken: string | null,
  deps: MobileWikiDependencies,
): Promise<
  | { ok: true; actor: ResolvedActor }
  | { ok: false; status: 401 | 403 | 404; error: string }
> {
  if (!accessToken) {
    return { ok: false, status: 401, error: "auth_required" };
  }
  if (!UUID_REGEX.test(campaignId)) {
    return { ok: false, status: 404, error: "not_found" };
  }

  const authUser = await deps.authenticateBearer(accessToken);
  if (!authUser) {
    return { ok: false, status: 401, error: "auth_required" };
  }

  const rawRole = await deps.getProfileRole(authUser.id);
  const role = resolveTrustedProfileRole(rawRole);
  if (!role) {
    return { ok: false, status: 403, error: "profile_unavailable" };
  }

  const reviewCampaignId = getReviewCampaignId(authUser.appMetadata);
  if (reviewCampaignId && campaignId.toLowerCase() !== reviewCampaignId) {
    return { ok: false, status: 404, error: "not_found" };
  }

  const campaign = await deps.getCampaign(campaignId);
  if (!campaign) {
    return { ok: false, status: 404, error: "not_found" };
  }

  // Store-review GM account: player profile scoped strictly to one private demo campaign
  if (reviewCampaignId) {
    if (!isReviewCampaignOwner(role, authUser.id, reviewCampaignId, campaign)) {
      return { ok: false, status: 404, error: "not_found" };
    }
    return {
      ok: true,
      actor: {
        userId: authUser.id,
        role: "gm",
        isAdmin: false,
        canReadGmContent: true,
        campaign,
      },
    };
  }

  if (role === "admin") {
    return {
      ok: true,
      actor: {
        userId: authUser.id,
        role: "admin",
        isAdmin: true,
        canReadGmContent: true,
        campaign,
      },
    };
  }

  if (role === "gm") {
    return {
      ok: true,
      actor: {
        userId: authUser.id,
        role: "gm",
        isAdmin: false,
        canReadGmContent: true,
        campaign,
      },
    };
  }

  // Player: Wiki & Maps are strictly reserved to joined Long campaigns (PRODUCT.md)
  if (campaign.type !== "long") {
    return { ok: false, status: 403, error: "long_campaign_only" };
  }

  const isMember = await deps.isCampaignMember(campaignId, authUser.id);
  if (!isMember) {
    return campaign.is_public
      ? { ok: false, status: 403, error: "membership_required" }
      : { ok: false, status: 404, error: "not_found" };
  }

  return {
    ok: true,
    actor: {
      userId: authUser.id,
      role: "player",
      isAdmin: false,
      canReadGmContent: false,
      campaign,
    },
  };
}

function isWikiVisibleToPlayer(
  entity: {
    id: string;
    visibility?: string | null;
    is_secret?: boolean | null;
    admin_only?: boolean | null;
    is_campaign_document?: boolean | null;
    archived_at?: string | null;
  },
  permittedWikiIds: Set<string>,
  unlockedWikiIds: Set<string>,
): boolean {
  if (entity.admin_only || entity.is_campaign_document || entity.archived_at) {
    return false;
  }
  const vis = normalizeVisibility(entity.visibility, entity.is_secret);
  if (vis === "public") return true;
  if (vis === "selective") return permittedWikiIds.has(entity.id);
  return unlockedWikiIds.has(entity.id);
}

function isMapVisibleToPlayer(
  map: {
    id: string;
    visibility?: string | null;
    admin_only?: boolean | null;
  },
  permittedMapIds: Set<string>,
  unlockedMapIds: Set<string>,
): boolean {
  if (map.admin_only) return false;
  const vis =
    map.visibility === "selective"
      ? "selective"
      : map.visibility === "secret"
        ? "secret"
        : "public";
  if (vis === "public") return true;
  if (vis === "selective") return permittedMapIds.has(map.id);
  return unlockedMapIds.has(map.id);
}

export async function getMobileCampaignWikiIndex(
  campaignId: string,
  accessToken: string | null,
  options: MobileWikiIndexQueryOptions,
  deps: MobileWikiDependencies,
): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  const auth = await resolveActorAndCampaign(campaignId, accessToken, deps);
  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.error } };
  }

  const { actor } = auth;
  const effectiveIncludeAdminOnly = Boolean(actor.isAdmin && options.includeAdminOnly);
  const effectiveIncludeDocuments = Boolean(actor.isAdmin && options.includeDocuments);
  const effectiveIncludeArchived = Boolean(actor.canReadGmContent && options.includeArchived);

  const [rawEntities, rawMaps, playerAccess] = await Promise.all([
    deps.listCampaignWikiEntities({
      campaignId,
      includeAdminOnly: effectiveIncludeAdminOnly,
      includeDocuments: effectiveIncludeDocuments,
      includeArchived: effectiveIncludeArchived,
    }),
    deps.listCampaignMaps({
      campaignId,
      includeAdminOnly: effectiveIncludeAdminOnly,
    }),
    actor.canReadGmContent
      ? Promise.resolve(null)
      : Promise.all([
          deps.fetchPlayerPermissions(campaignId, actor.userId),
          deps.fetchPlayerExplorations(actor.userId),
        ]),
  ]);

  const permittedWikiIds = playerAccess?.[0].permittedWikiIds ?? new Set<string>();
  const permittedMapIds = playerAccess?.[0].permittedMapIds ?? new Set<string>();
  const unlockedWikiIds = playerAccess?.[1].unlockedWikiIds ?? new Set<string>();
  const unlockedMapIds = playerAccess?.[1].unlockedMapIds ?? new Set<string>();

  const filteredEntities = rawEntities.filter((entity) => {
    if (!actor.isAdmin && (entity.admin_only || entity.is_campaign_document)) {
      return false;
    }
    if (actor.isAdmin && !effectiveIncludeAdminOnly && entity.admin_only && !entity.is_campaign_document) {
      return false;
    }
    if (actor.isAdmin && !effectiveIncludeDocuments && entity.is_campaign_document) {
      return false;
    }
    if (!actor.canReadGmContent) {
      return isWikiVisibleToPlayer(entity, permittedWikiIds, unlockedWikiIds);
    }
    if (!effectiveIncludeArchived && entity.archived_at) {
      return false;
    }
    return true;
  });

  const entities: MobileWikiIndexItem[] = [];
  const documents: MobileWikiIndexItem[] = [];

  for (const row of filteredEntities) {
    const attrs = (row.attributes ?? {}) as Record<string, unknown>;
    const isChapter = Boolean(
      attrs.is_chapter || (row.sort_order != null && row.sort_order > 0),
    );
    const baseItem: MobileWikiIndexItem = {
      id: row.id,
      campaign_id: row.campaign_id,
      name: row.name,
      type: row.type,
      snippet: buildPlainSnippet(row.content),
      image_url: row.image_url ?? null,
      telegram_fallback_id: row.telegram_fallback_id ?? null,
      sort_order: row.sort_order ?? null,
      is_chapter: isChapter,
      linked_mission_id: row.linked_mission_id ?? null,
      tags: Array.isArray(row.tags) ? row.tags : [],
      updated_at: row.updated_at ?? null,
    };

    if (actor.canReadGmContent) {
      baseItem.visibility = normalizeVisibility(row.visibility, row.is_secret);
      baseItem.archived_at = row.archived_at ?? null;
      baseItem.monster_combat_preview = extractMonsterPreview(row.type, attrs);
      if (actor.isAdmin) {
        baseItem.admin_only = Boolean(row.admin_only);
        baseItem.is_campaign_document = Boolean(row.is_campaign_document);
      }
    }

    if (row.is_campaign_document) {
      if (actor.isAdmin && effectiveIncludeDocuments) {
        documents.push(baseItem);
      }
    } else {
      entities.push(baseItem);
    }
  }

  const maps = rawMaps
    .filter((map) => {
      if (!actor.isAdmin && map.admin_only) return false;
      if (actor.isAdmin && !effectiveIncludeAdminOnly && map.admin_only) return false;
      if (!actor.canReadGmContent) {
        return isMapVisibleToPlayer(map, permittedMapIds, unlockedMapIds);
      }
      return true;
    })
    .map((map) => {
      const cleanMap: Record<string, unknown> = {
        id: map.id,
        campaign_id: map.campaign_id,
        name: map.name,
        image_url: map.image_url,
        description: map.description ?? null,
        map_type: map.map_type ?? null,
        parent_map_id: map.parent_map_id ?? null,
        wiki_entity_id: map.wiki_entity_id ?? null,
        created_at: map.created_at ?? null,
      };
      if (actor.canReadGmContent) {
        cleanMap.visibility = map.visibility ?? "public";
        if (actor.isAdmin) {
          cleanMap.admin_only = Boolean(map.admin_only);
        }
      }
      return cleanMap;
    });

  return {
    status: 200,
    body: {
      campaign: {
        id: actor.campaign.id,
        name: actor.campaign.name,
        type: actor.campaign.type,
      },
      viewer: {
        canReadGmContent: actor.canReadGmContent,
        isAdmin: actor.isAdmin,
      },
      entities,
      maps,
      ...(actor.isAdmin ? { documents } : {}),
    },
  };
}

export async function getMobileCampaignWikiEntityDetail(
  campaignId: string,
  entityId: string,
  accessToken: string | null,
  options: MobileWikiDetailQueryOptions,
  deps: MobileWikiDependencies,
): Promise<{
  status: number;
  body: Record<string, unknown>;
}> {
  if (!UUID_REGEX.test(entityId)) {
    return { status: 404, body: { error: "not_found" } };
  }

  const auth = await resolveActorAndCampaign(campaignId, accessToken, deps);
  if (!auth.ok) {
    return { status: auth.status, body: { error: auth.error } };
  }

  const { actor } = auth;
  const effectiveIncludeAdminOnly = Boolean(actor.isAdmin && options.includeAdminOnly);

  const entity = await deps.getWikiEntityById(campaignId, entityId);
  if (!entity || entity.campaign_id !== campaignId) {
    return { status: 404, body: { error: "not_found" } };
  }

  // Non-enumerable 404 for Admin-only or Campaign Documents
  if (entity.is_campaign_document && !actor.isAdmin) {
    return { status: 404, body: { error: "not_found" } };
  }
  if (entity.admin_only && (!actor.isAdmin || (!effectiveIncludeAdminOnly && !entity.is_campaign_document))) {
    return { status: 404, body: { error: "not_found" } };
  }

  let permittedWikiIds = new Set<string>();
  let permittedMapIds = new Set<string>();
  let unlockedWikiIds = new Set<string>();
  let unlockedMapIds = new Set<string>();

  if (!actor.canReadGmContent) {
    const [perms, explorations] = await Promise.all([
      deps.fetchPlayerPermissions(campaignId, actor.userId),
      deps.fetchPlayerExplorations(actor.userId),
    ]);
    permittedWikiIds = perms.permittedWikiIds;
    permittedMapIds = perms.permittedMapIds;
    unlockedWikiIds = explorations.unlockedWikiIds;
    unlockedMapIds = explorations.unlockedMapIds;

    if (!isWikiVisibleToPlayer(entity, permittedWikiIds, unlockedWikiIds)) {
      return { status: 404, body: { error: "not_found" } };
    }
  }

  const [rawRels, rawMaps] = await Promise.all([
    deps.listEntityRelationships(campaignId, entityId),
    deps.listCampaignMaps({
      campaignId,
      includeAdminOnly: effectiveIncludeAdminOnly,
    }),
  ]);

  const visibleMapsById = new Map<string, RawCampaignMapRow>();
  for (const map of rawMaps) {
    if (!actor.isAdmin && map.admin_only) continue;
    if (actor.isAdmin && !effectiveIncludeAdminOnly && map.admin_only) continue;
    if (!actor.canReadGmContent && !isMapVisibleToPlayer(map, permittedMapIds, unlockedMapIds)) {
      continue;
    }
    visibleMapsById.set(map.id, map);
  }

  const linkedWikiIds = Array.from(
    new Set(
      rawRels
        .flatMap((r) => [r.source_id, r.target_id])
        .filter((id): id is string => Boolean(id && id !== entityId)),
    ),
  );

  const rawTargetEntities =
    linkedWikiIds.length > 0
      ? await deps.listMinimalWikiTargetsByIds(campaignId, linkedWikiIds)
      : [];

  const visibleWikiTargetsById = new Map<
    string,
    (typeof rawTargetEntities)[number]
  >();
  for (const target of rawTargetEntities) {
    if (target.is_campaign_document) continue;
    if (!actor.isAdmin && target.admin_only) continue;
    if (actor.isAdmin && !effectiveIncludeAdminOnly && target.admin_only) continue;
    if (!actor.canReadGmContent) {
      if (!isWikiVisibleToPlayer(target, permittedWikiIds, unlockedWikiIds)) continue;
    } else if (target.archived_at) {
      continue;
    }
    visibleWikiTargetsById.set(target.id, target);
  }

  const relations: MobileWikiResolvedRelation[] = [];
  const seenKeys = new Set<string>();

  for (const rel of rawRels) {
    const label = (rel.label ?? "").trim() || "Collegato a";
    if (rel.source_id === entityId) {
      if (rel.target_map_id) {
        const map = visibleMapsById.get(rel.target_map_id);
        if (!map) continue;
        const dedup = `out:map:${map.id}:${label.toLowerCase()}`;
        if (seenKeys.has(dedup)) continue;
        seenKeys.add(dedup);
        relations.push({
          id: rel.id,
          direction: "outgoing",
          label,
          targetKind: "map",
          targetId: map.id,
          targetName: map.name,
          targetType: map.map_type ?? "city",
          ...(actor.canReadGmContent
            ? {
                targetVisibility: normalizeVisibility(map.visibility, false),
                ...(actor.isAdmin ? { targetAdminOnly: Boolean(map.admin_only) } : {}),
              }
            : {}),
        });
      } else if (rel.target_id && rel.target_id !== entityId) {
        const target = visibleWikiTargetsById.get(rel.target_id);
        if (!target) continue;
        const dedup = `out:wiki:${target.id}:${label.toLowerCase()}`;
        if (seenKeys.has(dedup)) continue;
        seenKeys.add(dedup);
        relations.push({
          id: rel.id,
          direction: "outgoing",
          label,
          targetKind: "wiki",
          targetId: target.id,
          targetName: target.name,
          targetType: target.type,
          ...(actor.canReadGmContent
            ? {
                targetVisibility: normalizeVisibility(target.visibility, target.is_secret),
                ...(actor.isAdmin ? { targetAdminOnly: Boolean(target.admin_only) } : {}),
              }
            : {}),
        });
      }
    } else if (rel.target_id === entityId && rel.source_id !== entityId) {
      const source = visibleWikiTargetsById.get(rel.source_id);
      if (!source) continue;
      const dedup = `in:wiki:${source.id}:${label.toLowerCase()}`;
      if (seenKeys.has(dedup)) continue;
      seenKeys.add(dedup);
      relations.push({
        id: rel.id,
        direction: "incoming",
        label,
        targetKind: "wiki",
        targetId: source.id,
        targetName: source.name,
        targetType: source.type,
        ...(actor.canReadGmContent
          ? {
              targetVisibility: normalizeVisibility(source.visibility, source.is_secret),
              ...(actor.isAdmin ? { targetAdminOnly: Boolean(source.admin_only) } : {}),
            }
          : {}),
      });
    }
  }

  const linkedMapIds = Array.from(visibleMapsById.values())
    .filter((m) => m.wiki_entity_id === entityId)
    .map((m) => m.id);

  const rawAttrs = (entity.attributes ?? {}) as Record<string, unknown>;
  const safeAttributes = actor.canReadGmContent
    ? rawAttrs
    : sanitizeWikiAttributesForPlayer(rawAttrs);

  const isChapter = Boolean(
    rawAttrs.is_chapter || (entity.sort_order != null && entity.sort_order > 0),
  );

  const detail: MobileWikiEntityDetail = {
    id: entity.id,
    campaign_id: entity.campaign_id,
    name: entity.name,
    type: entity.type,
    description: getWikiContentDescription(entity.content),
    body: getWikiContentBody(entity.content),
    attributes: safeAttributes,
    image_url: entity.image_url ?? null,
    telegram_fallback_id: entity.telegram_fallback_id ?? null,
    sort_order: entity.sort_order ?? null,
    is_chapter: isChapter,
    linked_mission_id: entity.linked_mission_id ?? null,
    tags: Array.isArray(entity.tags) ? entity.tags : [],
    updated_at: entity.updated_at ?? null,
    relations,
    linked_map_ids: linkedMapIds,
    ...(actor.canReadGmContent
      ? {
          visibility: normalizeVisibility(entity.visibility, entity.is_secret),
          archived_at: entity.archived_at ?? null,
          ...(actor.isAdmin
            ? {
                admin_only: Boolean(entity.admin_only),
                is_campaign_document: Boolean(entity.is_campaign_document),
              }
            : {}),
        }
      : {}),
  };

  return {
    status: 200,
    body: {
      entity: detail,
    },
  };
}
