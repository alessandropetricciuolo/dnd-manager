import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const player = "11111111-1111-4111-8111-111111111111";
const gm = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
const campaign = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const whisper = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("mobile account and whisper safety migration enforces scoped reports, reciprocal blocks and service access", async () => {
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
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id));
      CREATE TABLE public.campaigns(id uuid PRIMARY KEY, gm_id uuid NOT NULL REFERENCES public.profiles(id));
      CREATE TABLE public.secret_whispers(
        id uuid PRIMARY KEY,
        campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
        sender_id uuid NOT NULL REFERENCES public.profiles(id),
        receiver_id uuid NOT NULL REFERENCES public.profiles(id),
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.secret_whispers ENABLE ROW LEVEL SECURITY;
      CREATE POLICY secret_whispers_select ON public.secret_whispers FOR SELECT TO authenticated
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR EXISTS (
          SELECT 1 FROM public.campaigns c WHERE c.id = secret_whispers.campaign_id AND c.gm_id = auth.uid()
        ));
      CREATE POLICY secret_whispers_insert ON public.secret_whispers FOR INSERT TO authenticated
        WITH CHECK (auth.uid() = sender_id AND EXISTS (
          SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND (c.gm_id = sender_id OR c.gm_id = receiver_id)
        ));
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT SELECT, INSERT ON public.secret_whispers TO authenticated;
      GRANT SELECT ON public.campaigns, public.profiles TO authenticated;
      INSERT INTO auth.users VALUES ('${player}'), ('${gm}'), ('${outsider}');
      INSERT INTO public.profiles VALUES ('${player}'), ('${gm}'), ('${outsider}');
      INSERT INTO public.campaigns VALUES ('${campaign}', '${gm}');
      INSERT INTO public.secret_whispers VALUES ('${whisper}', '${campaign}', '${player}', '${gm}', 'private text');
    `);
    const migration = await readFile("supabase/migrations/20261013181537_mobile_account_and_whisper_safety.sql", "utf8");
    await db.exec(migration);

    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${player}', false);`);
    await db.exec(`INSERT INTO public.whisper_user_blocks(blocker_id, blocked_id) VALUES ('${player}', '${gm}')`);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.whisper_user_blocks")).rows[0].n, 1);
    await assert.rejects(
      db.exec(`INSERT INTO public.secret_whispers(id,campaign_id,sender_id,receiver_id,message) VALUES(gen_random_uuid(),'${campaign}','${player}','${gm}','blocked')`),
      /row-level security/i,
    );
    await assert.rejects(
      db.exec(`INSERT INTO public.whisper_reports(reporter_id,reported_user_id,whisper_id,campaign_id,reason) VALUES ('${player}','${outsider}','${whisper}','${campaign}','abuse')`),
      /row-level security/i,
    );
    await db.exec(`INSERT INTO public.whisper_reports(reporter_id,reported_user_id,whisper_id,campaign_id,reason) VALUES ('${player}','${gm}','${whisper}','${campaign}','abuse')`);
    await db.exec("RESET ROLE;");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.whisper_reports")).rows[0].n, 1);

    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${gm}', false);`);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.whisper_user_blocks")).rows[0].n, 0, "other users cannot read a block list");
    await assert.rejects(
      db.exec(`INSERT INTO public.secret_whispers(id,campaign_id,sender_id,receiver_id,message) VALUES(gen_random_uuid(),'${campaign}','${gm}','${player}','blocked')`),
      /row-level security/i,
    );
    await db.exec("RESET ROLE;");
    await assert.rejects(
      db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${player}', false); INSERT INTO public.account_deletion_requests(user_id) VALUES ('${player}')`),
      /permission denied/i,
    );
    await db.exec("RESET ROLE; SET ROLE service_role;");
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.whisper_user_blocks")).rows[0].n, 1);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.whisper_reports")).rows[0].n, 1);
    await db.exec(`INSERT INTO public.account_deletion_requests(user_id) VALUES ('${player}')`);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.account_deletion_requests")).rows[0].n, 1);
  } finally {
    await db.close();
  }
});
