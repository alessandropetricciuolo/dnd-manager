import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { InteractiveMap } from "@/components/maps/interactive-map";
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
    .select("id, name, image_url, campaign_id")
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
    .select("is_secret")
    .eq("id", mapId)
    .single();
  const isSecret = (mapMeta as { is_secret?: boolean } | null)?.is_secret ?? false;
  if (!isGmOrAdmin && isSecret) {
    const { data: exploration } = await supabase
      .from("explorations")
      .select("id")
      .eq("player_id", user.id)
      .eq("map_id", mapId)
      .limit(1)
      .maybeSingle();
    if (!exploration) notFound();
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
    <div className="flex h-screen flex-col">
      <header className="flex shrink-0 items-center gap-4 border-b border-emerald-700/50 bg-slate-950/90 px-4 py-3">
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
        <h1 className="truncate text-lg font-semibold text-slate-50">
          {map.name}
        </h1>
      </header>
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
          isCreator={isGmOrAdmin}
          campaignMaps={(campaignMaps ?? []).map((m) => ({
            id: m.id,
            name: m.name,
          }))}
        />
      </main>
    </div>
  );
}
