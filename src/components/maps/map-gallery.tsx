import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Map as MapIcon, Globe, Mountain, MapPin, Castle, Skull, Home, Building2 } from "lucide-react";
import { MapCard } from "./map-card";

type MapGalleryProps = {
  campaignId: string;
  /** Per modale modifica mappa (visibilità selettiva). */
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
};

const CATEGORY_ORDER: { type: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "world", label: "Mondi", icon: Globe },
  { type: "continent", label: "Continenti", icon: Mountain },
  { type: "region", label: "Regioni", icon: MapPin },
  { type: "city", label: "Aree Urbane", icon: Castle },
  { type: "dungeon", label: "Dungeon & Zone Aperte", icon: Skull },
  { type: "district", label: "Quartieri", icon: Home },
  { type: "building", label: "Edifici", icon: Building2 },
];

export async function MapGallery({
  campaignId,
  eligiblePlayers = [],
  eligibleParties = [],
}: MapGalleryProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let maps: { id: string; name: string; image_url: string; description?: string | null; created_at?: string; map_type?: string }[] | null = null;
  let hasMapType = false;
  const resWithType = await supabase
    .from("maps")
    .select("id, name, image_url, description, created_at, map_type, visibility")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (resWithType.error) {
    if (resWithType.error.message?.includes("map_type")) {
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
      maps = resFallback.data;
    } else {
      console.error("[MapGallery]", resWithType.error);
      return (
        <p className="text-sm text-red-400">
          Errore nel caricamento delle mappe.
          {process.env.NODE_ENV === "development" && (
            <span className="mt-2 block text-xs text-red-300">{resWithType.error.message}</span>
          )}
        </p>
      );
    }
  } else {
    maps = resWithType.data;
    hasMapType = true;
  }

  let visibleMaps = maps ?? [];
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  if (user && maps?.length && !isGmOrAdmin) {
    const visibilityByMap = new Map(
      maps.map((m) => [m.id, (m as { visibility?: string }).visibility ?? "public"])
    );
    const secretMapIds = new Set(
      maps.filter((m) => (m as { visibility?: string }).visibility === "secret").map((m) => m.id)
    );
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
      .filter((m) => ((m as { visibility?: string }).visibility ?? "public") === "selective")
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

  const mapTypeFallback = (m: (typeof visibleMaps)[number]) => {
    if (!hasMapType) return "region";
    const t = (m as { map_type?: string }).map_type;
    return t && CATEGORY_ORDER.some((c) => c.type === t) ? t : "region";
  };

  const byCategory = new Map<string, typeof visibleMaps>();
  for (const m of visibleMaps) {
    const type = mapTypeFallback(m);
    if (!byCategory.has(type)) byCategory.set(type, []);
    byCategory.get(type)!.push(m);
  }

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map(({ type, label, icon: Icon }) => {
        const list = byCategory.get(type);
        if (!list?.length) return null;
        return (
          <section key={type}>
            <h3 className="mb-3 flex items-center gap-2 border-b border-barber-gold/30 pb-2 text-base font-semibold text-barber-paper">
              <Icon className="h-4 w-4 text-barber-gold" />
              {label}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((map) => (
                <MapCard
                  key={map.id}
                  campaignId={campaignId}
                  map={{
                    id: map.id,
                    name: map.name,
                    image_url: map.image_url,
                    description: (map as { description?: string | null }).description ?? null,
                    map_type: (map as { map_type?: string }).map_type,
                    visibility: (map as { visibility?: string }).visibility ?? "public",
                  }}
                  isGmOrAdmin={isGmOrAdmin}
                  eligiblePlayers={eligiblePlayers}
                  eligibleParties={eligibleParties}
                  permittedUserIds={permittedUserIdsByMapId[map.id] ?? []}
                  selectiveAudienceLabel={selectiveAudienceLabelByMapId[map.id] ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
