import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Layers } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { VistaDallAltoClient } from "@/components/exploration/vista-dall-alto-client";
import { healCampaignSceneExplorationMapsAction } from "@/app/campaigns/scene-document-actions";
import type { ExplorationMapRow, FowRegionRow } from "@/app/campaigns/exploration-map-actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function VistaDallAltoPage({ params }: PageProps) {
  const { id: campaignId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) notFound();

  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .select("id, name, type")
    .eq("id", campaignId)
    .single();
  if (cErr || !campaign) notFound();

  let missionOptions: { id: string; title: string }[] = [];
  if (campaign.type === "long") {
    const { data: missions } = await supabase
      .from("campaign_missions")
      .select("id, title")
      .eq("campaign_id", campaignId)
      .order("title", { ascending: true });
    missionOptions = (missions ?? []).map((m: { id: string; title: string }) => ({
      id: m.id,
      title: m.title?.trim() ? m.title : "Senza titolo",
    }));
  }

  await healCampaignSceneExplorationMapsAction(campaignId);

  const { data: maps } = await supabase
    .from("campaign_exploration_maps")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  const mapList = (maps ?? []) as ExplorationMapRow[];
  const mapIds = mapList.map((m) => m.id);

  let regions: FowRegionRow[] = [];
  if (mapIds.length > 0) {
    const { data: reg } = await supabase
      .from("campaign_exploration_fow_regions")
      .select("*")
      .in("map_id", mapIds);
    regions = (reg ?? []) as FowRegionRow[];
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#0b0a10] text-barber-paper">
      <header className="shrink-0 border-b border-white/[0.06] bg-barber-dark/50 px-4 py-3 backdrop-blur-sm md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="h-8 text-barber-gold hover:bg-barber-gold/10">
            <Link href={`/campaigns/${campaignId}/gm-screen`}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              GM Screen
            </Link>
          </Button>
          <Layers className="h-5 w-5 text-barber-gold" aria-hidden />
          <div className="min-w-0">
            <h1 className="font-serif text-lg font-bold text-barber-paper md:text-xl">Esplorazione e FOW</h1>
            <p className="truncate text-xs text-barber-paper/50">{campaign.name}</p>
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-3 py-2 sm:px-4 sm:py-3 lg:px-6">
        <VistaDallAltoClient
          campaignId={campaignId}
          initialMaps={mapList}
          initialRegions={regions}
          missionOptions={missionOptions}
        />
      </div>
    </div>
  );
}
