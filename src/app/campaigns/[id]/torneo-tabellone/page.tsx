import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTorneoSetupAction } from "@/app/campaigns/torneo-actions";
import { TorneoBracketLiveView } from "@/components/gm/torneo-bracket-live-view";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Tabellone torneo | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default async function TorneoTabelloneProjectionPage({ params }: PageProps) {
  const { id: campaignId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) notFound();

  const { data: campaign } = await supabase.from("campaigns").select("id, type").eq("id", campaignId).single();
  if (!campaign || campaign.type !== "torneo") notFound();

  const setupRes = await getTorneoSetupAction(campaignId);
  if (!setupRes.success || !setupRes.data) notFound();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950">
      <header className="shrink-0 border-b border-violet-900/40 px-6 py-4 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-400/90">Barber &amp; Dragons · Torneo</p>
        <h1 className="mt-1 text-2xl font-bold text-amber-200">Tabellone</h1>
      </header>
      <TorneoBracketLiveView
        campaignId={campaignId}
        initialMatches={setupRes.data.matches}
        variant="display"
        showToolbar={false}
        className="flex-1"
      />
    </div>
  );
}
