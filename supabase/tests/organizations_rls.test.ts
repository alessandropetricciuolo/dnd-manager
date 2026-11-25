import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const superAdminId = "11111111-1111-4111-8111-111111111111";
const orgAdminId = "22222222-2222-4222-8222-222222222222";
const regularUserId = "33333333-3333-4333-8333-333333333333";
const orgA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const orgB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("organizations RLS blocks anon and foreign users, allows org-admin on own org and super-admin on all", async () => {
  const { PGlite } = await import(process.env.PGLITE_TEST_MODULE ?? "@electric-sql/pglite");
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('test.uid', true), '')::uuid
      $$;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

      CREATE TABLE public.organizations (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        plan text NOT NULL DEFAULT 'free'
      );

      -- Simulate insecure pre-migration grants
      GRANT ALL ON TABLE public.organizations TO anon, authenticated, service_role;

      CREATE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT auth.uid() = '${superAdminId}'::uuid
      $$;
      CREATE FUNCTION public.is_org_admin(p_org_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT auth.uid() = '${orgAdminId}'::uuid AND p_org_id = '${orgA}'::uuid
      $$;

      INSERT INTO public.organizations (id, name, plan) VALUES
        ('${orgA}', 'Barber & Dragons Guild', 'pro'),
        ('${orgB}', 'Other Organization', 'enterprise');
    `);

    const migration = await readFile("supabase/migrations/20261122120000_harden_organizations_rls.sql", "utf8");
    await db.exec(migration);

    // 1. anon: denied all operations
    await db.exec("SET ROLE anon; SELECT set_config('test.uid', '', false);");
    await assert.rejects(db.query("SELECT * FROM public.organizations"), /permission denied/i);
    await assert.rejects(
      db.query(`INSERT INTO public.organizations (id, name) VALUES (gen_random_uuid(), 'hack')`),
      /permission denied/i
    );
    await db.exec("RESET ROLE;");

    // 2. regular authenticated user: 0 rows visible, writes denied
    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${regularUserId}', false);`);
    const regRows = await db.query("SELECT id FROM public.organizations");
    assert.equal(regRows.rows.length, 0);
    await assert.rejects(
      db.query(`INSERT INTO public.organizations (id, name) VALUES (gen_random_uuid(), 'hack')`),
      /permission denied/i
    );
    await assert.rejects(
      db.query(`UPDATE public.organizations SET plan = 'pro' WHERE id = '${orgA}'`),
      /permission denied/i
    );
    await assert.rejects(
      db.query(`DELETE FROM public.organizations WHERE id = '${orgA}'`),
      /permission denied/i
    );
    await db.exec("RESET ROLE;");

    // 3. org_admin of orgA: sees only orgA, cannot write
    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${orgAdminId}', false);`);
    const orgAdminRows = await db.query("SELECT id FROM public.organizations");
    assert.deepEqual(orgAdminRows.rows.map((r: { id: string }) => r.id), [orgA]);
    await assert.rejects(
      db.query(`UPDATE public.organizations SET plan = 'enterprise' WHERE id = '${orgA}'`),
      /permission denied/i
    );
    await db.exec("RESET ROLE;");

    // 4. super_admin: sees all orgs
    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${superAdminId}', false);`);
    const superRows = await db.query("SELECT id FROM public.organizations ORDER BY name");
    assert.equal(superRows.rows.length, 2);
    await db.exec("RESET ROLE;");

    // 5. service_role: full access
    await db.exec("SET ROLE service_role;");
    const svcRows = await db.query("SELECT id FROM public.organizations");
    assert.equal(svcRows.rows.length, 2);
    await db.query(`UPDATE public.organizations SET plan = 'enterprise' WHERE id = '${orgA}'`);
    await db.exec("RESET ROLE;");
  } finally {
    await db.close();
  }
});
