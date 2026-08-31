export type TorneoPublishTarget<TState, TScoreboard> = {
  matchId: string;
  state: TState;
  scoreboard: TScoreboard | null;
};

type TorneoPublishTargetInput<TState, TScoreboard> = {
  focusedMatchId: string | null;
  station1MatchId: string | null;
  station1State: TState;
  station1Scoreboard: TScoreboard | null;
  station2MatchId: string | null;
  station2State: TState;
  station2Scoreboard: TScoreboard | null;
};

export function selectTorneoPublishTarget<TState, TScoreboard>({
  focusedMatchId,
  station1MatchId,
  station1State,
  station1Scoreboard,
  station2MatchId,
  station2State,
  station2Scoreboard,
}: TorneoPublishTargetInput<TState, TScoreboard>): TorneoPublishTarget<TState, TScoreboard> | null {
  if (focusedMatchId) {
    if (focusedMatchId === station1MatchId) {
      return { matchId: focusedMatchId, state: station1State, scoreboard: station1Scoreboard };
    }
    if (focusedMatchId === station2MatchId) {
      return { matchId: focusedMatchId, state: station2State, scoreboard: station2Scoreboard };
    }
    return null;
  }

  if (station1MatchId) {
    return { matchId: station1MatchId, state: station1State, scoreboard: station1Scoreboard };
  }
  if (station2MatchId) {
    return { matchId: station2MatchId, state: station2State, scoreboard: station2Scoreboard };
  }
  return null;
}
