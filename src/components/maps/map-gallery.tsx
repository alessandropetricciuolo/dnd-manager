import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Map as MapIcon } from "lucide-react";
import { MapGalleryTree } from "./map-gallery-tree";
import type { GalleryMap } from "@/lib/maps/map-tree";

/** DB legacy: prima della migration le mappe potevano essere "region". */
const LEGACY_REGION = "region";

type MapGalleryProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  /** Per modale modifica mappa (visibilità selettiva). */
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
  isAdmin?: boolean;
  adminDraftsEnabled?: boolean;
};

type MapRow = {
  id: string;
  name: string;
  image_url: string;
  description?: string | null;
  created_at?: string;
  map_type?: string;
  visibility?: string;
  parent_map_id?: string | null;
  wiki_entity_id?: string | null;
  admin_only?: boolean;
};

function toGalleryMap(m: MapRow, hasMapType: boolean, hasParentMapId: boolean): GalleryMap {
  let mapType = "city";
  if (hasMapType && m.map_type) {
    mapType = m.map_type === LEGACY_REGION ? "city" : m.map_type;
  }
  return {
    id: m.id,
    name: m.name,
    image_url: m.image_url,
    description: m.description ?? null,
    map_type: mapType,
    visibility: m.visibility ?? "public",
    parent_map_id: hasParentMapId ? m.parent_map_id ?? null : null,
    wiki_entity_id: m.wiki_entity_id ?? null,
    admin_only: m.admin_only ?? false,
  };
}

