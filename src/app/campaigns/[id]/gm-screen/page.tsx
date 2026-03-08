import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { InitiativeTracker } from "@/components/gm/initiative-tracker";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GmScreenPage({ params }: PageProps) {
  const { id: campaignId } = await params;
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
    .select("id")
    .eq("id", campaignId)
    .single();

  if (!campaign || !isGmOrAdmin) notFound();

  return (
    <div className="h-screen w-screen overflow-auto bg-zinc-950">
      <InitiativeTracker campaignId={campaignId} />
    </div>
  );
}
