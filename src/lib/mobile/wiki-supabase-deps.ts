import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  MOBILE_WIKI_PAGE_SIZE,
  type MobileWikiCampaignRow,
  type MobileWikiDependencies,
  type RawCampaignMapRow,
  type RawWikiEntityRow,
  type RawWikiRelationshipRow,
} from "./wiki-service";

type PageResult<T> = { data: T[] | null; error: { message?: string } | null };

async function fetchAllPages<T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += MOBILE_WIKI_PAGE_SIZE) {
    const page = await loadPage(from, from + MOBILE_WIKI_PAGE_SIZE - 1);
    if (page.error) {
      throw new Error(page.error.message || "supabase_page_query_failed");
    }
    const batch = page.data ?? [];
    rows.push(...batch);
    if (batch.length < MOBILE_WIKI_PAGE_SIZE) {
      return rows;
    }
  }
}

export function createSupabaseMobileWikiDependencies(): MobileWikiDependencies {
  // Service-role client is strictly confined behind explicit Bearer verification,
  // trusted profiles.role lookup, review_gm_campaign_id scoping, and field sanitization.
  const admin: any = createSupabaseAdminClient();

  return {
    authenticateBearer: async (accessToken: string) => {
      const { data, error } = await admin.auth.getUser(accessToken);
      if (error || !data?.user) return null;
      return {
        id: data.user.id,
        appMetadata: data.user.app_metadata,
      };
    },

    getProfileRole: async (userId: string) => {
      const { data, error } = await admin
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.role ?? null;
    },

    getCampaign: async (campaignId: string) => {
      const { data, error } = await admin
        .from("campaigns")
        .select("id, name, type, gm_id, is_public")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as MobileWikiCampaignRow | null) ?? null;
    },

    isCampaignMember: async (campaignId: string, userId: string) => {
      const { data, error } = await admin
        .from("campaign_members")
        .select("campaign_id")
        .eq("campaign_id", campaignId)
        .eq("player_id", userId)
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return Boolean(data);
    },

    fetchPlayerPermissions: async (campaignId: string, userId: string) => {
      const rows = await fetchAllPages<{ entity_id?: string | null; entity_type?: string | null }>(
        (from, to) =>
          admin
            .from("entity_permissions")
            .select("entity_id, entity_type")
            .eq("campaign_id", campaignId)
            .eq("user_id", userId)
            .order("id")
            .range(from, to),
      );
      const permittedWikiIds = new Set<string>();
      const permittedMapIds = new Set<string>();
      for (const row of rows) {
        if (!row.entity_id) continue;
        if (row.entity_type === "wiki") permittedWikiIds.add(row.entity_id);
        if (row.entity_type === "map") permittedMapIds.add(row.entity_id);
      }
      return { permittedWikiIds, permittedMapIds };
    },

    fetchPlayerExplorations: async (userId: string) => {
      const rows = await fetchAllPages<{ entity_id?: string | null; map_id?: string | null }>(
        (from, to) =>
          admin
            .from("explorations")
            .select("entity_id, map_id")
            .eq("player_id", userId)
            .order("id")
            .range(from, to),
      );
      const unlockedWikiIds = new Set<string>();
      const unlockedMapIds = new Set<string>();
      for (const row of rows) {
        if (row.entity_id) unlockedWikiIds.add(row.entity_id);
        if (row.map_id) unlockedMapIds.add(row.map_id);
      }
      return { unlockedWikiIds, unlockedMapIds };
    },

    listCampaignWikiEntities: async ({
      campaignId,
      includeAdminOnly,
      includeDocuments,
      includeArchived,
    }) => {
      return fetchAllPages<RawWikiEntityRow>((from, to) => {
        let query = admin
          .from("wiki_entities")
          .select(
            "id, campaign_id, name, type, content, attributes, image_url, telegram_fallback_id, sort_order, linked_mission_id, tags, visibility, is_secret, admin_only, is_campaign_document, archived_at, updated_at",
          )
          .eq("campaign_id", campaignId)
          .order("id", { ascending: true })
          .range(from, to);

        if (!includeDocuments) {
          query = query.eq("is_campaign_document", false);
        }
        if (!includeAdminOnly && !includeDocuments) {
          query = query.eq("admin_only", false);
        }
        if (!includeArchived) {
          query = query.is("archived_at", null);
        }
        return query;
      });
    },

    listCampaignMaps: async ({ campaignId, includeAdminOnly }) => {
      return fetchAllPages<RawCampaignMapRow>((from, to) => {
        let query = admin
          .from("maps")
          .select(
            "id, campaign_id, name, image_url, description, map_type, visibility, parent_map_id, wiki_entity_id, admin_only, created_at",
          )
          .eq("campaign_id", campaignId)
          .order("id", { ascending: true })
          .range(from, to);
        if (!includeAdminOnly) {
          query = query.eq("admin_only", false);
        }
        return query;
      });
    },

    getWikiEntityById: async (campaignId: string, entityId: string) => {
      const { data, error } = await admin
        .from("wiki_entities")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("id", entityId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as RawWikiEntityRow | null) ?? null;
    },

    listEntityRelationships: async (campaignId: string, entityId: string) => {
      const [outgoing, incoming] = await Promise.all([
        fetchAllPages<RawWikiRelationshipRow>((from, to) =>
          admin
            .from("wiki_relationships")
            .select("id, campaign_id, source_id, target_id, target_map_id, label")
            .eq("campaign_id", campaignId)
            .eq("source_id", entityId)
            .order("id", { ascending: true })
            .range(from, to),
        ),
        fetchAllPages<RawWikiRelationshipRow>((from, to) =>
          admin
            .from("wiki_relationships")
            .select("id, campaign_id, source_id, target_id, target_map_id, label")
            .eq("campaign_id", campaignId)
            .eq("target_id", entityId)
            .order("id", { ascending: true })
            .range(from, to),
        ),
      ]);
      return [...outgoing, ...incoming];
    },

    listMinimalWikiTargetsByIds: async (campaignId: string, ids: string[]) => {
      if (ids.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 200) {
        chunks.push(ids.slice(i, i + 200));
      }
      const out: Array<{
        id: string;
        name: string;
        type: string;
        visibility?: string | null;
        is_secret?: boolean | null;
        admin_only?: boolean | null;
        is_campaign_document?: boolean | null;
        archived_at?: string | null;
      }> = [];
      for (const chunk of chunks) {
        const { data, error } = await admin
          .from("wiki_entities")
          .select("id, name, type, visibility, is_secret, admin_only, is_campaign_document, archived_at")
          .eq("campaign_id", campaignId)
          .in("id", chunk);
        if (error) throw new Error(error.message);
        if (data) out.push(...data);
      }
      return out;
    },
  };
}
