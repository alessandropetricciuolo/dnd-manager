"use client";

import { useMemo } from "react";
import { LongEconomyPanel } from "@/components/gm/long-economy-panel";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";

export function EconomyPanel() {
  const long = useGmScreenLongStateOptional();
  const playerIds = useMemo(() => (long ? long.signups.map((s) => s.player_id) : []), [long]);

  if (!long) {
    return <p className="text-xs text-zinc-500">Economia disponibile nelle campagne Long.</p>;
  }

  return (
    <LongEconomyPanel
      campaignId={long.campaignId}
      playerIds={playerIds}
      attendance={long.attendance}
      economyDraft={long.economyDraft}
      onDraftChange={long.setEconomyDraft}
      onCoinsCommitted={long.updateCharacterCoinsLocally}
      onRefreshCharacters={long.refreshCharacters}
    />
  );
}
