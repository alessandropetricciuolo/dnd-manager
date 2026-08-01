"use client";

import { InitiativeTracker } from "@/components/gm/initiative-tracker";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";
import { useGmScreenBoard } from "../gm-screen-board-context";

export function InitiativePanel() {
  const long = useGmScreenLongStateOptional();
  const board = useGmScreenBoard();

  const onOpenMonsterStat = (entry: { entityId?: string; name: string }) =>
    board.openMonsterStat({
      entityId: entry.entityId,
      name: entry.name,
      title: entry.name,
    });

  if (long) {
    return (
      <div className="h-full min-h-0">
        <InitiativeTracker
          campaignId={long.campaignId}
          campaignType="long"
          availableCharacters={long.sessionCharacters}
          value={long.initiativeState}
          onChange={long.setInitiativeState}
          onOpenMonsterStat={onOpenMonsterStat}
        />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0">
      <InitiativeTracker
        campaignId={board.campaignId}
        campaignType={board.campaignType ?? null}
        onOpenMonsterStat={onOpenMonsterStat}
      />
    </div>
  );
}
