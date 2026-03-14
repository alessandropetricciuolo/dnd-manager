import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { PrimerView } from "./primer-view";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CampaignPrimerPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, is_long_campaign, player_primer")
    .eq("id", id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  if (!campaign.is_long_campaign || !campaign.player_primer?.trim()) {
    notFound();
  }

  return (
    <PrimerView
      campaignId={campaign.id}
      campaignName={campaign.name}
      markdown={campaign.player_primer}
    />
  );
}
