export function resolveRemoteInitiativeTarget<T>(params: {
  payloadMatchId: unknown;
  station1MatchId?: string | null;
  station2MatchId?: string | null;
  station1: T | null | undefined;
  station2: T | null | undefined;
}): T | null {
  const matchId = typeof params.payloadMatchId === "string" ? params.payloadMatchId.trim() : "";
  if (matchId) {
    if (params.station2MatchId && matchId === params.station2MatchId) {
      return params.station2 ?? null;
    }
    if (params.station1MatchId && matchId === params.station1MatchId) {
      return params.station1 ?? null;
    }
    return null;
  }

  return params.station1 ?? params.station2 ?? null;
}
