import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTorneoLiveSessionByPublicIdAction } from "@/app/campaigns/torneo-live-actions";
import { getTorneoSetupAction } from "@/app/campaigns/torneo-actions";
import { TorneoTableOperatorClient } from "./torneo-table-operator-client";

type PageProps = {
  params: Promise<{ livePublicId: string; matchId: string }>;
};

export const metadata = {
  title: "Tavolo torneo | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default async function TorneoTableOperatorPage({ params }: PageProps) {
  const { livePublicId, matchId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const liveRes = await getTorneoLiveSessionByPublicIdAction(livePublicId);
  if (!liveRes.success || !liveRes.data) notFound();
  const live = liveRes.data;

  const setupRes = await getTorneoSetupAction(live.campaignId);
  if (!setupRes.success || !setupRes.data) notFound();

  const match = setupRes.data.matches.find((m) => m.id === matchId);
  if (!match) notFound();

  return (
    <TorneoTableOperatorClient
      campaignId={live.campaignId}
      livePublicId={live.publicId}
      match={match}
      teams={setupRes.data.teams}
    />
  );
}
