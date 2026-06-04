import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  getTorneo2LiveByPublicIdAction,
  getTorneo2TimerAction,
  loadTorneo2MatchStateAction,
} from "@/app/campaigns/torneo2-live-actions";
import { getTorneo2SetupAction } from "@/app/campaigns/torneo2-actions";
import { Torneo2TableOperatorClient } from "./torneo2-table-operator-client";
import { emptyTorneo2TimerState } from "@/lib/torneo2/timer";

type PageProps = {
  params: Promise<{ publicId: string; matchId: string }>;
};

export const metadata = {
  title: "PC Tavolo Torneo 2.0 | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default async function Torneo2TablePage({ params }: PageProps) {
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
  const teamAName = match?.teamAId ? teams.find((t) => t.id === match.teamAId)?.name ?? null : null;
  const teamBName = match?.teamBId ? teams.find((t) => t.id === match.teamBId)?.name ?? null : null;
  const label =
    match?.label ??
    (match?.kind === "final_ffa"
      ? "Finale · Tutti contro tutti"
      : `${teamAName ?? "?"} vs ${teamBName ?? "?"}`);

  return (
    <Torneo2TableOperatorClient
      campaignId={live.campaignId}
      matchId={matchId}
      matchLabel={label}
      teamAName={teamAName}
      teamBName={teamBName}
      initialCombat={combatRes.success ? combatRes.data?.state ?? null : null}
      initialTimer={timerRes.success && timerRes.data ? timerRes.data : emptyTorneo2TimerState()}
    />
  );
}
