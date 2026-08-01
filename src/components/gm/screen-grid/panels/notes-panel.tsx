"use client";

import { GmNotesGrid } from "@/components/gm/gm-notes-grid";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";
import { useGmScreenBoard } from "../gm-screen-board-context";

export function NotesPanel() {
  const long = useGmScreenLongStateOptional();
  const board = useGmScreenBoard();

  if (long) {
    return (
      <GmNotesGrid
        campaignId={long.campaignId}
        sessionId={long.selectedSessionId}
        sessionLabel={long.selectedSessionLabel}
      />
    );
  }

  return <GmNotesGrid campaignId={board.campaignId} sessionId={board.selectedSessionId} />;
}
