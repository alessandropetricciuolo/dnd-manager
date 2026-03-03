import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Map as MapIcon, Globe, Mountain, MapPin, Castle, Skull, Home, Building2 } from "lucide-react";
import { MapCard } from "./map-card";

type MapGalleryProps = {
  campaignId: string;
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

export async function MapGallery({ campaignId }: MapGalleryProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let maps: { id: string; name: string; image_url: string; description?: string | null; created_at?: string; map_type?: string }[] | null = null;
  let hasMapType = false;
  const resWithType = await supabase
    .from("maps")
    .select("id, name, image_url, description, created_at, map_type")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (resWithType.error) {
    if (resWithType.error.message?.includes("map_type")) {
      const resFallback = await supabase
        .from("maps")
        .select("id, name, image_url, description, created_at")
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
    const { data: mapsWithSecret, error: secretError } = await supabase
      .from("maps")
      .select("id, is_secret")
      .eq("campaign_id", campaignId);
    if (!secretError && mapsWithSecret?.length) {
      const secretMapIds = new Set(
        mapsWithSecret.filter((m) => (m as { is_secret?: boolean }).is_secret).map((m) => m.id)
      );
      if (secretMapIds.size > 0) {
        const { data: explorations } = await supabase
          .from("explorations")
          .select("map_id")
          .eq("player_id", user.id)
          .in("map_id", maps.map((m) => m.id));
        const unlockedMapIds = new Set(
          (explorations ?? []).map((e) => e.map_id).filter(Boolean) as string[]
        );
        visibleMaps = maps.filter(
          (m) => !secretMapIds.has(m.id) || unlockedMapIds.has(m.id)
        );
      }
    }
  }

  if (!visibleMaps.length) {
    const emptyMessage = isGmOrAdmin
      ? "Nessuna mappa ancora. Carica la prima mappa per iniziare."
      : "Nessuna conoscenza acquisita ancora. Gioca per scoprire il mondo.";
    return (
      <div className="rounded-xl border border-emerald-700/40 bg-slate-950/60 px-6 py-10 text-center">
        <MapIcon className="mx-auto h-12 w-12 text-slate-500" />
        <p className="mt-3 text-slate-400">{emptyMessage}</p>
      </div>
    );
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
            <h3 className="mb-3 flex items-center gap-2 border-b border-emerald-700/40 pb-2 text-base font-semibold text-slate-50">
              <Icon className="h-4 w-4 text-emerald-400" />
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
                  }}
                  isGmOrAdmin={isGmOrAdmin}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