export async function MapGallery({
  campaignId,
  campaignType = null,
  eligiblePlayers = [],
  eligibleParties = [],
  isAdmin: _isAdmin = false,
  adminDraftsEnabled = false,
}: MapGalleryProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  // The server-resolved profile is authoritative; UI props cannot widen scope.
  const isAdminViewer = profile?.role === "admin";

  let maps: MapRow[] | null = null;
  let hasMapType = false;
  let hasParentMapId = false;

  let mapQuery = supabase
    .from("maps")
    .select("id, name, image_url, description, created_at, map_type, visibility, parent_map_id, wiki_entity_id, admin_only")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (!isAdminViewer) mapQuery = mapQuery.eq("admin_only", false);
  const resFull = await mapQuery;

  if (resFull.error) {
    const msg = resFull.error.message ?? "";
    if (msg.includes("wiki_entity_id")) {
      let resNoWikiQuery = supabase
        .from("maps")
        .select("id, name, image_url, description, created_at, map_type, visibility, parent_map_id, admin_only")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (!isAdminViewer) resNoWikiQuery = resNoWikiQuery.eq("admin_only", false);
      const resNoWiki = await resNoWikiQuery;
      if (!resNoWiki.error) {
        maps = (resNoWiki.data ?? []) as MapRow[];
        hasMapType = true;
        hasParentMapId = true;
      }
    } else if (msg.includes("parent_map_id")) {
      let resNoParentQuery = supabase
        .from("maps")
        .select("id, name, image_url, description, created_at, map_type, visibility, admin_only")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (!isAdminViewer) resNoParentQuery = resNoParentQuery.eq("admin_only", false);
      const resNoParent = await resNoParentQuery;
      if (!resNoParent.error) {
        maps = (resNoParent.data ?? []) as MapRow[];
        hasMapType = true;
      }
    } else if (msg.includes("map_type")) {
      let resFallbackQuery = supabase
        .from("maps")
        .select("id, name, image_url, description, created_at, visibility, admin_only")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (!isAdminViewer) resFallbackQuery = resFallbackQuery.eq("admin_only", false);
      const resFallback = await resFallbackQuery;
      if (!resFallback.error) {
        maps = resFallback.data as MapRow[];
      }
    }

    if (!maps) {
      console.error("[MapGallery]", resFull.error);
      return (
        <p className="text-sm text-red-400">
          Errore nel caricamento delle mappe.
          {process.env.NODE_ENV === "development" && (
            <span className="mt-2 block text-xs text-red-300">{msg}</span>
          )}
        </p>
      );
    }
  } else {
    maps = (resFull.data ?? []) as MapRow[];
    hasMapType = true;
    hasParentMapId = true;
  }

  let visibleMaps = maps ?? [];
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  if (user && maps?.length && !isGmOrAdmin) {
    const visibilityByMap = new Map(maps.map((m) => [m.id, m.visibility ?? "public"]));
    const secretMapIds = new Set(maps.filter((m) => m.visibility === "secret").map((m) => m.id));
    let permittedMapIds = new Set<string>();
    const { data: perms } = await supabase
      .from("entity_permissions")
      .select("entity_id")
      .eq("campaign_id", campaignId)
      .eq("entity_type", "map")
      .eq("user_id", user.id);
    if (perms?.length) permittedMapIds = new Set(perms.map((p) => p.entity_id));

    const { data: explorations } = await supabase
      .from("explorations")
      .select("map_id")
      .eq("player_id", user.id)
      .in("map_id", maps.map((m) => m.id));
    const unlockedMapIds = new Set(
      (explorations ?? []).map((e) => e.map_id).filter(Boolean) as string[]
    );

    visibleMaps = maps.filter((m) => {
      const vis = visibilityByMap.get(m.id) ?? "public";
      if (vis === "public") return true;
      if (vis === "selective") return permittedMapIds.has(m.id);
      if (vis === "secret") return unlockedMapIds.has(m.id);
      return false;
    });
  }

  if (!visibleMaps.length) {
    const emptyMessage = isGmOrAdmin
      ? "Nessuna mappa ancora. Carica la prima mappa per iniziare."
      : "Nessuna conoscenza acquisita ancora. Gioca per scoprire il mondo.";
    return (
      <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 px-6 py-10 text-center">
        <MapIcon className="mx-auto h-12 w-12 text-barber-paper/50" />
        <p className="mt-3 text-barber-paper/70">{emptyMessage}</p>
      </div>
    );
  }

  let permittedUserIdsByMapId: Record<string, string[]> = {};
  let selectiveAudienceLabelByMapId: Record<string, string> = {};
  if (isGmOrAdmin && visibleMaps.length > 0) {
    const selectiveIds = visibleMaps
      .filter((m) => (m.visibility ?? "public") === "selective")
      .map((m) => m.id);
    if (selectiveIds.length > 0) {
      const { data: perms } = await supabase
        .from("entity_permissions")
        .select("entity_id, user_id")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "map")
        .in("entity_id", selectiveIds);
      if (perms?.length) {
        for (const row of perms) {
          const eid = row.entity_id as string;
          if (!permittedUserIdsByMapId[eid]) permittedUserIdsByMapId[eid] = [];
          permittedUserIdsByMapId[eid].push(row.user_id as string);
        }
      }
    }
    if (selectiveIds.length > 0) {
      const playerLabelById = new Map(eligiblePlayers.map((p) => [p.id, p.label]));
      for (const mapId of selectiveIds) {
        const allowedUserIds = [...new Set(permittedUserIdsByMapId[mapId] ?? [])];
        if (allowedUserIds.length === 0) continue;
        const fullParties = eligibleParties.filter(
          (party) => party.memberIds.length > 0 && party.memberIds.every((id) => allowedUserIds.includes(id))
        );
        const coveredByParties = new Set(fullParties.flatMap((party) => party.memberIds));
        const directUsers = allowedUserIds.filter((id) => !coveredByParties.has(id));
        const parts: string[] = [];
        if (fullParties.length > 0) {
          parts.push(fullParties.map((party) => party.label).join(", "));
        }
        if (directUsers.length > 0) {
          const labels = directUsers
            .map((id) => playerLabelById.get(id))
            .filter((x): x is string => typeof x === "string" && x.length > 0);
          if (labels.length > 0) {
            parts.push(labels.slice(0, 2).join(", ") + (labels.length > 2 ? ` +${labels.length - 2}` : ""));
          }
        }
        selectiveAudienceLabelByMapId[mapId] = parts.join(" · ");
      }
    }
  }

  const galleryMaps = visibleMaps.map((m) => toGalleryMap(m, hasMapType, hasParentMapId));

  return (
    <MapGalleryTree
      maps={galleryMaps}
      hasParentMapId={hasParentMapId}
      campaignId={campaignId}
      campaignType={campaignType}
      isGmOrAdmin={isGmOrAdmin}
      isAdmin={isAdminViewer}
      adminDraftsEnabled={adminDraftsEnabled}
      eligiblePlayers={eligiblePlayers}
      eligibleParties={eligibleParties}
      permittedUserIdsByMapId={permittedUserIdsByMapId}
      selectiveAudienceLabelByMapId={selectiveAudienceLabelByMapId}
    />
  );
}
