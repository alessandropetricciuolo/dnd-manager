export type TorneoRemotePublicationTarget = {
  matchId: string | null;
  station: 1 | 2 | null;
};

function normalizeMatchId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function selectTorneoRemotePublicationTarget(params: {
  focusedRemoteMatchId: string | null | undefined;
  station1MatchId: string | null | undefined;
  station2MatchId: string | null | undefined;
}): TorneoRemotePublicationTarget {
  const focused = normalizeMatchId(params.focusedRemoteMatchId);
  const station1 = normalizeMatchId(params.station1MatchId);
  const station2 = normalizeMatchId(params.station2MatchId);

  if (focused) {
    if (focused === station1) return { matchId: focused, station: 1 };
    if (focused === station2) return { matchId: focused, station: 2 };
    return { matchId: null, station: null };
  }

  if (station1) return { matchId: station1, station: 1 };
  if (station2) return { matchId: station2, station: 2 };
  return { matchId: null, station: null };
}
