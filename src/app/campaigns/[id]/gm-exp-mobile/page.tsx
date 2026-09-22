import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { MobileXpTracker } from "@/components/gm/mobile-xp-tracker";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sessionId?: string }>;
};

export default async function MobileXpTrackerPage({ params, searchParams }: PageProps) {
  const { id: campaignId } = await params;
  const { sessionId } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [{ data: profile }, { data: campaign }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("campaigns").select("id, name").eq("id", campaignId).single(),
  ]);

  if (!campaign || (profile?.role !== "gm" && profile?.role !== "admin")) notFound();

  return (
    <MobileXpTracker
      campaignId={campaignId}
      campaignName={campaign.name}
      initialSessionId={sessionId ?? null}
    />
  );
}
