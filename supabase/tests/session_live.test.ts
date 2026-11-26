import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

function uuid(value: number): string {
  return `00000000-0000-4000-a000-${String(value).padStart(12, "0")}`;
}

const gm = uuid(1);
const otherGm = uuid(2);
const player = uuid(3);
const opponent = uuid(4);
const campaign = uuid(5);
const session = uuid(6);
const character = uuid(7);
const opponentCharacter = uuid(8);

async function fixture(): Promise<PGlite> {
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
      GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
      CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text NOT NULL);
      CREATE TABLE public.campaigns (id uuid PRIMARY KEY, type text NOT NULL, gm_id uuid REFERENCES public.profiles);
      CREATE TABLE public.sessions (id uuid PRIMARY KEY, campaign_id uuid REFERENCES public.campaigns, dm_id uuid, status text);
      CREATE TABLE public.session_signups (session_id uuid REFERENCES public.sessions, player_id uuid REFERENCES public.profiles, status text);
      CREATE TABLE public.campaign_characters (
        id uuid PRIMARY KEY, campaign_id uuid REFERENCES public.campaigns, assigned_to uuid REFERENCES public.profiles,
        name text NOT NULL DEFAULT 'PG', hit_points integer, rules_snapshot jsonb, updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.torneo_matches (
        id uuid PRIMARY KEY, campaign_id uuid REFERENCES public.campaigns, status text, match_kind text,
        team_a_id uuid, team_b_id uuid, team_c_id uuid, initiative_snapshot jsonb, initiative_updated_at timestamptz
      );
      CREATE TABLE public.torneo_team_members (team_id uuid, character_id uuid REFERENCES public.campaign_characters);
      CREATE TABLE public.torneo_live_sessions (
        id uuid PRIMARY KEY, campaign_id uuid REFERENCES public.campaigns, status text, created_by uuid,
        station1_match_id uuid, station2_match_id uuid
      );
      CREATE TABLE public.torneo2_matches (
        id uuid PRIMARY KEY, campaign_id uuid REFERENCES public.campaigns, status text, kind text,
        team_a_id uuid, team_b_id uuid, combat_state jsonb, combat_seq bigint DEFAULT 0, combat_origin text,
        combat_updated_at timestamptz
      );
      CREATE TABLE public.torneo2_team_members (team_id uuid, character_id uuid REFERENCES public.campaign_characters);
      CREATE TABLE public.torneo2_match_participants (
        match_id uuid, character_id uuid REFERENCES public.campaign_characters, team_id uuid
      );
      CREATE TABLE public.torneo2_live_sessions (
        id uuid PRIMARY KEY, campaign_id uuid REFERENCES public.campaigns, status text, created_by uuid,
        station1_match_id uuid, station2_match_id uuid
      );
      CREATE FUNCTION public.is_gm_or_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
        SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('gm', 'admin'))
      $$;
      GRANT SELECT ON public.profiles TO authenticated;
      GRANT SELECT, UPDATE ON public.campaign_characters TO authenticated, service_role;
      GRANT SELECT ON public.torneo_matches, public.torneo2_matches TO anon, authenticated;
      ALTER TABLE public.torneo_matches ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.torneo2_matches ENABLE ROW LEVEL SECURITY;
      CREATE POLICY fixture_torneo_visible ON public.torneo_matches FOR SELECT USING (true);
      CREATE POLICY fixture_torneo2_visible ON public.torneo2_matches FOR SELECT USING (true);
      INSERT INTO public.profiles VALUES ('${gm}', 'gm'), ('${otherGm}', 'gm'), ('${player}', 'player'), ('${opponent}', 'player');
    `);
    const directory = "supabase/migrations";
    const migration = (await readdir(directory)).find((entry) => /session_live.*\.sql$/.test(entry));
    assert.ok(migration, "session live migration exists");
    await db.exec(await readFile(`${directory}/${migration}`, "utf8"));
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

async function actAs(db: PGlite, user: string | null): Promise<void> {
  await db.exec("RESET ROLE");
  if (!user) return;
  await db.query("SELECT set_config('test.uid', $1, false)", [user]);
  await db.exec("SET ROLE authenticated");
}

async function command(
  db: PGlite, scope: string, context: string, commandId: number, action: string,
  payload: Record<string, unknown> = {}, expectedRevision?: number,
): Promise<unknown> {
  if (action !== "start" && expectedRevision === undefined) {
    const current = await db.query<{ revision: number }>(
      "SELECT (public.session_live_gm_state($1,$2) ->> 'revision')::int AS revision", [scope, context],
    );
    expectedRevision = current.rows[0].revision;
  }
  const result = await db.query(
    "SELECT public.session_live_command($1, $2, $3, $4, $5::jsonb) AS state",
    [scope, context, uuid(commandId), action, JSON.stringify({ ...payload, expectedRevision })],
  );
  return result.rows[0];
}

async function addCampaign(db: PGlite, type: string): Promise<void> {
  await db.query("INSERT INTO public.campaigns VALUES ($1, $2, $3)", [campaign, type, gm]);
  await db.query(
    `INSERT INTO public.campaign_characters(id,campaign_id,assigned_to,hit_points,rules_snapshot)
     VALUES ($1,$2,$3,20,$4::jsonb), ($5,$2,$6,20,$4::jsonb)`,
    [character, campaign, player, JSON.stringify({ max_hp: 20, spellSlots: [{ level: 1, count: 2 }], usedSpellSlots: {}, private_note: "keep" }), opponentCharacter, opponent],
  );
}

async function addSession(db: PGlite, type: string): Promise<void> {
  await addCampaign(db, type);
  await db.query("INSERT INTO public.sessions VALUES ($1, $2, $3, 'scheduled')", [session, campaign, gm]);
  await db.query("INSERT INTO public.session_signups VALUES ($1, $2, 'confirmed')", [session, player]);
}

const changes = (id: string, hitPoints: number) => ({
  changes: [{
    characterId: id, hitPoints, tempHp: 0, deathSaves: { successes: 0, failures: 0 },
    usedSpellSlots: { 1: 1 }, conditions: ["Avvelenato"],
  }],
});

async function visibleCharacters(db: PGlite): Promise<string[]> {
  const result = await db.query<{ character_id: string }>(
    "SELECT character_id FROM public.session_live_characters WHERE active ORDER BY character_id",
  );
  return result.rows.map((row) => row.character_id);
}

test("live session isolates reads and writes and does not restore a stale retry over a newer command", async () => {
  const db = await fixture();
  try {
    await addSession(db, "long");
    await actAs(db, player);
    await assert.rejects(command(db, "session", session, 20, "start", { characterIds: [character] }));
    await actAs(db, gm);
    await assert.rejects(command(db, "session", session, 21, "start", { characterIds: [opponentCharacter] }));
    await command(db, "session", session, 22, "start", { characterIds: [character] });
    await actAs(db, player);
    assert.deepEqual(await visibleCharacters(db), [character]);
    await assert.rejects(command(db, "session", session, 23, "update", changes(character, 5)));
    await assert.rejects(db.query("UPDATE public.session_live_characters SET active = false WHERE character_id = $1", [character]));
    await actAs(db, opponent);
    assert.deepEqual(await visibleCharacters(db), []);
    await actAs(db, otherGm);
    await assert.rejects(command(db, "session", session, 24, "update", changes(character, 5)));

    await actAs(db, gm);
    const overSpent = changes(character, 12);
    overSpent.changes[0].usedSpellSlots[1] = 3;
    await assert.rejects(command(db, "session", session, 25, "update", overSpent), /session_live_invalid_spell_slots/);
    await command(db, "session", session, 25, "update", changes(character, 12), 1);
    await command(db, "session", session, 26, "update", changes(character, 15), 2);
    await assert.rejects(command(db, "session", session, 28, "update", changes(character, 5), 1), /session_live_revision_conflict/);
    await command(db, "session", session, 25, "update", changes(character, 12), 1);
    await actAs(db, null);
    const state = await db.query<{ hit_points: number; rules_snapshot: Record<string, unknown> }>(
      "SELECT hit_points, rules_snapshot FROM public.campaign_characters WHERE id = $1", [character],
    );
    assert.equal(state.rows[0].hit_points, 15);
    assert.equal(state.rows[0].rules_snapshot.private_note, "keep");

    await db.exec("SET ROLE service_role");
    assert.deepEqual(await visibleCharacters(db), [character], "legacy API can look up the live lock");
    await assert.rejects(db.query("UPDATE public.campaign_characters SET hit_points = 20 WHERE id = $1", [character]));
    await db.query("UPDATE public.campaign_characters SET rules_snapshot = rules_snapshot || '{\"playerNotes\":\"ok\"}'::jsonb WHERE id = $1", [character]);
    await actAs(db, gm);
    await command(db, "session", session, 27, "stop");
    await actAs(db, player);
    assert.deepEqual(await visibleCharacters(db), []);
    await db.exec("RESET ROLE; SET ROLE service_role");
    await db.query("UPDATE public.campaign_characters SET hit_points = 20 WHERE id = $1", [character]);
  } finally {
    await db.close();
  }
});

test("Quest supports the same live state and One Shot revokes reads on unassignment", async () => {
  const db = await fixture();
  try {
    await addSession(db, "quest");
    await actAs(db, gm);
    await command(db, "session", session, 30, "start", { characterIds: [character] });
    await actAs(db, player);
    assert.deepEqual(await visibleCharacters(db), [character]);
    await actAs(db, gm);
    await command(db, "session", session, 31, "stop");

    await actAs(db, null);
    await db.query("UPDATE public.campaigns SET type = 'oneshot' WHERE id = $1", [campaign]);
    const oneShot = uuid(9);
    await db.query("INSERT INTO public.sessions VALUES ($1, $2, $3, 'scheduled')", [oneShot, campaign, gm]);
    await db.query("INSERT INTO public.session_signups VALUES ($1, $2, 'approved')", [oneShot, player]);
    await actAs(db, gm);
    await command(db, "session", oneShot, 32, "start", { characterIds: [character] });
    await actAs(db, player);
    assert.deepEqual(await visibleCharacters(db), [character]);
    await actAs(db, null);
    await db.query("UPDATE public.sessions SET status = 'completed' WHERE id = $1", [oneShot]);
    await db.query("UPDATE public.campaign_characters SET assigned_to = NULL WHERE id = $1", [character]);
    await actAs(db, player);
    assert.deepEqual(await visibleCharacters(db), []);
    await actAs(db, gm);
    await assert.rejects(command(db, "session", oneShot, 33, "update", changes(character, 5)));
  } finally {
    await db.close();
  }
});

for (const scope of ["torneo", "torneo2"] as const) {
  test(`${scope} isolates simultaneous matches and leaves the character sheet baseline intact`, async () => {
    const db = await fixture();
    try {
      await addCampaign(db, "torneo");
      const first = uuid(10);
      const second = uuid(11);
      const firstTeam = uuid(12);
      const secondTeam = uuid(13);
      const matchState = (id: string) => {
        const entry = { id: `init-1-${id}`, hp: 20, maxHp: 20 };
        return JSON.stringify(scope === "torneo"
          ? { entries: [{ ...entry, type: "pc", playerId: id }] }
          : { combatants: [{ ...entry, characterId: id }] });
      };
      const kindField = scope === "torneo" ? "match_kind" : "kind";
      const stateField = scope === "torneo" ? "initiative_snapshot" : "combat_state";
      await db.query(
        `INSERT INTO public.${scope}_matches(id,campaign_id,status,${kindField},team_a_id,${stateField})
         VALUES ($1,$2,'active',$3,$4,$5::jsonb),($6,$2,'active',$3,$7,$8::jsonb)`,
        [first, campaign, scope === "torneo" ? "bracket" : "team", firstTeam, matchState(character),
          second, secondTeam, matchState(opponentCharacter)],
      );
      await db.query(`INSERT INTO public.${scope}_team_members VALUES ($1,$2),($3,$4)`, [firstTeam, character, secondTeam, opponentCharacter]);
      await db.query(
        `INSERT INTO public.${scope}_live_sessions(id,campaign_id,status,created_by,station1_match_id,station2_match_id)
         VALUES ($1,$2,'live',$3,$4,$5)`, [uuid(14), campaign, gm, first, second],
      );
      await actAs(db, gm);
      await command(db, scope, first, 40, "start", { characterIds: [character] });
      await command(db, scope, second, 41, "start", { characterIds: [opponentCharacter] });
      await assert.rejects(command(db, scope, first, 42, "update", changes(opponentCharacter, 1)));
      await command(db, scope, first, 43, "update", changes(character, 12));
      await actAs(db, player);
      assert.deepEqual(await visibleCharacters(db), [character]);
      const rawMatch = await db.query(`SELECT id FROM public.${scope}_matches`);
      assert.equal(rawMatch.rows.length, 0, "players can read only their live projection");
      await actAs(db, opponent);
      assert.deepEqual(await visibleCharacters(db), [opponentCharacter]);
      await actAs(db, null);
      const state = await db.query<{ hit_points: number }>(
        "SELECT hit_points FROM public.campaign_characters WHERE id = $1", [character],
      );
      assert.equal(state.rows[0].hit_points, 20);
      const staleSnapshot = JSON.parse(matchState(character));
      staleSnapshot.roundNumber = 2;
      const saved = await db.query<{ phase: Record<string, unknown> }>(
        `UPDATE public.${scope}_matches SET ${stateField} = $1::jsonb WHERE id = $2 RETURNING ${stateField} AS phase`,
        [JSON.stringify(staleSnapshot), first],
      );
      const phase = saved.rows[0].phase;
      assert.equal(phase.roundNumber, 2, "regia writes can still save turn and round data");
      const entry = (phase[scope === "torneo" ? "entries" : "combatants"] as Array<{ hp: number }>)[0];
      assert.equal(entry.hp, 12, "a stale regia write cannot overwrite confirmed live HP");

      await db.query(`UPDATE public.${scope}_matches SET status = 'completed' WHERE id = $1`, [first]);
      await actAs(db, player);
      assert.deepEqual(await visibleCharacters(db), []);
      await actAs(db, opponent);
      assert.deepEqual(await visibleCharacters(db), [opponentCharacter]);
      await actAs(db, null);
      await db.query(`UPDATE public.${scope}_live_sessions SET status = 'ended' WHERE id = $1`, [uuid(14)]);
      await actAs(db, opponent);
      assert.deepEqual(await visibleCharacters(db), [], "ending a station releases its live roster");
    } finally {
      await db.close();
    }
  });
}

test("sharing a condition does not fill missing resources on a partial campaign sheet", async () => {
  const db = await fixture();
  try {
    await addSession(db, "long");
    await db.query("UPDATE public.campaign_characters SET hit_points = NULL, rules_snapshot = NULL WHERE id = $1", [character]);
    await actAs(db, gm);
    await command(db, "session", session, 50, "start", { characterIds: [character] });
    await command(db, "session", session, 51, "update", { changes: [{
      characterId: character, hitPoints: 0, tempHp: 0,
      deathSaves: { successes: 0, failures: 0 }, usedSpellSlots: {}, conditions: ["Avvelenato"],
    }] });
    await actAs(db, null);
    const result = await db.query(
      "SELECT hit_points,rules_snapshot FROM public.campaign_characters WHERE id = $1", [character],
    );
    assert.deepEqual(result.rows, [{ hit_points: null, rules_snapshot: null }]);
  } finally {
    await db.close();
  }
});
