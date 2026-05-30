"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { TorneoMatchTracker } from "@/components/gm/torneo-match-tracker";
import { buildCharacterTeamMap } from "@/lib/torneo/initiative";
import type { TorneoMatchWithTeams, TorneoTeamWithMembers } from "@/lib/torneo/types";

type Props = {
  campaignId: string;
  livePublicId: string;
  match: TorneoMatchWithTeams;
  teams: TorneoTeamWithMembers[];
};

export function TorneoTableOperatorClient({ campaignId, livePublicId, match, teams }: Props) {
  const characterTeamMap = useMemo(() => buildCharacterTeamMap(teams), [teams]);
  const label = match.label ?? `${match.team_a.name} vs ${match.team_b.name}`;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-violet-900/30 px-4 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-violet-400/80">Sessione live · PC tavolo</p>
          <h1 className="text-sm font-semibold text-zinc-100">{label}</h1>
        </div>
        <Link
          href={`/campaigns/${campaignId}/gm-screen`}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="h-3 w-3" />
          GM Screen
        </Link>
      </header>
      <div className="min-h-0 flex-1 p-2">
        <TorneoMatchTracker
          campaignId={campaignId}
          match={match}
          liveSyncEnabled
          characterTeamMap={characterTeamMap}
          stationLabel={`Live ${livePublicId.slice(0, 8)}…`}
        />
      </div>
    </div>
  );
}
