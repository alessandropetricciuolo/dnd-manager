import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("campaign documents enforce Admin writes, hide GM/player reads and protect indexed copies atomically", async () => {
  const { PGlite } = await import(process.env.PGLITE_TEST_MODULE ?? "@electric-sql/pglite");
  const db = new PGlite();
  const campaign = "11111111-1111-4111-8111-111111111111";
  const entity = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`
      CREATE ROLE authenticated; CREATE ROLE anon;
      CREATE TABLE wiki_entities(id uuid PRIMARY KEY, campaign_id uuid, name text, admin_only boolean NOT NULL DEFAULT false, archived_at timestamptz);
      CREATE TABLE campaign_memory_chunks(campaign_id uuid, source_type text, source_id uuid, admin_only boolean NOT NULL DEFAULT false);
      CREATE FUNCTION is_global_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT current_setting('test.actor', true) = 'admin' $$;
      ALTER TABLE wiki_entities ENABLE ROW LEVEL SECURITY;
      CREATE POLICY legacy_access ON wiki_entities FOR ALL TO public USING (true) WITH CHECK (true);
      GRANT SELECT, INSERT, UPDATE, DELETE ON wiki_entities TO authenticated, anon;
      INSERT INTO wiki_entities VALUES ('${entity}', '${campaign}', 'Dossier', false, '2026-10-09');
      INSERT INTO campaign_memory_chunks VALUES ('${campaign}', 'wiki', '${entity}', false);
    `);
    await db.exec(await readFile("supabase/migrations/20261010192905_campaign_documents.sql", "utf8"));
    await db.exec("SET ROLE authenticated; SELECT set_config('test.actor', 'gm', false);");
    await assert.rejects(db.exec(`UPDATE wiki_entities SET is_campaign_document=true, admin_only=true WHERE id='${entity}'`), /campaign_document_requires_admin/);
    await db.exec("SELECT set_config('test.actor', 'admin', false);");
    await assert.rejects(db.exec(`UPDATE wiki_entities SET is_campaign_document=true WHERE id='${entity}'`), /campaign_document_is_admin_only/);
    await db.exec(`UPDATE wiki_entities SET is_campaign_document=true, admin_only=true WHERE id='${entity}'`);
    assert.equal((await db.query("SELECT * FROM wiki_entities")).rows.length, 1);
    for (const actor of ["gm", "player"]) {
      await db.exec(`SELECT set_config('test.actor', '${actor}', false);`);
      assert.equal((await db.query("SELECT * FROM wiki_entities")).rows.length, 0);
      await assert.rejects(db.exec(`INSERT INTO wiki_entities VALUES (gen_random_uuid(), '${campaign}', 'Unauthorized', true, null, true)`), /campaign_document_requires_admin/);
    }
    await db.exec("SET ROLE anon; SELECT set_config('test.actor', '', false);");
    assert.equal((await db.query("SELECT * FROM wiki_entities")).rows.length, 0);
    await db.exec("RESET ROLE;");
    assert.equal((await db.query("SELECT admin_only FROM campaign_memory_chunks")).rows[0].admin_only, true);
    await db.exec("SET ROLE authenticated; SELECT set_config('test.actor', 'admin', false);");
    await db.exec("UPDATE wiki_entities SET is_campaign_document=false;");
    const restored = (await db.query("SELECT * FROM wiki_entities")).rows[0];
    assert.equal(restored.admin_only, true);
    assert.ok(restored.archived_at, "Wiki archiving is independent and preserved");
    assert.equal(restored.id, entity, "Identity survives moves");
    await db.exec("RESET ROLE; ALTER TABLE campaign_memory_chunks ADD CONSTRAINT reject_refresh CHECK (false) NOT VALID; SET ROLE authenticated;");
    await assert.rejects(db.exec("UPDATE wiki_entities SET is_campaign_document=true;"), /reject_refresh/);
    assert.equal((await db.query("SELECT is_campaign_document FROM wiki_entities")).rows[0].is_campaign_document, false, "Failed memory protection rolls back the move");
  } finally { await db.close(); }
});
