export type Torneo2RemoteLiveScope = {
  remote_session_public_id: string | null;
  station1_match_id: string | null;
  station2_match_id: string | null;
};

export type Torneo2RemoteMatchStatus = "pending" | "active" | "completed";

export type Torneo2RemoteWriteCheck =
  | { ok: true }
  | {
      ok: false;
      error: "remote_not_current" | "match_not_on_station" | "not_found" | "match_not_active";
      status: number;
    };

export function validateTorneo2RemoteWritableMatch(args: {
  live: Torneo2RemoteLiveScope | null;
  remotePublicId: string;
  matchId: string;
  matchStatus: Torneo2RemoteMatchStatus | null;
}): Torneo2RemoteWriteCheck {
  const remotePublicId = args.remotePublicId.trim();
  const stationMatchIds = [args.live?.station1_match_id, args.live?.station2_match_id].filter(
    (id): id is string => Boolean(id)
  );

  if (!args.live || args.live.remote_session_public_id !== remotePublicId) {
    return { ok: false, error: "remote_not_current", status: 403 };
  }
  if (!stationMatchIds.includes(args.matchId)) {
    return { ok: false, error: "match_not_on_station", status: 403 };
  }
  if (!args.matchStatus) {
    return { ok: false, error: "not_found", status: 404 };
  }
  if (args.matchStatus !== "active") {
    return { ok: false, error: "match_not_active", status: 409 };
  }
  return { ok: true };
}
