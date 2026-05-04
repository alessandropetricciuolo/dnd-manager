import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { InteractiveMap } from "@/components/maps/interactive-map";
import { MapDetailActions } from "@/components/maps/map-detail-actions";
import { parseMapOverlayItems } from "@/lib/maps/overlay-parse";
import { ArrowLeft } from "lucide-react";
import { getCampaignEligiblePlayers } from "@/app/campaigns/character-actions";

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
    .select("id, name, image_url, campaign_id, parent_map_id, description, overlay_items, map_type")
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
  const role = (profile as { role?: string } | null)?.role;
  const isGmOrAdmin = role === "gm" || role === "admin";

  const { data: campaignRow } = await supabase
    .from("campaigns")
    .select("type, gm_id")
    .eq("id", campaignId)
    .single();
  const campaignMeta = campaignRow as { type?: string; gm_id?: string } | null;
  const canEditMapOverlay =
    campaignMeta?.type === "long" &&
    (role === "admin" || campaignMeta?.gm_id === user.id);

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
  const overlayItems = parseMapOverlayItems(
    (map as { overlay_items?: unknown }).overlay_items
  );

  if (parentMapId) {
    const { data: parentMap } = await supabase
      .from("maps")
      .select("name")
      .eq("id", parentMapId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    parentMapName = parentMap?.name ?? null;
  }

  const currentMapType = ((map as { map_type?: string }).map_type ?? "city").trim() || "city";
  let pinSubmapUpload: {
    currentMapType: string;
    campaignType: "oneshot" | "quest" | "long" | null;
    eligiblePlayers: { id: string; label: string }[];
    eligibleParties: { id: string; label: string; memberIds: string[] }[];
  } | null = null;
  if (isGmOrAdmin) {
    const ct = campaignMeta?.type;
    const campaignType =
      ct === "oneshot" || ct === "quest" || ct === "long" ? ct : null;
    let eligiblePlayers: { id: string; label: string }[] = [];
    const playersResult = await getCampaignEligiblePlayers(campaignId);
    if (playersResult.success && playersResult.data) eligiblePlayers = playersResult.data;
    const [{ data: partiesRaw }, { data: membersRaw }] = await Promise.all([
      supabase.from("campaign_parties").select("id, name").eq("campaign_id", campaignId).order("name"),
      supabase.from("campaign_members").select("player_id, party_id").eq("campaign_id", campaignId),
    ]);
    const memberIdsByPartyId = new Map<string, string[]>();
    for (const row of (membersRaw ?? []) as Array<{ player_id: string; party_id: string | null }>) {
      if (!row.party_id) continue;
      const list = memberIdsByPartyId.get(row.party_id) ?? [];
      list.push(row.player_id);
      memberIdsByPartyId.set(row.party_id, list);
    }
    const eligibleParties = ((partiesRaw ?? []) as Array<{ id: string; name: string }>).map((party) => ({
      id: party.id,
      label: party.name,
      memberIds: memberIdsByPartyId.get(party.id) ?? [],
    }));
    pinSubmapUpload = {
      currentMapType,
      campaignType,
      eligiblePlayers,
      eligibleParties,
    };
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
        <div className="flex flex-wrap items-center gap-2">
          {canEditMapOverlay && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden border-barber-gold/50 lg:inline-flex"
            >
              <Link href={`/campaigns/${campaignId}/maps/${mapId}/overlay-edit`}>
                Annotazioni
              </Link>
            </Button>
          )}
          <MapDetailActions
            imageUrl={map.image_url}
            mapName={map.name}
            viewUrl={`/campaigns/${campaignId}/maps/${mapId}/view`}
            showPopout={isGmOrAdmin}
          />
        </div>
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
              overlayItems={overlayItems}
              pinSubmapUpload={pinSubmapUpload}
            />
          </div>

          {/* aside + flex: <details> spesso non vincola l’altezza del blocco dopo <summary>, quindi overflow-y non scrolla. */}
          <aside
            className="flex min-h-0 w-full max-h-[min(45dvh,32rem)] shrink-0 flex-col overflow-hidden rounded-lg border border-barber-gold/25 bg-barber-dark/90 lg:h-full lg:max-h-none lg:w-[320px] lg:self-stretch"
            aria-label="Descrizione mappa"
          >
            <div className="shrink-0 border-b border-barber-gold/20 px-3 py-2 text-sm font-medium text-barber-gold">
              Descrizione mappa
            </div>
            <div className="scrollbar-barber-y min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-3 text-sm leading-relaxed text-barber-paper/90 [-webkit-overflow-scrolling:touch]">
              {map.description?.trim() ? (
                <p className="whitespace-pre-wrap break-words">{map.description}</p>
              ) : (
                <p className="italic text-barber-paper/50">Nessuna descrizione per questa mappa.</p>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
