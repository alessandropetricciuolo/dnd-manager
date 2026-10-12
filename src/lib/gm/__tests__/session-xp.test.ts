import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeSessionXpAwards,
  monsterXp,
  type StoredXpState,
} from "../session-xp";
import { resolveXpPayload, sessionXpDraftSchema } from "../session-xp-draft";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";
const characters = [
  { id: "a", assigned_to: "p1" },
  { id: "b", assigned_to: "p2" },
] as CampaignCharacterRow[];
const xp: StoredXpState = {
  version: 2,
  extraXpManual: 0,
  bankedMonsterXp: 1000,
  perCharacter: { a: { plus: 0, minus: 0, customXp: 0 } },
};
test("an explicit zero survives alongside the common quota", () => {
  const result = computeSessionXpAwards({
    characters,
    attendance: { p1: "attended", p2: "attended" },
    xpState: xp,
  });
  assert.equal(result.basePerPlayer, 500);
  assert.deepEqual(result.awards, [
    { playerId: "p1", xp: 0 },
    { playerId: "p2", xp: 500 },
  ]);
});
test("absent players do not receive awards and the pool is redistributed", () => {
  const result = computeSessionXpAwards({
    characters,
    attendance: { p1: "absent", p2: "attended" },
    xpState: xp,
  });
  assert.deepEqual(result.awards, [{ playerId: "p2", xp: 1000 }]);
});
test("banking dead monsters preserves the total after clearing the roster", () => {
  const entries = [
    { type: "monster", hp: 0, exp: 500 },
    { type: "monster", hp: 1, exp: 900 },
  ] as InitiativeEntry[];
  const initial = computeSessionXpAwards({
    characters,
    xpState: xp,
    initiativeEntries: entries,
  });
  const banked = computeSessionXpAwards({
    characters,
    xpState: {
      ...xp,
      bankedMonsterXp: xp.bankedMonsterXp + monsterXp(entries),
    },
    initiativeEntries: [],
  });
  assert.equal(initial.totalBaseXp, banked.totalBaseXp);
  assert.equal(monsterXp([]), 0);
});
test("zero and an empty array never revive a persisted award", () => {
  assert.deepEqual(
    resolveXpPayload(
      { xpGained: 0, perPlayerXpAwards: [] },
      { xpGained: 500, perPlayerXpAwards: [{ playerId: "p1", xp: 500 }] },
    ),
    { xpGained: 0, perPlayerXpAwards: [] },
  );
});
test("draft validation rejects invalid amounts, attendance, and identities", () => {
  const playerId = "00000000-0000-4000-8000-000000000001";
  const draft = {
    attendance: { [playerId]: "attended" },
    xpGained: 0,
    perPlayerXpAwards: [{ playerId, xp: 0 }],
  };
  assert.equal(sessionXpDraftSchema.safeParse(draft).success, true);
  assert.equal(
    sessionXpDraftSchema.safeParse({ ...draft, xpGained: -1 }).success,
    false,
  );
  assert.equal(
    sessionXpDraftSchema.safeParse({
      ...draft,
      attendance: { [playerId]: "confirmed" },
    }).success,
    false,
  );
});
