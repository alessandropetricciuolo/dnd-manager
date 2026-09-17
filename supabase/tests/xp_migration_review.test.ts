import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationDir = path.resolve(__dirname, "../migrations");
const m1Path = path.join(migrationDir, "20260917120000_session_xp_reliability.sql");
const m2Path = path.join(migrationDir, "20260917130000_character_xp_canonical_and_confirmation.sql");

const m1 = readFileSync(m1Path, "utf8");
const m2 = readFileSync(m2Path, "utf8");

test("M1 is ordered before M2 and both migrations are repeatable", () => {
  assert.ok(path.basename(m1Path) < path.basename(m2Path));
  assert.match(m1, /CREATE TABLE IF NOT EXISTS public\.session_xp_awards/);
  assert.match(m1, /ADD COLUMN IF NOT EXISTS pre_closed_xp_gained/);
  assert.match(m2, /ADD COLUMN IF NOT EXISTS xp_after/);
  assert.doesNotMatch(m1, /\b(DROP TABLE|TRUNCATE|DELETE FROM)\b/i);
  assert.doesNotMatch(m2, /\b(DROP TABLE|TRUNCATE|DELETE FROM)\b/i);
});

test("migration installation does not backfill or overwrite existing XP totals", () => {
  const beforeFirstFunction = (sql: string) => sql.slice(0, sql.search(/CREATE OR REPLACE FUNCTION/i));
  for (const sql of [m1, m2]) {
    assert.doesNotMatch(
      beforeFirstFunction(sql),
      /\bUPDATE\s+public\.(campaign_members|campaign_characters|profiles|sessions)\b/i
    );
  }
});

test("M1 protects atomicity, idempotency, and campaign authorization", () => {
  assert.match(m1, /SET row_security = off/);
  assert.match(m1, /FOR UPDATE/);
  assert.match(m1, /ON CONFLICT \(session_id, player_id\) DO NOTHING/);
  assert.match(m1, /IF v_session\.status = 'completed'/);
  assert.match(m1, /c\.gm_id = p_actor_id/);
  assert.match(m1, /GRANT EXECUTE ON FUNCTION public\.session_actor_can_manage/);
  assert.match(m1, /ENABLE ROW LEVEL SECURITY/);
  assert.match(m1, /REVOKE ALL ON TABLE public\.session_xp_awards FROM anon, authenticated/);
});

test("M2 preserves sheet canonicality and records persisted confirmation", () => {
  assert.match(m2, /IF v_character\.assigned_to IS NULL/);
  assert.match(m2, /SET current_xp = v_next_xp/);
  assert.match(m2, /SET xp_earned = EXCLUDED\.xp_earned/);
  assert.match(m2, /SET xp_after = COALESCE/);
  assert.match(m2, /GRANT EXECUTE ON FUNCTION public\.close_session_with_xp_persisted/);
});
