import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { GmScreenLayout } from "@/components/gm/gm-screen-layout";

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
    .select("id, type")
    .eq("id", campaignId)
    .single();

  if (!campaign || !isGmOrAdmin) notFound();

  const campaignType =
    campaign?.type && ["oneshot", "quest", "long"].includes(campaign.type)
      ? (campaign.type as "oneshot" | "quest" | "long")
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
