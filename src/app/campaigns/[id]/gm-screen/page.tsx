import { notFound } from "next/navigation";
import { getReviewCampaignId, isReviewCampaignOwner } from "../../../../../mobile/src/auth/access";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { GmScreenLayout } from "@/components/gm/gm-screen-layout";
import { CAMPAIGN_TYPE_VALUES, type CampaignType } from "@/lib/campaign-type";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessionId?: string; resume?: string }>;
};

export default async function GmScreenPage({ params, searchParams }: PageProps) {
  const { id: campaignId } = await params;
  const { sessionId, resume } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, type, gm_id, is_public")
    .eq("id", campaignId)
    .single();

  if (!campaign) notFound();
  if (!isGmOrAdmin) {
    const reviewCampaignId = getReviewCampaignId(user.app_metadata);
    if (!isReviewCampaignOwner(profile?.role, user.id, reviewCampaignId, campaign)) notFound();
    if (sessionId) {
      const { data: session } = await supabase.from("sessions")
        .select("id").eq("campaign_id", campaignId).eq("id", sessionId).maybeSingle();
      if (!session) notFound();
    }
  }

  const campaignType =
    campaign?.type && (CAMPAIGN_TYPE_VALUES as readonly string[]).includes(campaign.type)
      ? (campaign.type as CampaignType)
      : null;

  return (
    <GmScreenLayout
      campaignId={campaignId}
      campaignType={campaignType}
      currentUserId={user.id}
      initialSessionId={sessionId ?? null}
      autoOpenDebrief={Boolean(resume && sessionId)}
    />
  );
}
