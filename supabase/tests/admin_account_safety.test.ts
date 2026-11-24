import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const admin = "11111111-1111-4111-8111-111111111111";
const gm = "22222222-2222-4222-8222-222222222222";
const player = "33333333-3333-4333-8333-333333333333";
const campaign = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const whisper = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("moderation is private and account deletion transfers ownership atomically", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('test.uid', true), '')::uuid
      $$;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
      CREATE TABLE auth.identities(provider text, provider_id text);
      CREATE TABLE storage.objects(owner_id text, bucket_id text);
      CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE, role text NOT NULL);
      CREATE TABLE public.campaigns(id uuid PRIMARY KEY, gm_id uuid NOT NULL REFERENCES public.profiles ON DELETE CASCADE);
      CREATE TABLE public.sessions(id uuid PRIMARY KEY, dm_id uuid REFERENCES public.profiles);
      CREATE TABLE public.characters(assigned_to uuid REFERENCES public.profiles);
      CREATE TABLE public.gm_attachments(uploaded_by uuid REFERENCES public.profiles);
      CREATE TABLE public.access_grants(created_by uuid REFERENCES auth.users, updated_by uuid REFERENCES auth.users);
      CREATE TABLE public.access_obligation_responses(reopened_by uuid REFERENCES auth.users);
      CREATE TABLE public.ai_budget_ledger_entries(user_id uuid REFERENCES auth.users);
      CREATE TABLE public.ai_budget_ledgers(subscription_holder_user_id uuid REFERENCES auth.users);
      CREATE TABLE public.secret_whispers(
        id uuid PRIMARY KEY, campaign_id uuid REFERENCES public.campaigns,
        sender_id uuid REFERENCES public.profiles ON DELETE CASCADE,
        receiver_id uuid REFERENCES public.profiles ON DELETE CASCADE, message text
      );
      CREATE TABLE public.campaign_memory_chunks(campaign_id uuid, source_type text, source_id uuid);
      CREATE TABLE public.extra_profile_reference(profile_id uuid REFERENCES public.profiles);
      ALTER TABLE public.secret_whispers ENABLE ROW LEVEL SECURITY;
      CREATE POLICY participants ON public.secret_whispers FOR SELECT TO authenticated
        USING (auth.uid() IN (sender_id, receiver_id));
      GRANT SELECT, INSERT ON public.secret_whispers TO authenticated;
      GRANT SELECT ON public.campaigns TO authenticated;
      INSERT INTO auth.users VALUES ('${admin}', 'admin@example.test', now()), ('${gm}', 'gm@example.test', now()), ('${player}', 'player@example.test', NULL);
      INSERT INTO auth.identities VALUES ('apple', 'apple-user'), ('google', 'google-user');
      INSERT INTO public.profiles VALUES ('${admin}', 'admin'), ('${gm}', 'gm'), ('${player}', 'player');
      INSERT INTO public.campaigns VALUES ('${campaign}', '${gm}');
      INSERT INTO public.sessions VALUES (gen_random_uuid(), '${gm}');
      INSERT INTO public.characters VALUES ('${gm}');
      INSERT INTO public.extra_profile_reference VALUES ('${gm}');
    `);
    const base = await readFile("supabase/migrations/20261013181537_mobile_account_and_whisper_safety.sql", "utf8");
    const migration = await readFile("supabase/migrations/20261124110006_admin_account_deletion_and_whisper_moderation.sql", "utf8");
    await db.exec(base);
    await db.exec(migration);
    await db.exec(await readFile("supabase/migrations/20261124205433_apple_signin_token_revocation.sql", "utf8"));

    await db.exec(await readFile("supabase/migrations/20261124225606_apple_web_signin_revocation.sql", "utf8"));

    await db.exec(`SET ROLE service_role;
      INSERT INTO public.apple_sign_in_tokens (user_id, encrypted_refresh_token)
        VALUES ('${gm}', 'encrypted-apple-token');
      INSERT INTO public.apple_sign_in_tokens (user_id, encrypted_web_refresh_token)
        VALUES ('${gm}', 'encrypted-web-token')
        ON CONFLICT (user_id) DO UPDATE SET encrypted_web_refresh_token = excluded.encrypted_web_refresh_token;
      INSERT INTO public.apple_sign_in_tokens (user_id, encrypted_web_refresh_token)
        VALUES ('${player}', 'web-only-token')`);
    assert.deepEqual((await db.query(`
      SELECT public.has_existing_apple_account('apple-user', NULL) AS apple,
        public.has_existing_apple_account('unknown', 'GM@example.test') AS verified,
        public.has_existing_apple_account('google-user', 'player@example.test') AS unverified
    `)).rows, [{ apple: true, verified: true, unverified: false }]);
    await db.exec("RESET ROLE");

    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${player}', false)`);
    await assert.rejects(db.query("SELECT * FROM public.apple_sign_in_tokens"), /permission denied/);
    await assert.rejects(db.query("SELECT public.has_existing_apple_account('apple-user', NULL)"), /permission denied/);
    const send = `INSERT INTO public.secret_whispers VALUES ('${whisper}', '${campaign}', '${player}', '${gm}', 'message')`;
    await assert.rejects(db.exec(send), /Accetta le regole/);
    assert.deepEqual((await db.query("SELECT public.has_whisper_rules_v1() AS accepted")).rows, [{ accepted: false }]);
    await db.exec("SELECT public.accept_whisper_rules_v1(); SELECT public.accept_whisper_rules_v1()");
    assert.deepEqual((await db.query("SELECT public.has_whisper_rules_v1() AS accepted")).rows, [{ accepted: true }]);
    await db.exec(send);
    await assert.rejects(db.exec(`SELECT public.complete_barber_account_deletion('${gm}', '${admin}')`), /permission denied/);
    const reportValues = `'${player}', '${gm}', '${whisper}', '${campaign}', 'abuse'`;
    await assert.rejects(db.exec(`
      INSERT INTO public.whisper_reports(reporter_id,reported_user_id,whisper_id,campaign_id,reason,review_outcome)
      VALUES (${reportValues}, 'dismissed')
    `), /permission denied/);
    await db.exec(`INSERT INTO public.whisper_reports(reporter_id,reported_user_id,whisper_id,campaign_id,reason) VALUES (${reportValues})`);
    await assert.rejects(db.query("SELECT * FROM public.whisper_reports"), /permission denied/);
    await db.exec("RESET ROLE");

    await db.exec(`INSERT INTO public.campaign_memory_chunks VALUES ('${campaign}', 'secret_whisper', '${whisper}');
      INSERT INTO public.account_deletion_requests(user_id) VALUES ('${gm}'); SET ROLE service_role`);
    await assert.rejects(db.query(`SELECT public.complete_barber_account_deletion('${gm}', '${admin}')`), /segnalazioni Whisper aperte/);
    const { rows: [report] } = await db.query<{ id: string }>("SELECT id FROM public.whisper_reports");
    await assert.rejects(db.query("SELECT public.review_whisper_report($1, $2, true)", [report.id, player]), /Solo un admin/);
    assert.deepEqual((await db.query("SELECT public.review_whisper_report($1, $2, true) AS reviewed", [report.id, admin])).rows, [{ reviewed: true }]);
    assert.deepEqual((await db.query("SELECT public.review_whisper_report($1, $2, false) AS reviewed", [report.id, admin])).rows, [{ reviewed: false }]);
    await db.exec("RESET ROLE");
    assert.deepEqual((await db.query("SELECT review_outcome, reviewed_by FROM public.whisper_reports")).rows, [{ review_outcome: "removed", reviewed_by: admin }]);
    assert.equal((await db.query("SELECT id FROM public.secret_whispers")).rows.length, 0);
    assert.equal((await db.query("SELECT source_id FROM public.campaign_memory_chunks")).rows.length, 0);

    await db.exec(`INSERT INTO storage.objects VALUES ('${gm}', 'campaign_maps'); SET ROLE service_role`);
    const remove = `SELECT public.complete_barber_account_deletion('${gm}', '${admin}') AS receipt`;
    await assert.rejects(db.query(remove), /campaign_maps \(1\)/);
    await db.exec("RESET ROLE; DELETE FROM storage.objects");

    await db.exec("SET ROLE service_role");
    await assert.rejects(db.query(remove), /Cancellazione annullata/);
    await db.exec("RESET ROLE");
    assert.deepEqual((await db.query("SELECT gm_id FROM public.campaigns")).rows, [{ gm_id: gm }]);
    assert.deepEqual((await db.query("SELECT status FROM public.account_deletion_requests")).rows, [{ status: "pending" }]);
    await db.exec("DELETE FROM public.extra_profile_reference; SET ROLE service_role");
    const { rows: [result] } = await db.query<{ receipt: string }>(remove);
    await assert.rejects(db.query(remove), /Account già eliminato/);
    await db.exec("RESET ROLE");
    assert.deepEqual((await db.query("SELECT gm_id FROM public.campaigns")).rows, [{ gm_id: admin }]);
    assert.deepEqual((await db.query("SELECT dm_id FROM public.sessions")).rows, [{ dm_id: admin }]);
    assert.deepEqual((await db.query("SELECT assigned_to FROM public.characters")).rows, [{ assigned_to: null }]);
    assert.equal((await db.query("SELECT id FROM auth.users WHERE id = $1", [gm])).rows.length, 0);
    assert.equal((await db.query("SELECT user_id FROM public.apple_sign_in_tokens WHERE user_id = $1", [gm])).rows.length, 0);
    assert.deepEqual((await db.query("SELECT id, status, user_id, confirmation_email, apple_revocation_token, apple_web_revocation_token FROM public.account_deletion_requests")).rows,
      [{ id: result.receipt, status: "completed", user_id: null, confirmation_email: "gm@example.test", apple_revocation_token: "encrypted-apple-token", apple_web_revocation_token: "encrypted-web-token" }]);
  } finally {
    await db.close();
  }
});
