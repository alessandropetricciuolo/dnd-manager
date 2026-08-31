export type Torneo2RemoteLiveAssignment = {
  station1_match_id: string | null;
  station2_match_id: string | null;
};

export type Torneo2RemoteMatchAccess = {
  id: string;
  status: string | null;
};

export function getTorneo2RemoteStationForMatch(
  live: Torneo2RemoteLiveAssignment | null | undefined,
  matchId: string
): 1 | 2 | null {
  if (!live || !matchId) return null;
  if (live.station1_match_id === matchId) return 1;
  if (live.station2_match_id === matchId) return 2;
  return null;
}

export function canTorneo2RemoteMutateMatch(
  live: Torneo2RemoteLiveAssignment | null | undefined,
  match: Torneo2RemoteMatchAccess | null | undefined
): boolean {
  if (!match || match.status !== "active") return false;
  return getTorneo2RemoteStationForMatch(live, match.id) != null;
}
