import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationDir = path.resolve(__dirname, "../migrations");
const migrationPath = path.join(migrationDir, "20261002120000_allow_all_gms_to_close_sessions.sql");
const prevMigrationPath = path.join(migrationDir, "20260928120000_oneshot_assignment_reset_on_close.sql");

const sql = readFileSync(migrationPath, "utf8");

test("migration is ordered after prior session migrations", () => {
  assert.ok(path.basename(prevMigrationPath) < path.basename(migrationPath));
});

test("migration updates session_actor_can_manage to allow all GMs and admins", () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.session_actor_can_manage/);
  assert.match(sql, /p\.role = 'admin'/);
  assert.match(sql, /p\.role = 'gm'/);
  assert.match(sql, /c\.gm_id = p_actor_id/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.session_actor_can_manage\(UUID, UUID\) TO service_role/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.session_actor_can_manage\(UUID, UUID\) FROM PUBLIC, anon, authenticated/);
});
