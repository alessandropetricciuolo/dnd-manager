import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMBAT_CONDITIONS, normalizeCombatConditions } from "@/lib/combat-conditions";
import { emptyInitiativeTrackerState, initiativeStateSyncSignature, sanitizeInitiativeTrackerState, type InitiativeEntry } from "@/components/gm/initiative-tracker";
import { parseTorneoInitiativeSnapshot, serializeTorneoInitiativeSnapshot } from "@/lib/torneo/initiative-snapshot";

const entry: InitiativeEntry = { id: "a", name: "Guerriero", type: "pc", hp: 20, maxHp: 20, armorClass: 16, initiative: 12 };

test("snapshot precedenti compatibili; stati multipli conservati dopo salvataggio", () => {
  const legacy = { ...emptyInitiativeTrackerState(), entries: [entry] };
  assert.deepEqual(sanitizeInitiativeTrackerState(legacy).entries[0].conditions, []);
  const state = { ...legacy, entries: [{ ...entry, conditions: normalizeCombatConditions(["prono", "accecato", "prono", "inesistente"]) }] };
  const restored = parseTorneoInitiativeSnapshot(JSON.stringify(serializeTorneoInitiativeSnapshot(state)))!;
  assert.deepEqual(restored.entries[0].conditions, ["accecato", "prono"]);
  assert.notEqual(initiativeStateSyncSignature(legacy), initiativeStateSyncSignature(state));
  assert.equal(initiativeStateSyncSignature(restored), initiativeStateSyncSignature(state));
  const removed = { ...state, entries: [{ ...entry, conditions: normalizeCombatConditions(["accecato"]) }] };
  assert.notEqual(initiativeStateSyncSignature(removed), initiativeStateSyncSignature(state));
});

test("catalogo completo e testo proveniente dal manuale locale, inclusa continuazione Pietrificato", () => {
  const manual = readFileSync("public/manuals/manuale_giocatore.md", "utf8").replaceAll("*", "");
  assert.equal(COMBAT_CONDITIONS.length, 15);
  for (const condition of COMBAT_CONDITIONS) {
    for (const paragraph of condition.paragraphs) {
      for (const line of paragraph.split("\n")) assert.ok(manual.includes(line.replace(/^\d\. /, "")), `${condition.label}: ${line}`);
    }
  }
  assert.equal(COMBAT_CONDITIONS.find((c) => c.id === "pietrificato")?.paragraphs.length, 6);
  assert.ok(COMBAT_CONDITIONS.find((c) => c.id === "indebolimento")?.paragraphs.some((p) => p.includes("6. Morte")));
  assert.deepEqual(normalizeCombatConditions(null), []);
});
