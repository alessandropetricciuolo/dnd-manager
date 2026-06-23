export type Torneo2LiveStationRow = {
  station1_match_id?: string | null;
  station2_match_id?: string | null;
};

export function getTorneo2LiveStationMatchIds(live: Torneo2LiveStationRow | null | undefined): string[] {
  if (!live) return [];
  return [...new Set([live.station1_match_id, live.station2_match_id].filter((id): id is string => Boolean(id)))];
}

export function getTorneo2LiveStationForMatch(
  live: Torneo2LiveStationRow | null | undefined,
  matchId: string
): 1 | 2 | null {
  if (!live || !matchId) return null;
  if (live.station1_match_id === matchId) return 1;
  if (live.station2_match_id === matchId) return 2;
  return null;
}
