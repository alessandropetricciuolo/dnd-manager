import { isTorneoRemoteType } from "@/lib/gm-remote/torneo-commands";

export type TorneoRemoteHandlers = {
  setFocusedMatch: (matchId: string | null) => void;
  applyTimerStart: (matchId: string, durationSec?: number, roundLabel?: string) => void;
  applyTimerPause: (matchId: string) => void;
  applyTimerReset: (matchId: string, durationSec?: number, roundLabel?: string) => void;
  applyTimerSetRound: (matchId: string, roundLabel: string) => void;
};

export function applyTorneoRemoteCommand(
  handlers: TorneoRemoteHandlers,
  type: string,
  payload: Record<string, unknown>
): boolean {
  if (!isTorneoRemoteType(type)) return false;

  const matchId = typeof payload.match_id === "string" ? payload.match_id.trim() : "";
  if (!matchId && type !== "torneo.focus_match") return false;

  switch (type) {
    case "torneo.focus_match": {
      const focus = typeof payload.match_id === "string" ? payload.match_id.trim() : null;
      handlers.setFocusedMatch(focus || null);
      return true;
    }
    case "torneo.timer_start": {
      const durationSec =
        typeof payload.duration_sec === "number" ? Math.max(0, Math.trunc(payload.duration_sec)) : undefined;
      const roundLabel = typeof payload.round_label === "string" ? payload.round_label : undefined;
      handlers.applyTimerStart(matchId, durationSec, roundLabel);
      return true;
    }
    case "torneo.timer_pause":
      handlers.applyTimerPause(matchId);
      return true;
    case "torneo.timer_reset": {
      const durationSec =
        typeof payload.duration_sec === "number" ? Math.max(0, Math.trunc(payload.duration_sec)) : undefined;
      const roundLabel = typeof payload.round_label === "string" ? payload.round_label : undefined;
      handlers.applyTimerReset(matchId, durationSec, roundLabel);
      return true;
    }
    case "torneo.timer_set_round": {
      const roundLabel = typeof payload.round_label === "string" ? payload.round_label.trim() : "";
      if (!roundLabel) return true;
      handlers.applyTimerSetRound(matchId, roundLabel);
      return true;
    }
    default:
      return false;
  }
}
