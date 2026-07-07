import test from "node:test";
import assert from "node:assert/strict";

import {
  detectNpcBatchCreateRequest,
  extractBatchCount,
  extractLocationNameFromPrompt,
  extractNamedRolesFromPrompt,
  planNpcBatchRoles,
} from "../wiki-npc-batch";

test("extractBatchCount parses digit and italian words", () => {
  assert.equal(extractBatchCount("generami 5 npc per la città"), 5);
  assert.equal(extractBatchCount("crea cinque png"), 5);
});

test("extractNamedRolesFromPrompt parses profession list", () => {
  const roles = extractNamedRolesFromPrompt(
    "generami il panettiere, il calzolaio, il barbiere e il sindaco della città di Waterdeep"
  );
  assert.deepEqual(roles, ["Panettiere", "Calzolaio", "Barbiere", "Sindaco"]);
});

test("extractLocationNameFromPrompt finds city name", () => {
  assert.equal(
    extractLocationNameFromPrompt("5 npc che vivono nella città di Baldur's Gate"),
    "Baldur's Gate"
  );
});

test("planNpcBatchRoles fills random professions", () => {
  const roles = planNpcBatchRoles(4, ["Panettiere"]);
  assert.equal(roles.length, 4);
  assert.equal(roles[0], "Panettiere");
  assert.equal(new Set(roles.map((r) => r.toLowerCase())).size, 4);
});

test("detectNpcBatchCreateRequest for count prompt", () => {
  const detected = detectNpcBatchCreateRequest(
    "generami 3 npc che vivono e lavorano nella città di Neverwinter"
  );
  assert.ok(detected);
  assert.equal(detected?.count, 3);
  assert.equal(detected?.locationName, "Neverwinter");
});

test("detectNpcBatchCreateRequest returns null for single npc", () => {
  assert.equal(detectNpcBatchCreateRequest("generami un npc halfling ladro"), null);
});
