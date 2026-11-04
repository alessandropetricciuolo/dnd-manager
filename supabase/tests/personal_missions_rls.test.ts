import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("personal missions RLS: comprehensive authorization and barrier verification", async () => {
  const db = new PGlite();
  const campaignA = "11111111-1111-4111-8111-111111111111";
  const campaignB = "22222222-2222-4222-8222-222222222222";
  const adminId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const gmAId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbba";
  const foreignGmId = "cccccccc-cccc-4ccc-8ccc-cccccccccccb";
  const memberPlayerId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const nonMemberPlayerId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

  const orgMissionId = "33333333-3333-4333-8333-333333333333";
  const personalMissionId = "44444444-4444-4444-8444-444444444444";

  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('test.uid', true), '')::uuid
      $$;

      CREATE TABLE public.profiles(
        id uuid PRIMARY KEY,
        role text NOT NULL CHECK (role IN ('player', 'gm', 'admin'))
      );

      CREATE TABLE public.campaigns(
        id uuid PRIMARY KEY,
        gm_id uuid REFERENCES public.profiles(id),
        organization_id uuid
      );

      CREATE TABLE public.campaign_members(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
        player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
      );

      CREATE TABLE public.campaign_guilds(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
        name text NOT NULL,
        score integer DEFAULT 0
      );

      -- Project canonical authorization functions from real migrations
      CREATE OR REPLACE FUNCTION public.is_gm_or_admin()
      RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid() AND role IN ('gm', 'admin')
        );
      $$;

      CREATE OR REPLACE FUNCTION public.can_manage_campaign_as_gm(p_campaign_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
        SELECT public.is_gm_or_admin()
          OR EXISTS (
            SELECT 1 FROM public.campaigns c
            WHERE c.id = p_campaign_id AND c.gm_id = auth.uid()
          );
      $$;

      CREATE TABLE public.campaign_missions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
        grade text NOT NULL,
        title text NOT NULL,
        committente text NOT NULL,
        ubicazione text NOT NULL,
        paga text NOT NULL,
        urgenza text NOT NULL,
        description text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        points_reward integer NOT NULL DEFAULT 0,
        completed_by_guild_id uuid,
        completed_at timestamptz,
        treasure_gp integer DEFAULT 0,
        treasure_sp integer DEFAULT 0,
        treasure_cp integer DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      ALTER TABLE public.campaign_missions ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;

      -- Seed real users and campaigns
      INSERT INTO public.profiles VALUES
        ('${adminId}', 'admin'),
        ('${gmAId}', 'gm'),
        ('${foreignGmId}', 'gm'),
        ('${memberPlayerId}', 'player'),
        ('${nonMemberPlayerId}', 'player');

      INSERT INTO public.campaigns VALUES
        ('${campaignA}', '${gmAId}', null),
        ('${campaignB}', '${foreignGmId}', null);

      -- memberPlayerId is member of Campaign A; foreignGmId has NO membership and NO ownership in Campaign A
      INSERT INTO public.campaign_members (campaign_id, player_id) VALUES
        ('${campaignA}', '${memberPlayerId}');
    `);

    // Apply incremental migration under test
    const migrationSql = await readFile("supabase/migrations/20261104140000_personal_missions_off_egida.sql", "utf8");
    await db.exec(migrationSql);

    // =========================================================================
    // 1. Owning GM on Campaign A
    // =========================================================================
    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${gmAId}', false);`);
    const insertOrgA = await db.query<{ id: string }>(`
      INSERT INTO public.campaign_missions (id, campaign_id, mission_kind, grade, title, committente, ubicazione, paga, urgenza, description, points_reward)
      VALUES ('${orgMissionId}', '${campaignA}', 'organization', 'C', 'Taglia Goblin', 'Gilda', 'Bosco', '100 mo', 'Alta', 'Caccia', 10)
      RETURNING id;
    `);
    assert.equal(insertOrgA.rows.length, 1, "GM A can insert organization mission");

    const insertPersonalA = await db.query<{ id: string; title: string }>(`
      INSERT INTO public.campaign_missions (id, campaign_id, mission_kind, title, description)
      VALUES ('${personalMissionId}', '${campaignA}', 'personal', 'Trama segreta GM A', 'Dettagli riservati')
      RETURNING id, title;
    `);
    assert.equal(insertPersonalA.rows.length, 1, "GM A can insert personal mission");
    assert.equal(insertPersonalA.rows[0].title, "Trama segreta GM A");

    const gmASelect = await db.query<{ id: string }>("SELECT id FROM public.campaign_missions WHERE campaign_id = $1", [campaignA]);
    assert.equal(gmASelect.rows.length, 2, "GM A sees both organization and personal missions");

    // =========================================================================
    // 2. Foreign GM (foreignGmId): NOT owner, NOT member of Campaign A
    //    Must be able to create, read, update, and delete personal missions in Campaign A!
    // =========================================================================
    await db.exec(`SELECT set_config('test.uid', '${foreignGmId}', false);`);
    const foreignGmSelect = await db.query<{ id: string; mission_kind: string }>(
      "SELECT id, mission_kind FROM public.campaign_missions WHERE campaign_id = $1 ORDER BY title",
      [campaignA]
    );
    assert.equal(foreignGmSelect.rows.length, 2, "Foreign GM sees both missions in Campaign A");

    // Read by direct ID
    const foreignGmDirectSelect = await db.query<{ id: string }>(
      "SELECT id FROM public.campaign_missions WHERE id = $1",
      [personalMissionId]
    );
    assert.equal(foreignGmDirectSelect.rows.length, 1, "Foreign GM can read personal mission by direct ID");

    // Foreign GM updates personal mission
    const foreignGmUpdate = await db.query<{ id: string; title: string }>(
      "UPDATE public.campaign_missions SET title = 'Trama modificata da GM estraneo' WHERE id = $1 RETURNING id, title",
      [personalMissionId]
    );
    assert.equal(foreignGmUpdate.rows.length, 1, "Foreign GM update succeeds");
    assert.equal(foreignGmUpdate.rows[0].title, "Trama modificata da GM estraneo");

    // Foreign GM creates a personal mission in Campaign A
    const foreignCreatedId = "66666666-6666-4666-8666-666666666666";
    const foreignGmInsert = await db.query<{ id: string }>(`
      INSERT INTO public.campaign_missions (id, campaign_id, mission_kind, title, description)
      VALUES ('${foreignCreatedId}', '${campaignA}', 'personal', 'Missione creata da GM B', 'Descrizione GM B')
      RETURNING id;
    `);
    assert.equal(foreignGmInsert.rows.length, 1, "Foreign GM can insert personal mission in Campaign A");

    // Foreign GM deletes the mission they created
    const foreignGmDelete = await db.query<{ id: string }>(
      "DELETE FROM public.campaign_missions WHERE id = $1 RETURNING id",
      [foreignCreatedId]
    );
    assert.equal(foreignGmDelete.rows.length, 1, "Foreign GM can delete personal mission in Campaign A");

    // =========================================================================
    // 3. Global Admin
    // =========================================================================
    await db.exec(`SELECT set_config('test.uid', '${adminId}', false);`);
    const adminSelect = await db.query<{ id: string }>("SELECT id FROM public.campaign_missions WHERE campaign_id = $1", [campaignA]);
    assert.equal(adminSelect.rows.length, 2, "Admin sees both missions");

    const adminUpdate = await db.query<{ title: string }>(
      "UPDATE public.campaign_missions SET title = 'Trama convalidata da Admin' WHERE id = $1 RETURNING title",
      [personalMissionId]
    );
    assert.equal(adminUpdate.rows[0].title, "Trama convalidata da Admin");

    // =========================================================================
    // 4. Member Player of Campaign A
    //    - CAN read organization mission
    //    - CANNOT read personal mission (neither list nor direct ID)
    //    - CANNOT insert personal mission
    //    - CANNOT update personal mission (0 rows affected, verified by re-reading)
    //    - CANNOT delete personal mission (0 rows affected)
    // =========================================================================
    await db.exec(`SELECT set_config('test.uid', '${memberPlayerId}', false);`);
    const memberList = await db.query<{ id: string; mission_kind: string }>(
      "SELECT id, mission_kind FROM public.campaign_missions WHERE campaign_id = $1",
      [campaignA]
    );
    assert.equal(memberList.rows.length, 1, "Member player sees only 1 mission");
    assert.equal(memberList.rows[0].id, orgMissionId);
    assert.equal(memberList.rows[0].mission_kind, "organization");

    // Direct read by ID
    const memberDirectRead = await db.query("SELECT * FROM public.campaign_missions WHERE id = $1", [personalMissionId]);
    assert.equal(memberDirectRead.rows.length, 0, "Member player direct read of personal mission returns 0 rows");

    // Attempt direct UPDATE with RETURNING
    const memberUpdate = await db.query(
      "UPDATE public.campaign_missions SET title = 'Hacked by Player' WHERE id = $1 RETURNING id",
      [personalMissionId]
    );
    assert.equal(memberUpdate.rows.length, 0, "Member player UPDATE returns 0 rows");

    // Verify data was NOT changed by re-reading as Admin
    await db.exec(`SELECT set_config('test.uid', '${adminId}', false);`);
    const verifyUnchanged = await db.query<{ title: string }>("SELECT title FROM public.campaign_missions WHERE id = $1", [personalMissionId]);
    assert.equal(verifyUnchanged.rows[0].title, "Trama convalidata da Admin", "Title was untouched by member player update attempt");

    // Switch back to member player and attempt INSERT
    await db.exec(`SELECT set_config('test.uid', '${memberPlayerId}', false);`);
    await assert.rejects(
      db.query(`
        INSERT INTO public.campaign_missions (campaign_id, mission_kind, title, description)
        VALUES ('${campaignA}', 'personal', 'Illegal Player Mission', 'Should fail');
      `),
      /violates row-level security policy/,
      "Member player cannot insert personal mission"
    );

    // Attempt direct DELETE with RETURNING
    const memberDelete = await db.query(
      "DELETE FROM public.campaign_missions WHERE id = $1 RETURNING id",
      [personalMissionId]
    );
    assert.equal(memberDelete.rows.length, 0, "Member player DELETE returns 0 rows");

    // Verify mission still exists via Admin
    await db.exec(`SELECT set_config('test.uid', '${adminId}', false);`);
    const verifyStillExists = await db.query("SELECT id FROM public.campaign_missions WHERE id = $1", [personalMissionId]);
    assert.equal(verifyStillExists.rows.length, 1, "Personal mission was not deleted");

    // =========================================================================
    // 5. Non-member Player
    // =========================================================================
    await db.exec(`SELECT set_config('test.uid', '${nonMemberPlayerId}', false);`);
    const nonMemberList = await db.query("SELECT * FROM public.campaign_missions WHERE campaign_id = $1", [campaignA]);
    assert.equal(nonMemberList.rows.length, 0, "Non-member player sees no missions");

    const nonMemberDirect = await db.query("SELECT * FROM public.campaign_missions WHERE id = $1", [personalMissionId]);
    assert.equal(nonMemberDirect.rows.length, 0, "Non-member cannot read by ID");

    const nonMemberUpdate = await db.query("UPDATE public.campaign_missions SET title = 'Hacked2' WHERE id = $1 RETURNING id", [personalMissionId]);
    assert.equal(nonMemberUpdate.rows.length, 0, "Non-member update affects 0 rows");

    // =========================================================================
    // 6. Anonymous User
    // =========================================================================
    await db.exec("SET ROLE anon; SELECT set_config('test.uid', '', false);");
    const anonList = await db.query("SELECT * FROM public.campaign_missions WHERE campaign_id = $1", [campaignA]);
    assert.equal(anonList.rows.length, 0, "Anon sees 0 missions");

    const anonDirect = await db.query("SELECT * FROM public.campaign_missions WHERE id = $1", [personalMissionId]);
    assert.equal(anonDirect.rows.length, 0, "Anon direct read returns 0 rows");

    // =========================================================================
    // 7. Test Restrictive Barrier against Leaky Permissive Policy
    //    Demonstrate that even if a permissive policy allows ALL to authenticated,
    //    the RESTRICTIVE barrier prevents players from reading or writing personal missions.
    // =========================================================================
    await db.exec("RESET ROLE;");
    await db.exec(`
      CREATE POLICY "Leaky permissive policy"
        ON public.campaign_missions FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    `);

    // As Member Player: can read organization mission via leaky policy, BUT RESTRICTIVE BARRIER blocks personal mission!
    await db.exec(`SET ROLE authenticated; SELECT set_config('test.uid', '${memberPlayerId}', false);`);
    const memberWithLeaky = await db.query<{ id: string; mission_kind: string }>(
      "SELECT id, mission_kind FROM public.campaign_missions WHERE campaign_id = $1 ORDER BY mission_kind",
      [campaignA]
    );
    assert.equal(memberWithLeaky.rows.length, 1, "Restrictive barrier blocks personal mission even with permissive policy");
    assert.equal(memberWithLeaky.rows[0].mission_kind, "organization");

    const memberLeakyDirect = await db.query("SELECT * FROM public.campaign_missions WHERE id = $1", [personalMissionId]);
    assert.equal(memberLeakyDirect.rows.length, 0, "Direct read of personal mission blocked by restrictive barrier");

    const memberLeakyUpdate = await db.query(
      "UPDATE public.campaign_missions SET title = 'Bypass Attempt' WHERE id = $1 RETURNING id",
      [personalMissionId]
    );
    assert.equal(memberLeakyUpdate.rows.length, 0, "Update of personal mission blocked by restrictive barrier");

    // Clean up leaky policy
    await db.exec("RESET ROLE;");
    await db.exec('DROP POLICY "Leaky permissive policy" ON public.campaign_missions;');

    // =========================================================================
    // 8. Invariants Enforcement (CHECK constraint)
    // =========================================================================
    await assert.rejects(
      db.query(`
        INSERT INTO public.campaign_missions (campaign_id, mission_kind, title, description, points_reward)
        VALUES ('${campaignA}', 'personal', 'Invalid Points', 'Desc', 5);
      `),
      /campaign_missions_personal_invariants_check/,
      "CHECK constraint rejects personal mission with points_reward > 0"
    );

    const guildId = "55555555-5555-4555-8555-555555555555";
    await assert.rejects(
      db.query(`
        INSERT INTO public.campaign_missions (campaign_id, mission_kind, title, description, completed_by_guild_id)
        VALUES ('${campaignA}', 'personal', 'Invalid Guild', 'Desc', '${guildId}');
      `),
      /campaign_missions_personal_invariants_check/,
      "CHECK constraint rejects personal mission with completed_by_guild_id"
    );

    await assert.rejects(
      db.query(`
        INSERT INTO public.campaign_missions (campaign_id, mission_kind, title, description, treasure_gp)
        VALUES ('${campaignA}', 'personal', 'Invalid Treasure', 'Desc', 10);
      `),
      /campaign_missions_personal_invariants_check/,
      "CHECK constraint rejects personal mission with treasure_gp > 0"
    );
  } finally {
    await db.close();
  }
});
