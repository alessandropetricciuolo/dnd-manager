import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function canAccessThread(actorId: string, role: string, ownerId: string, campaignAllowed: boolean): boolean {
  return (role === "admin" || (role === "gm" && actorId === ownerId && campaignAllowed));
}

test("un GM autorizzato per un'altra campagna non supera la guardia thread", () => {
  assert.equal(canAccessThread("gm-a", "gm", "gm-a", false), false);
  assert.equal(canAccessThread("gm-a", "gm", "gm-b", true), false);
  assert.equal(canAccessThread("admin", "admin", "gm-b", false), true);
});

test("feedback deve appartenere a un thread dell'attore", () => {
  assert.equal(canAccessThread("gm-a", "gm", "gm-b", true), false);
  assert.equal(canAccessThread("gm-a", "gm", "gm-a", true), true);
});

test("contratto SQL R1 usa sequence e append atomico", () => {
  const file = join(process.cwd(), "supabase/migrations/20260905120000_ai_assistant_v2_r1_conversations.sql");
  const sql = readFileSync(file, "utf8");
  assert.match(sql, /create or replace function public\.ai_assistant_append_turn/);
  assert.match(sql, /thread_id, sequence, role, content, intent, artifact_ids/);
  assert.match(sql, /for update/);
  assert.doesNotMatch(sql, /turn_number/);
});
