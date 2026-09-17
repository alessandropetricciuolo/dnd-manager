import test from "node:test";
import assert from "node:assert/strict";
import { formatXpConfirmationLabel, resolveCharacterXp } from "@/lib/character-xp";

test("the character sheet remains canonical when member total mismatches", () => {
  assert.deepEqual(
    resolveCharacterXp({ currentXp: 420, memberXp: 500, assignedTo: "player-1" }),
    { currentXp: 420, memberXp: 500, syncStatus: "mismatch" }
  );
});

test("assigned matching totals are reported as synchronized", () => {
  assert.deepEqual(
    resolveCharacterXp({ currentXp: 420.9, memberXp: 420, assignedTo: "player-1" }),
    { currentXp: 420, memberXp: 420, syncStatus: "synced" }
  );
});

test("unassigned characters keep canonical XP without inventing a member total", () => {
  assert.deepEqual(
    resolveCharacterXp({ currentXp: 75, memberXp: 999, assignedTo: null }),
    { currentXp: 75, memberXp: null, syncStatus: "unassigned" }
  );
});

test("reassigned characters keep the sheet total while the new member is audited separately", () => {
  assert.deepEqual(
    resolveCharacterXp({ currentXp: 900, memberXp: 120, assignedTo: "new-player" }),
    { currentXp: 900, memberXp: 120, syncStatus: "mismatch" }
  );
});

test("confirmation label contains applied increment and persisted total", () => {
  assert.equal(
    formatXpConfirmationLabel({ characterName: "Aria", xpAwarded: 160, xpAfter: 580 }),
    "Aria: +160 EXP (totale 580)"
  );
});

test("confirmation remains explicit for a ledger row without a character", () => {
  assert.equal(
    formatXpConfirmationLabel({ characterName: null, xpAwarded: 0, xpAfter: 240 }),
    "Personaggio non assegnato: +0 EXP (totale 240)"
  );
});
