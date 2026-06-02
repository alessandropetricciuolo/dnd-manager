import assert from "node:assert/strict";
import test from "node:test";
import {
  parseInitiativeSnapshotField,
  torneoInitiativeBrowserStorageKeys,
} from "@/lib/torneo/megatimer-initiative";

test("parseInitiativeSnapshotField ignora snapshot vuoto", () => {
  assert.equal(parseInitiativeSnapshotField(null), null);
  assert.equal(parseInitiativeSnapshotField({ entries: [] }), null);
});

test("chiavi storage megatimer", () => {
  const keys = torneoInitiativeBrowserStorageKeys("camp", "match");
  assert.equal(keys.length, 2);
  assert.ok(keys[0]!.includes("torneo-live-db"));
});
