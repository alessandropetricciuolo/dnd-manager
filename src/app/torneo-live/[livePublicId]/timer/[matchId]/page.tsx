import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  getTorneoLiveSessionByPublicIdAction,
  getTorneoMatchTimerAction,
  loadTorneoMatchInitiativeAction,
} from "@/app/campaigns/torneo-live-actions";
import { getTorneoSetupAction } from "@/app/campaigns/torneo-actions";
import { TorneoMegatimerDisplay } from "@/components/gm/torneo-megatimer-display";
import { buildCharacterPortraitMap, rosterCharacterIdsForMatch } from "@/lib/torneo/initiative";
import { initiativeMatchesMatchRoster } from "@/lib/torneo/megatimer-initiative";

type PageProps = {
  params: Promise<{ livePublicId: string; matchId: string }>;
};

export const metadata = {
  title: "Megatimer torneo | Barber and Dragons",
  robots: { index: false, follow: false },
};

export default async function TorneoMegatimerPage({ params }: PageProps) {
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

  const [timerRes, initRes] = await Promise.all([
    getTorneoMatchTimerAction(live.campaignId, matchId),
    loadTorneoMatchInitiativeAction(live.campaignId, matchId),
  ]);
  const rosterCharacterIds = rosterCharacterIdsForMatch(match, setupRes.data.teams);
  let initialInitiative = initRes.success ? initRes.data?.state ?? null : null;
  if (
    initialInitiative?.entries.length &&
    rosterCharacterIds.length &&
    !initiativeMatchesMatchRoster(initialInitiative, rosterCharacterIds)
  ) {
    initialInitiative = null;
  }
  const initialTimer = timerRes.success && timerRes.data
    ? timerRes.data
    : {
        timer_round_label: null,
        timer_duration_sec: null,
        timer_started_at: null,
        timer_paused_at: null,
      };

  const matchLabel =
    match.label ??
    (match.match_kind === "triello" ? `Triello · ${match.team_a.name}` : `${match.team_a.name} vs ${match.team_b.name}`);

  const characterPortraits = buildCharacterPortraitMap(setupRes.data.teams);

  return (
    <TorneoMegatimerDisplay
      campaignId={live.campaignId}
      matchId={match.id}
      matchLabel={matchLabel}
      initialTimer={initialTimer}
      initialInitiative={initialInitiative}
      characterPortraits={characterPortraits}
      rosterCharacterIds={rosterCharacterIds}
    />
  );
}
