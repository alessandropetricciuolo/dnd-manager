import test from "node:test";
import assert from "node:assert/strict";
import { validateTorneo2RemoteWritableMatch } from "@/lib/torneo2/remote-scope";

const live = {
  remote_session_public_id: "remote-current",
  station1_match_id: "match-a",
  station2_match_id: "match-b",
};

test("remote write scope accepts only active matches assigned to the current remote live session", () => {
  assert.deepEqual(
    validateTorneo2RemoteWritableMatch({
      live,
      remotePublicId: "remote-current",
      matchId: "match-a",
      matchStatus: "active",
    }),
    { ok: true }
  );
});

test("remote write scope rejects stale live tokens", () => {
  assert.deepEqual(
    validateTorneo2RemoteWritableMatch({
      live,
      remotePublicId: "remote-old",
      matchId: "match-a",
      matchStatus: "active",
    }),
    { ok: false, error: "remote_not_current", status: 403 }
  );
});

test("remote write scope rejects off-station and non-active matches", () => {
  assert.deepEqual(
    validateTorneo2RemoteWritableMatch({
      live,
      remotePublicId: "remote-current",
      matchId: "match-c",
      matchStatus: "active",
    }),
    { ok: false, error: "match_not_on_station", status: 403 }
  );

  assert.deepEqual(
    validateTorneo2RemoteWritableMatch({
      live,
      remotePublicId: "remote-current",
      matchId: "match-a",
      matchStatus: "pending",
    }),
    { ok: false, error: "match_not_active", status: 409 }
  );
});
