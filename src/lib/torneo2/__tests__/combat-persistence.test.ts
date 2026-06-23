import test from "node:test";
import assert from "node:assert/strict";
import { persistTorneo2CombatStateWithNextSeq } from "@/lib/torneo2/combat-persistence";
import type { Torneo2CombatState } from "@/lib/torneo2/combat-state";

type MatchRow = {
  id: string;
  campaign_id: string;
  combat_seq: number;
  combat_state: unknown;
  combat_origin: string | null;
  combat_updated_at: string | null;
};

class MockTorneo2Client {
  row: MatchRow | null;

  constructor(row: MatchRow | null) {
    this.row = row;
  }

  from(table: "torneo2_matches") {
    assert.equal(table, "torneo2_matches");
    return new MockTorneo2Query(this);
  }
}

class MockTorneo2Query {
  private readonly client: MockTorneo2Client;
  private patch: Record<string, unknown> | null = null;
  private filters = new Map<string, unknown>();

  constructor(client: MockTorneo2Client) {
    this.client = client;
  }

  select(_columns: string) {
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.patch = patch;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.set(column, value);
    return this;
  }

  async maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: null }> {
    await Promise.resolve();
    const row = this.client.row;
    if (!row || !this.matches(row)) return { data: null, error: null };

    if (this.patch) {
      Object.assign(row, this.patch);
    }

    return {
      data: {
        combat_seq: row.combat_seq,
        combat_updated_at: row.combat_updated_at,
      },
      error: null,
    };
  }

  private matches(row: MatchRow): boolean {
    for (const [column, value] of this.filters) {
      if (column === "id" && row.id !== value) return false;
      if (column === "campaign_id" && row.campaign_id !== value) return false;
      if (column === "combat_seq" && row.combat_seq !== value) return false;
    }
    return true;
  }
}

function state(id: string, hp: number): Torneo2CombatState {
  return {
    currentTurnIndex: 0,
    roundNumber: 1,
    combatants: [
      {
        id,
        characterId: null,
        name: id,
        side: "a",
        teamId: null,
        teamName: null,
        teamColor: null,
        portraitUrl: null,
        characterClass: null,
        armorClass: 10,
        hp,
        maxHp: 20,
        initiative: 0,
        damageDealt: 0,
        damageTaken: 20 - hp,
        conditions: [],
        deathSaves: { success: 0, fail: 0, stable: false },
        isDead: false,
        noteText: "",
        usedReaction: false,
        usedBonus: false,
      },
    ],
  };
}

test("concurrent combat saves retry instead of reusing the same sequence number", async () => {
  const client = new MockTorneo2Client({
    id: "match-1",
    campaign_id: "campaign-1",
    combat_seq: 0,
    combat_state: null,
    combat_origin: null,
    combat_updated_at: null,
  });

  const [first, second] = await Promise.all([
    persistTorneo2CombatStateWithNextSeq(client, {
      campaignId: "campaign-1",
      matchId: "match-1",
      state: state("first", 10),
      originId: "gm",
    }),
    persistTorneo2CombatStateWithNextSeq(client, {
      campaignId: "campaign-1",
      matchId: "match-1",
      state: state("second", 8),
      originId: "remote",
    }),
  ]);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual([first, second].map((r) => (r.ok ? r.seq : 0)).sort(), [1, 2]);
  assert.equal(client.row?.combat_seq, 2);
});

test("combat save reports not_found when match is outside the campaign scope", async () => {
  const client = new MockTorneo2Client({
    id: "match-1",
    campaign_id: "campaign-2",
    combat_seq: 0,
    combat_state: null,
    combat_origin: null,
    combat_updated_at: null,
  });

  const result = await persistTorneo2CombatStateWithNextSeq(client, {
    campaignId: "campaign-1",
    matchId: "match-1",
    state: state("first", 10),
    originId: "gm",
  });

  assert.deepEqual(result, { ok: false, code: "not_found", error: "Incontro non trovato." });
});
