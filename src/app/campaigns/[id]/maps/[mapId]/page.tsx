import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { InteractiveMap } from "@/components/maps/interactive-map";
import { MapDetailActions } from "@/components/maps/map-detail-actions";
import { ArrowLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string; mapId: string }>;
};

export default async function CampaignMapPage({ params }: PageProps) {
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
    .select("id, name, image_url, campaign_id, parent_map_id, description")
    .eq("id", mapId)
    .eq("campaign_id", campaignId)
    .single();

  if (mapError || !map) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  const { data: mapMeta } = await supabase
    .from("maps")
    .select("visibility")
    .eq("id", mapId)
    .single();
  const visibility = (mapMeta as { visibility?: string } | null)?.visibility ?? "public";
  const isSecret = visibility === "secret";
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

  const parentMapId = (map as { parent_map_id?: string | null }).parent_map_id ?? null;
  let parentMapName: string | null = null;
  if (parentMapId) {
    const { data: parentMap } = await supabase
      .from("maps")
      .select("name")
      .eq("id", parentMapId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    parentMapName = parentMap?.name ?? null;
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-barber-gold/40 bg-barber-dark px-4 py-3">
        <Link href={`/campaigns/${campaignId}?tab=mappe`}>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-slate-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Campagna
          </Button>
        </Link>
        {parentMapId && (
          <Link href={`/campaigns/${campaignId}/maps/${parentMapId}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-slate-50"
              title={parentMapName ? `Torna a: ${parentMapName}` : "Torna alla mappa precedente"}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Mappa precedente
            </Button>
          </Link>
        )}
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-50">
          {map.name}
        </h1>
        <MapDetailActions
          imageUrl={map.image_url}
          mapName={map.name}
          viewUrl={`/campaigns/${campaignId}/maps/${mapId}/view`}
          showPopout={isGmOrAdmin}
        />
      </header>
      <main className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="flex h-full min-h-0 flex-col gap-3 lg:flex-row">
          <div className="min-h-[40dvh] min-w-0 flex-1 overflow-hidden rounded-lg border border-barber-gold/20 lg:min-h-0">
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
              isCreator={isGmOrAdmin}
              campaignMaps={(campaignMaps ?? []).map((m) => ({
                id: m.id,
                name: m.name,
              }))}
            />
          </div>

          <details
            className="group flex max-h-[min(42vh,28rem)] min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-lg border border-barber-gold/25 bg-barber-dark/90 lg:h-full lg:max-h-none lg:w-[320px]"
            open
          >
            <summary className="shrink-0 cursor-pointer list-none border-b border-barber-gold/20 px-3 py-2 text-sm font-medium text-barber-gold marker:content-['']">
              Descrizione mappa
              <span className="ml-2 text-xs text-barber-paper/60 group-open:hidden">(apri)</span>
              <span className="ml-2 text-xs text-barber-paper/60 hidden group-open:inline">(chiudi)</span>
            </summary>
            <div className="scrollbar-barber-y min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 text-sm leading-relaxed text-barber-paper/90">
              {map.description?.trim() ? (
                <p className="whitespace-pre-wrap break-words">{map.description}</p>
              ) : (
                <p className="italic text-barber-paper/50">Nessuna descrizione per questa mappa.</p>
              )}
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
