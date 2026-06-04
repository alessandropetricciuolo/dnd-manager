import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTorneo2LiveByPublicIdAction } from "@/app/campaigns/torneo2-live-actions";
import { getTorneo2SetupAction } from "@/app/campaigns/torneo2-actions";
import { Torneo2BoardClient } from "./torneo2-board-client";

type PageProps = {
  params: Promise<{ publicId: string }>;
};

export const metadata = {
  title: "Tabellone Torneo 2.0 | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default async function Torneo2BoardPage({ params }: PageProps) {
  const { publicId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const liveRes = await getTorneo2LiveByPublicIdAction(publicId);
  if (!liveRes.success || !liveRes.data) notFound();
  const live = liveRes.data;

  const setupRes = await getTorneo2SetupAction(live.campaignId);
  if (!setupRes.success || !setupRes.data) notFound();

  return <Torneo2BoardClient campaignId={live.campaignId} initialSetup={setupRes.data} />;
}
