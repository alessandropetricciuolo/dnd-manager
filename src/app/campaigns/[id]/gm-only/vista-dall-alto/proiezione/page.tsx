import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { VistaDallAltoProjection } from "@/components/exploration/vista-dall-alto-projection";
import type { ExplorationMapRow, FowRegionRow } from "@/app/campaigns/exploration-map-actions";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mapId?: string }>;
};

export default async function VistaDallAltoProiezionePage({ params, searchParams }: PageProps) {
  const { id: campaignId } = await params;
  const sp = await searchParams;
  const mapId = sp.mapId?.trim();
  if (!mapId) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) notFound();

  const { data: mapRow, error } = await supabase
    .from("campaign_exploration_maps")
    .select("*")
    .eq("id", mapId)
    .eq("campaign_id", campaignId)
    .single();

  if (error || !mapRow) notFound();

  const { data: regions } = await supabase
    .from("campaign_exploration_fow_regions")
    .select("*")
    .eq("map_id", mapId)
    .order("sort_order", { ascending: true });

  return (
    <VistaDallAltoProjection
      mapRow={mapRow as ExplorationMapRow}
      initialRegions={(regions ?? []) as FowRegionRow[]}
    />
  );
}
