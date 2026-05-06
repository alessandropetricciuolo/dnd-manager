import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Layers } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { VistaDallAltoClient } from "@/components/exploration/vista-dall-alto-client";
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
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col bg-gradient-to-b from-[#12100f] to-[#1d1714] text-barber-paper">
      <header className="flex shrink-0 flex-wrap items-center gap-4 border-b border-barber-gold/25 bg-barber-dark/90 px-4 py-3">
        <Button variant="ghost" size="sm" asChild className="text-barber-gold hover:bg-barber-gold/10">
          <Link href={`/campaigns/${campaignId}?tab=gm`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Solo GM
          </Link>
        </Button>
        <Layers className="h-5 w-5 text-barber-gold" aria-hidden />
        <h1 className="text-lg font-semibold text-barber-gold">Vista dall&apos;alto</h1>
        <span className="text-sm text-barber-paper/60">{campaign.name}</span>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
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
