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
  };
}

export async function MapGallery({
  campaignId,
  campaignType = null,
  eligiblePlayers = [],
  eligibleParties = [],
}: MapGalleryProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let maps: MapRow[] | null = null;
  let hasMapType = false;
  let hasParentMapId = false;

  const resFull = await supabase
    .from("maps")
    .select("id, name, image_url, description, created_at, map_type, visibility, parent_map_id, wiki_entity_id")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (resFull.error) {
    if (resFull.error.message?.includes("wiki_entity_id")) {
      const resNoWiki = await supabase
        .from("maps")
        .select("id, name, image_url, description, created_at, map_type, visibility, parent_map_id")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (!resNoWiki.error) {
        maps = (resNoWiki.data ?? []) as MapRow[];
        hasMapType = true;
        hasParentMapId = true;
      }
    }
    if (!maps && resFull.error.message?.includes("parent_map_id")) {
      const resNoParent = await supabase
        .from("maps")
        .select("id, name, image_url, description, created_at, map_type, visibility")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (resNoParent.error) {
        if (resNoParent.error.message?.includes("map_type")) {
          const resFallback = await supabase
            .from("maps")
            .select("id, name, image_url, description, created_at, visibility")
            .eq("campaign_id", campaignId)
            .order("created_at", { ascending: false });
          if (resFallback.error) {
            console.error("[MapGallery]", resFallback.error);
            return (
              <p className="text-sm text-red-400">
                Errore nel caricamento delle mappe.
                {process.env.NODE_ENV === "development" && (
                  <span className="mt-2 block text-xs text-red-300">{resFallback.error.message}</span>
                )}
              </p>
            );
          }
          maps = resFallback.data as MapRow[];
        } else {
          console.error("[MapGallery]", resNoParent.error);
          return (
            <p className="text-sm text-red-400">
              Errore nel caricamento delle mappe.
              {process.env.NODE_ENV === "development" && (
                <span className="mt-2 block text-xs text-red-300">{resNoParent.error.message}</span>
              )}
            </p>
          );
        }
      } else {
        maps = (resNoParent.data ?? []) as MapRow[];
        hasMapType = true;
      }
    } else if (resFull.error.message?.includes("map_type")) {
      const resFallback = await supabase
        .from("maps")
        .select("id, name, image_url, description, created_at, visibility")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (resFallback.error) {
        console.error("[MapGallery]", resFallback.error);
        return (
          <p className="text-sm text-red-400">
            Errore nel caricamento delle mappe.
            {process.env.NODE_ENV === "development" && (
              <span className="mt-2 block text-xs text-red-300">{resFallback.error.message}</span>
            )}
          </p>
        );
      }
      maps = resFallback.data as MapRow[];
    } else {
      console.error("[MapGallery]", resFull.error);
      return (
        <p className="text-sm text-red-400">
          Errore nel caricamento delle mappe.
          {process.env.NODE_ENV === "development" && (
            <span className="mt-2 block text-xs text-red-300">{resFull.error.message}</span>
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
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
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
      eligiblePlayers={eligiblePlayers}
      eligibleParties={eligibleParties}
      permittedUserIdsByMapId={permittedUserIdsByMapId}
      selectiveAudienceLabelByMapId={selectiveAudienceLabelByMapId}
    />
  );
}
