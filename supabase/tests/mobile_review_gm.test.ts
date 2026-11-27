import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const owner = "10000000-0000-4000-8000-000000000001";
const otherGm = "10000000-0000-4000-8000-000000000002";
const demo = "20000000-0000-4000-8000-000000000001";
const real = "20000000-0000-4000-8000-000000000002";
const demoSession = "30000000-0000-4000-8000-000000000001";
const realSession = "30000000-0000-4000-8000-000000000002";

test("review account can manage demo pairing and cannot access other records or create campaigns", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
        AS $$ SELECT current_setting('test.uid', true)::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE
        AS $$ SELECT current_setting('test.jwt', true)::jsonb $$;

      CREATE TABLE public.campaigns (id uuid PRIMARY KEY, gm_id uuid NOT NULL, is_public bool NOT NULL);
      CREATE TABLE public.sessions (id uuid PRIMARY KEY, campaign_id uuid NOT NULL);
      CREATE TABLE public.campaign_characters (campaign_id uuid NOT NULL);
      CREATE TABLE public.campaign_members (campaign_id uuid NOT NULL);
      CREATE TABLE public.session_signups (session_id uuid NOT NULL);
      CREATE TABLE public.gm_remote_sessions (campaign_id uuid NOT NULL, created_by uuid NOT NULL, revoked bool NOT NULL DEFAULT false);
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

      INSERT INTO campaigns VALUES ('${demo}', '${owner}', false), ('${real}', '${otherGm}', true);
      INSERT INTO sessions VALUES ('${demoSession}', '${demo}'), ('${realSession}', '${real}');
      INSERT INTO campaign_characters VALUES ('${demo}'), ('${real}');
      INSERT INTO campaign_members VALUES ('${demo}'), ('${real}');
      INSERT INTO session_signups VALUES ('${demoSession}'), ('${realSession}');

      ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
      CREATE POLICY campaign_read ON campaigns FOR SELECT USING (is_public OR gm_id = auth.uid());
      CREATE POLICY campaign_create ON campaigns FOR INSERT WITH CHECK (gm_id = auth.uid());
      CREATE POLICY campaign_manage ON campaigns FOR ALL USING (gm_id = auth.uid());
      ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY session_access ON sessions FOR ALL USING (true);
      ALTER TABLE campaign_characters ENABLE ROW LEVEL SECURITY;
      CREATE POLICY character_access ON campaign_characters FOR ALL USING (true);
      ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
      CREATE POLICY member_access ON campaign_members FOR ALL USING (true);
      ALTER TABLE session_signups ENABLE ROW LEVEL SECURITY;
      CREATE POLICY signup_access ON session_signups FOR ALL USING (true);
      ALTER TABLE gm_remote_sessions ENABLE ROW LEVEL SECURITY;
      CREATE POLICY regular_gm_pairing ON gm_remote_sessions FOR ALL USING (auth.uid() = '${otherGm}');
    `);
    await db.exec(await readFile(
      new URL("../migrations/20261127111040_restrict_mobile_review_gm.sql", import.meta.url), "utf8",
    ));
    await db.exec(`
      SET ROLE authenticated;
      SET test.uid = '${owner}';
      SET test.jwt = '{"app_metadata":{"review_gm_campaign_id":"${demo}"}}';
    `);
    assert.deepEqual((await db.query("SELECT id FROM campaigns")).rows, [{ id: demo }]);
    assert.deepEqual((await db.query("SELECT id FROM sessions")).rows, [{ id: demoSession }]);
    for (const table of ["campaign_characters", "campaign_members"]) {
      assert.deepEqual((await db.query(`SELECT campaign_id FROM ${table}`)).rows, [{ campaign_id: demo }]);
    }
    assert.deepEqual((await db.query("SELECT session_id FROM session_signups")).rows, [{ session_id: demoSession }]);
    assert.equal((await db.query("UPDATE campaigns SET is_public = true RETURNING id")).rows.length, 0);
    await assert.rejects(db.query("INSERT INTO campaigns VALUES (gen_random_uuid(), $1, false)", [owner]), /row-level security/);
    await assert.rejects(db.query("UPDATE sessions SET campaign_id = $1", [real]), /row-level security/);
    await assert.rejects(db.query("INSERT INTO session_signups VALUES ($1)", [realSession]), /row-level security/);

    await db.query("INSERT INTO gm_remote_sessions VALUES ($1, $2)", [demo, owner]);
    assert.deepEqual((await db.query("UPDATE gm_remote_sessions SET revoked = true RETURNING campaign_id")).rows, [{ campaign_id: demo }]);
    await assert.rejects(db.query("INSERT INTO gm_remote_sessions VALUES ($1, $2)", [real, owner]), /row-level security/);
    await assert.rejects(db.query("INSERT INTO gm_remote_sessions VALUES ($1, $2)", [demo, otherGm]), /row-level security/);
    await db.exec(`SET test.uid = '${otherGm}'; SET test.jwt = '{}';`);
    await db.query("INSERT INTO gm_remote_sessions VALUES ($1, $2)", [real, otherGm]);
    assert.equal((await db.query("SELECT id FROM sessions")).rows.length, 2);
  } finally {
    await db.close();
  }
});
