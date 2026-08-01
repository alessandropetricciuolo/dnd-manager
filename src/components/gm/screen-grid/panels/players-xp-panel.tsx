"use client";

import { PlayerSessionTracker } from "@/components/gm/player-session-tracker";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";
import { useGmScreenBoard } from "../gm-screen-board-context";

export function PlayersXpPanel() {
  const long = useGmScreenLongStateOptional();
  const board = useGmScreenBoard();

  if (long) {
    return (
      <PlayerSessionTracker
        campaignId={long.campaignId}
        characters={long.sessionCharacters}
        attendance={long.attendance}
        onAttendanceChange={long.setAttendance}
        initiativeEntries={long.initiativeState.entries}
        value={long.xpState}
        onChange={long.setXpState}
        onCloseFight={() =>
          long.setInitiativeState({
            entries: [],
            currentTurnIndex: 0,
            roundNumber: 1,
            turnElapsedSeconds: 0,
            isTurnTimerRunning: false,
          })
        }
      />
    );
  }

  return <PlayerSessionTracker campaignId={board.campaignId} />;
}
