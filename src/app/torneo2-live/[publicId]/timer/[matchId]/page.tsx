import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  getTorneo2LiveByPublicIdAction,
  getTorneo2TimerAction,
  loadTorneo2MatchStateAction,
} from "@/app/campaigns/torneo2-live-actions";
import { getTorneo2SetupAction } from "@/app/campaigns/torneo2-actions";
import { Torneo2TimerDisplay } from "@/components/gm/torneo2/torneo2-timer-display";
import { emptyTorneo2TimerState } from "@/lib/torneo2/timer";

type PageProps = {
  params: Promise<{ publicId: string; matchId: string }>;
};

export const metadata = {
  title: "Megatimer Torneo 2.0 | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default async function Torneo2TimerPage({ params }: PageProps) {
  const { publicId, matchId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const liveRes = await getTorneo2LiveByPublicIdAction(publicId);
  if (!liveRes.success || !liveRes.data) notFound();
  const live = liveRes.data;

  const [combatRes, timerRes, setupRes] = await Promise.all([
    loadTorneo2MatchStateAction(live.campaignId, matchId),
    getTorneo2TimerAction(live.campaignId, matchId),
    getTorneo2SetupAction(live.campaignId),
  ]);

  const match = setupRes.success ? setupRes.data?.matches.find((m) => m.id === matchId) ?? null : null;
  const teams = setupRes.success ? setupRes.data?.teams ?? [] : [];
  const label =
    match?.label ??
    (match?.kind === "final_ffa"
      ? "Finale · Tutti contro tutti"
      : `${teams.find((t) => t.id === match?.teamAId)?.name ?? "?"} vs ${
          teams.find((t) => t.id === match?.teamBId)?.name ?? "?"
        }`);

  return (
    <Torneo2TimerDisplay
      campaignId={live.campaignId}
      matchId={matchId}
      matchLabel={label}
      initialCombat={combatRes.success ? combatRes.data?.state ?? null : null}
      initialTimer={timerRes.success && timerRes.data ? timerRes.data : emptyTorneo2TimerState()}
    />
  );
}
