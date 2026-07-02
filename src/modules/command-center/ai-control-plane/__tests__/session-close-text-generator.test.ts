import test from "node:test";
import assert from "node:assert/strict";

import { parseSessionCloseDraftJson } from "@/lib/ai/session-close-text-generator";

test("parseSessionCloseDraftJson parsa JSON chiusura sessione", () => {
  const raw = JSON.stringify({
    summary: "I PG hanno sconfitto il drago.",
    gm_private_notes: "Preparare vendetta del culto",
    xp_gained: 300,
    per_player_xp: [{ player_name: "Marco", xp: 400 }],
    elapsed_hours: 4,
    attendance: [{ player_name: "Luca", status: "absent" }],
    entity_updates: [{ entity_name: "Gambly", status: "dead" }],
    unlock_content: [{ name: "Torre Nera", type: "map" }],
    economy_mentioned: true,
    economy_simple: {
      mission_title: null,
      character_coins: [{ character_name: "Thorin", coins_gp: 50 }],
      notes: null,
    },
  });

  const result = parseSessionCloseDraftJson(raw);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.data.summary.includes("drago"));
  assert.equal(result.data.xpGained, 300);
  assert.deepEqual(result.data.perPlayerXp, [{ playerName: "Marco", xp: 400 }]);
  assert.deepEqual(result.data.attendance, [{ playerName: "Luca", status: "absent" }]);
  assert.equal(result.data.entityUpdates[0]?.status, "dead");
  assert.equal(result.data.economyMentioned, true);
  assert.equal(result.data.economySimple?.characterCoins[0]?.coins_gp, 50);
});

test("parseSessionCloseDraftJson rifiuta JSON non valido", () => {
  const result = parseSessionCloseDraftJson("non json");
  assert.equal(result.ok, false);
});
