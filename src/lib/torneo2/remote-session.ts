import type { SupabaseClient } from "@supabase/supabase-js";

export type Torneo2RemoteLiveRow = {
  station1_match_id: string | null;
  station2_match_id: string | null;
  remote_session_public_id: string | null;
};

export type Torneo2RemoteMatchCheck =
  | { ok: true; live: Torneo2RemoteLiveRow; station: 1 | 2 }
  | { ok: false; status: number; error: string };

const TORNEO2_REMOTE_LIVE_SELECT =
  "station1_match_id, station2_match_id, remote_session_public_id";

export function torneo2StationForMatch(
  live: Torneo2RemoteLiveRow,
  matchId: string
): 1 | 2 | null {
  if (!matchId) return null;
  if (live.station1_match_id === matchId) return 1;
  if (live.station2_match_id === matchId) return 2;
  return null;
}

export async function loadTorneo2RemoteLiveSession(
  admin: SupabaseClient,
  campaignId: string,
  remotePublicId: string
): Promise<{ live: Torneo2RemoteLiveRow | null; error: string | null }> {
  const { data, error } = await admin
    .from("torneo2_live_sessions")
    .select(TORNEO2_REMOTE_LIVE_SELECT)
    .eq("campaign_id", campaignId)
    .eq("status", "live")
    .eq("remote_session_public_id", remotePublicId)
    .maybeSingle();

  if (error) return { live: null, error: error.message };
  return { live: (data as Torneo2RemoteLiveRow | null) ?? null, error: null };
}

export async function requireTorneo2RemoteStationMatch(
  admin: SupabaseClient,
  campaignId: string,
  remotePublicId: string,
  matchId: string
): Promise<Torneo2RemoteMatchCheck> {
  const { live, error } = await loadTorneo2RemoteLiveSession(admin, campaignId, remotePublicId);
  if (error) return { ok: false, status: 500, error };
  if (!live) return { ok: false, status: 403, error: "live_session_not_found" };

  const station = torneo2StationForMatch(live, matchId);
  if (!station) return { ok: false, status: 403, error: "match_not_on_live_station" };

  return { ok: true, live, station };
}
