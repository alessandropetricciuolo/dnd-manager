import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Torneo2Console } from "@/components/gm/torneo2/torneo2-console";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Torneo 2.0 | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default async function Torneo2Page({ params }: PageProps) {
  const { id: campaignId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, type, name")
    .eq("id", campaignId)
    .single();

  if (!campaign || !isGmOrAdmin) notFound();
  if (campaign.type !== "torneo") notFound();

  return <Torneo2Console campaignId={campaignId} campaignName={campaign.name ?? null} />;
}
