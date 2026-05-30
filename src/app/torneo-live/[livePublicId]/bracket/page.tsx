import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getTorneoLiveSessionByPublicIdAction } from "@/app/campaigns/torneo-live-actions";
import { getTorneoSetupAction } from "@/app/campaigns/torneo-actions";
import { TorneoBracketBoard } from "@/components/gm/torneo-bracket-board";

type PageProps = {
  params: Promise<{ livePublicId: string }>;
};

export const metadata = {
  title: "Tabellone torneo | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default async function TorneoBracketDisplayPage({ params }: PageProps) {
  const { livePublicId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const liveRes = await getTorneoLiveSessionByPublicIdAction(livePublicId);
  if (!liveRes.success || !liveRes.data) notFound();

  const setupRes = await getTorneoSetupAction(liveRes.data.campaignId);
  if (!setupRes.success || !setupRes.data) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <header className="mb-6 text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-violet-400/80">Torneo live</p>
        <h1 className="mt-1 text-2xl font-bold text-amber-200">Tabellone</h1>
      </header>
      <TorneoBracketBoard matches={setupRes.data.matches} className="mx-auto max-w-5xl" />
    </div>
  );
}
