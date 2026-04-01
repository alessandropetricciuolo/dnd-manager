import type { ReactNode } from "react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Map as MapIcon, Globe, Mountain, Castle, Skull, Home, Building2, AlertTriangle } from "lucide-react";
import { MapCard } from "./map-card";

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
};

const CATEGORY_ORDER: { type: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "world", label: "Mondi", icon: Globe },
  { type: "continent", label: "Continenti", icon: Mountain },
  { type: "city", label: "Aree Urbane", icon: Castle },
  { type: "dungeon", label: "Dungeon & Zone Aperte", icon: Skull },
  { type: "district", label: "Quartieri", icon: Home },
  { type: "building", label: "Edifici", icon: Building2 },
];

const LOCAL_MAP_TYPES = new Set(["dungeon", "district", "building"]);

function mapTypeFallback(m: MapRow, hasMapType: boolean): string {
  if (!hasMapType) return "city";
  const t = m.map_type;
  if (t === LEGACY_REGION) return "city";
  return t && CATEGORY_ORDER.some((c) => c.type === t) ? t : "city";
}

function sortByName(a: MapRow, b: MapRow) {
  return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
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
    .select("id, name, image_url, description, created_at, map_type, visibility, parent_map_id")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (resFull.error) {
    if (resFull.error.message?.includes("parent_map_id")) {
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

  const cardProps = (map: MapRow) => ({
    campaignId,
    map: {
      id: map.id,
      name: map.name,
      image_url: map.image_url,
      description: map.description ?? null,
      map_type: map.map_type,
      visibility: map.visibility ?? "public",
      parent_map_id: hasParentMapId ? map.parent_map_id ?? null : null,
    },
    isGmOrAdmin,
    eligiblePlayers,
    eligibleParties,
    permittedUserIds: permittedUserIdsByMapId[map.id] ?? [],
    selectiveAudienceLabel: selectiveAudienceLabelByMapId[map.id] ?? null,
    campaignType,
  });

  if (campaignType !== "long" || !hasParentMapId) {
    const byCategory = new Map<string, MapRow[]>();
    for (const m of visibleMaps) {
      const type = mapTypeFallback(m, hasMapType);
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
                  <MapCard key={map.id} {...cardProps(map)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const used = new Set<string>();
  const tf = (m: MapRow) => mapTypeFallback(m, hasMapType);

  const mapsForScale = visibleMaps.filter((m) => !LOCAL_MAP_TYPES.has(tf(m)));
  const localMaps = visibleMaps.filter((m) => LOCAL_MAP_TYPES.has(tf(m)));

  const worlds = mapsForScale.filter((m) => tf(m) === "world").sort(sortByName);

  const hierarchyBlocks: ReactNode[] = [];

  for (const world of worlds) {
    used.add(world.id);
    const continents = mapsForScale
      .filter((m) => tf(m) === "continent" && m.parent_map_id === world.id)
      .sort(sortByName);

    hierarchyBlocks.push(
      <div key={world.id} className="space-y-4 rounded-lg border border-barber-gold/25 bg-barber-dark/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Globe className="h-4 w-4 text-barber-gold" />
          <h4 className="text-sm font-semibold text-barber-gold">Mappa del mondo</h4>
        </div>
        <div className="max-w-xl">
          <MapCard {...cardProps(world)} />
        </div>

        {continents.length === 0 ? (
          isGmOrAdmin ? (
            <p className="text-xs text-barber-paper/55">Aggiungi continenti collegati a questa mappa del mondo.</p>
          ) : null
        ) : (
          <div className="space-y-4 border-l border-barber-gold/20 pl-4">
            {continents.map((co) => {
              used.add(co.id);
              const cities = mapsForScale
                .filter((m) => tf(m) === "city" && m.parent_map_id === co.id)
                .sort(sortByName);
              return (
                <div key={co.id} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Mountain className="h-4 w-4 text-barber-gold/90" />
                    <span className="text-xs font-medium uppercase tracking-wide text-barber-paper/70">Continente</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <MapCard {...cardProps(co)} />
                  </div>
                  {cities.length > 0 && (
                    <div className="space-y-2 border-l border-barber-gold/15 pl-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Castle className="h-3.5 w-3.5 text-barber-gold/85" />
                        <span className="text-[11px] font-medium uppercase tracking-wide text-barber-paper/65">
                          Città
                        </span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {cities.map((city) => {
                          used.add(city.id);
                          return <MapCard key={city.id} {...cardProps(city)} />;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  for (const m of localMaps) {
    used.add(m.id);
  }

  const orphanMaps = visibleMaps.filter((m) => !used.has(m.id));

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 border-b border-barber-gold/30 pb-2 text-base font-semibold text-barber-paper">
          <Globe className="h-4 w-4 text-barber-gold" />
          Scala geografica (campagna lunga)
        </h3>
        <p className="text-sm text-barber-paper/65">
          Una sola mappa del mondo per campagna; continenti e città si collegano dalla scala più ampia a quella più
          dettagliata. La mappa del mondo resta identificabile per usi futuri (es. export o viste globali).
        </p>
        {hierarchyBlocks.length > 0 ? (
          <div className="space-y-6">{hierarchyBlocks}</div>
        ) : (
          isGmOrAdmin && (
            <p className="text-sm text-barber-paper/60">
              Non è ancora stata caricata la mappa del mondo. Caricala come prima mappa della gerarchia.
            </p>
          )
        )}
      </section>

      {localMaps.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 border-b border-barber-gold/30 pb-2 text-base font-semibold text-barber-paper">
            <Skull className="h-4 w-4 text-barber-gold" />
            Ambienti e dettaglio
          </h3>
          <p className="mb-3 text-xs text-barber-paper/55">
            Dungeon, quartieri ed edifici: restano fuori dalla scala mondo→città, con genitore opzionale in modifica.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {localMaps.sort(sortByName).map((map) => (
              <MapCard key={map.id} {...cardProps(map)} />
            ))}
          </div>
        </section>
      )}

      {orphanMaps.length > 0 && (
        <section className="rounded-lg border border-amber-500/35 bg-amber-950/20 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Mappe non in gerarchia
          </h3>
          <p className="mb-3 text-xs text-barber-paper/70">
            {isGmOrAdmin
              ? "Queste mappe non sono collegate correttamente (es. continente senza mondo, o dati precedenti alla gerarchia). Modifica la mappa e imposta il genitore giusto."
              : "Alcune mappe non sono ancora organizzate nella vista gerarchica."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orphanMaps.sort(sortByName).map((map) => (
              <MapCard key={map.id} {...cardProps(map)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
