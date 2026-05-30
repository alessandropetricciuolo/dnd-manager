export const GM_REMOTE_TORNEO_TYPES = [
  "torneo.focus_match",
  "torneo.timer_start",
  "torneo.timer_pause",
  "torneo.timer_reset",
  "torneo.timer_set_round",
] as const;

export type GmRemoteTorneoCommandType = (typeof GM_REMOTE_TORNEO_TYPES)[number];

export function isTorneoRemoteType(type: string): type is GmRemoteTorneoCommandType {
  return (GM_REMOTE_TORNEO_TYPES as readonly string[]).includes(type);
}
