"use client";

import { GmMissionEncounterLoader } from "@/components/gm/gm-mission-encounter-loader";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";
import { useGmScreenBoard } from "../gm-screen-board-context";

export function MissionsPanel() {
  const long = useGmScreenLongStateOptional();
  const board = useGmScreenBoard();
  return <GmMissionEncounterLoader campaignId={long?.campaignId ?? board.campaignId} />;
}
