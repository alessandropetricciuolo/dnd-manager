import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { InteractiveMap } from "@/components/maps/interactive-map";

type PageProps = {
  params: Promise<{ id: string; mapId: string }>;
};

/**
 * Pagina "Second Screen": solo mappa + pin, senza header.
 * Aperta in popup per essere trascinata sul secondo schermo/TV.
 */
export default async function MapViewPage({ params }: PageProps) {
  const { id: campaignId, mapId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: map, error: mapError } = await supabase
    .from("maps")
    .select("id, name, image_url, campaign_id")
    .eq("id", mapId)
    .eq("campaign_id", campaignId)
    .single();

  if (mapError || !map) {
    notFound();
  }

  const { data: mapMeta } = await supabase
    .from("maps")
    .select("is_secret, visibility")
    .eq("id", mapId)
    .single();
  const visibility = (mapMeta as { visibility?: string } | null)?.visibility ?? "public";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  if (!isGmOrAdmin && visibility !== "public") {
    if (visibility === "selective") {
      const { data: perm } = await supabase
        .from("entity_permissions")
        .select("id")
        .eq("campaign_id", campaignId)
        .eq("entity_type", "map")
        .eq("entity_id", mapId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!perm) notFound();
    } else {
      const { data: exploration } = await supabase
        .from("explorations")
        .select("id")
        .eq("player_id", user.id)
        .eq("map_id", mapId)
        .limit(1)
        .maybeSingle();
      if (!exploration) notFound();
    }
  }

  const { data: pins } = await supabase
    .from("map_pins")
    .select("id, x, y, label, link_map_id")
    .eq("map_id", mapId)
    .order("created_at", { ascending: true });

  const { data: campaignMaps } = await supabase
    .from("maps")
    .select("id, name")
    .eq("campaign_id", campaignId)
    .neq("id", mapId)
    .order("name");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <main className="min-h-0 flex-1 overflow-hidden">
        <InteractiveMap
          campaignId={campaignId}
          mapId={mapId}
          imageUrl={map.image_url}
          mapName={map.name}
          pins={(pins ?? []).map((p) => ({
            id: p.id,
            x: Number(p.x),
            y: Number(p.y),
            label: p.label ?? undefined,
            linkMapId: p.link_map_id ?? undefined,
          }))}
          isCreator={false}
          campaignMaps={(campaignMaps ?? []).map((m) => ({
            id: m.id,
            name: m.name,
          }))}
        />
      </main>
    </div>
  );
}
