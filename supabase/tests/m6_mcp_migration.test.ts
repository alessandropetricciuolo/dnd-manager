import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const campaign = "11111111-1111-4111-8111-111111111111";
const admin = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("M6 migration smoke: Admin audit and revision trigger are transactional", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY, role text);
      CREATE TABLE public.campaigns(id uuid PRIMARY KEY, admin_drafts_enabled boolean NOT NULL);
      CREATE TABLE public.wiki_entities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid REFERENCES campaigns(id), type text, name text, content jsonb DEFAULT '{}'::jsonb, attributes jsonb DEFAULT '{}'::jsonb, admin_only boolean DEFAULT false);
      CREATE OR REPLACE FUNCTION public.is_global_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin') $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT SELECT, INSERT, UPDATE ON profiles, campaigns, wiki_entities TO authenticated;
      INSERT INTO profiles VALUES('${admin}', 'admin'); INSERT INTO campaigns VALUES('${campaign}', true);
    `);
    await db.exec(await readFile("supabase/migrations/20260910140000_mcp_admin_only.sql", "utf8"));
    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${admin}', false);`);
    const inserted = (await db.query(`INSERT INTO wiki_entities(campaign_id,type,name,admin_only) VALUES('${campaign}','lore','Secret',true) RETURNING id,mcp_revision`)).rows[0] as { id: string; mcp_revision: number };
    assert.equal(inserted.mcp_revision, 1);
    assert.equal((await db.query("SELECT entity_id,action FROM mcp_write_audit")).rows.length, 1);
    await db.query(`UPDATE wiki_entities SET name='Secret 2' WHERE id=$1 AND mcp_revision=1`, [inserted.id]);
    assert.equal((await db.query("SELECT mcp_revision FROM wiki_entities WHERE id=$1", [inserted.id])).rows[0].mcp_revision, 2);
    await db.exec("RESET ROLE; ALTER TABLE mcp_write_audit ADD CONSTRAINT m6_reject CHECK (false) NOT VALID;");
    await assert.rejects(db.query(`UPDATE wiki_entities SET name='must rollback' WHERE id=$1`, [inserted.id]), /m6_reject/);
    assert.equal((await db.query("SELECT name FROM wiki_entities WHERE id=$1", [inserted.id])).rows[0].name, "Secret 2");
  } finally { await db.close(); }
});
