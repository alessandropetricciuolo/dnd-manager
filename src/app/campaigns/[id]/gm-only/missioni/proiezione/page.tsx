import { notFound, redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { MissionBoardSection } from "@/components/missions/mission-board-section";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function MissionProjectionPage({ params }: PageProps) {
  const { id: campaignId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dashboard");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
  if (!isGmOrAdmin) notFound();

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <header className="rounded-xl border border-amber-600/25 bg-zinc-900/60 p-4">
          <h1 className="flex items-center gap-2 text-lg font-semibold text-amber-200 md:text-xl">
            <ScrollText className="h-5 w-5" />
            Proiezione Missioni
          </h1>
          <p className="mt-1 text-sm text-zinc-300">
            Vista read-only pensata per il secondo schermo dei giocatori.
          </p>
        </header>

        <MissionBoardSection campaignId={campaignId} isGmOrAdmin={false} isAdmin={false} />
      </div>
    </div>
  );
}
