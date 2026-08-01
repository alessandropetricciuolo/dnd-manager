import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { GmScreenLayoutV2 } from "@/components/gm/gm-screen-layout-v2";
import { CAMPAIGN_TYPE_VALUES, type CampaignType } from "@/lib/campaign-type";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessionId?: string; resume?: string }>;
};

export default async function GmScreenV2Page({ params, searchParams }: PageProps) {
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
    .select("id, type")
    .eq("id", campaignId)
    .single();

  if (!campaign || !isGmOrAdmin) notFound();

  const campaignType =
    campaign?.type && (CAMPAIGN_TYPE_VALUES as readonly string[]).includes(campaign.type)
      ? (campaign.type as CampaignType)
      : null;

  return (
    <GmScreenLayoutV2
      campaignId={campaignId}
      campaignType={campaignType}
      currentUserId={user.id}
      initialSessionId={sessionId ?? null}
      autoOpenDebrief={Boolean(resume && sessionId)}
    />
  );
}
