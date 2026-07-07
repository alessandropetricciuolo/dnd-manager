import test from "node:test";
import assert from "node:assert/strict";

import {
  batchHasCompleteMechanics,
  detectNpcBatchCreateRequest,
  extractBatchCount,
  extractLinkedEntityNameFromPrompt,
  extractLocationNameFromPrompt,
  extractMissionNameFromPrompt,
  extractNamedRolesFromPrompt,
  extractStructuredNpcRoleSpecs,
  planNpcBatchRoles,
} from "../wiki-npc-batch";

const BARTOLO_PROMPT = `ho bisogno che mi generi 3 npc collegati alla missione Persona Scomprarsa. Sono collegati a bartolo de curtis. Sono
il padre di bartolo umano aristocratico livello 1
la madre di bartolo, umana aristocratica livello 1
il maggiordomo di bartolo Nano aristocratico livello 1`;

test("extractBatchCount parses mi generi 3 npc", () => {
  assert.equal(extractBatchCount("ho bisogno che mi generi 3 npc collegati"), 3);
});

test("extractNamedRolesFromPrompt parses profession list", () => {
  const roles = extractNamedRolesFromPrompt(
    "generami il panettiere, il calzolaio, il barbiere e il sindaco della città di Waterdeep"
  );
  assert.deepEqual(roles, ["Panettiere", "Calzolaio", "Barbiere", "Sindaco"]);
});

test("extractStructuredNpcRoleSpecs parses family lines", () => {
  const specs = extractStructuredNpcRoleSpecs(BARTOLO_PROMPT);
  assert.equal(specs.length, 3);
  assert.equal(specs[0]?.roleLabel, "Padre di Bartolo");
  assert.equal(specs[1]?.roleLabel, "Madre di Bartolo");
  assert.equal(specs[2]?.roleLabel, "Maggiordomo di Bartolo");
  assert.equal(specs[0]?.extraParams.npcRace, "Umano");
  assert.equal(specs[0]?.extraParams.npcClass, "Aristocratico");
  assert.equal(specs[0]?.extraParams.npcLevel, "1");
  assert.equal(specs[2]?.extraParams.npcRace, "Nano");
});

test("extractMissionNameFromPrompt finds mission title", () => {
  assert.equal(
    extractMissionNameFromPrompt("collegati alla missione Persona Scomprarsa. Sono"),
    "Persona Scomprarsa"
  );
});

test("extractLinkedEntityNameFromPrompt finds bartolo", () => {
  assert.equal(
    extractLinkedEntityNameFromPrompt("Sono collegati a bartolo de curtis. Sono"),
    "Bartolo de Curtis"
  );
});

test("extractLocationNameFromPrompt finds city name", () => {
  assert.equal(
    extractLocationNameFromPrompt("5 npc che vivono nella città di Baldur's Gate"),
    "Baldur's Gate"
  );
});

test("planNpcBatchRoles does not inject random professions when roles explicit", () => {
  const roles = planNpcBatchRoles(3, ["Padre di Bartolo", "Madre di Bartolo", "Maggiordomo di Bartolo"]);
  assert.deepEqual(roles, ["Padre di Bartolo", "Madre di Bartolo", "Maggiordomo di Bartolo"]);
  assert.ok(!roles.some((r) => r.toLowerCase() === "panettiere"));
});

test("planNpcBatchRoles fills random professions only without explicit roles", () => {
  const roles = planNpcBatchRoles(4, []);
  assert.equal(roles.length, 4);
});

test("detectNpcBatchCreateRequest for bartolo family prompt", () => {
  const detected = detectNpcBatchCreateRequest(BARTOLO_PROMPT);
  assert.ok(detected);
  assert.equal(detected?.count, 3);
  assert.equal(detected?.missionName, "Persona Scomprarsa");
  assert.equal(detected?.linkedEntityName, "Bartolo de Curtis");
  assert.deepEqual(detected?.roles, [
    "Padre di Bartolo",
    "Madre di Bartolo",
    "Maggiordomo di Bartolo",
  ]);
  assert.equal(detected?.locationName, null);
});

test("batchHasCompleteMechanics true when each line has race class level", () => {
  const detected = detectNpcBatchCreateRequest(BARTOLO_PROMPT);
  assert.ok(detected);
  assert.equal(batchHasCompleteMechanics(detected!), true);
});

test("detectNpcBatchCreateRequest for count-only city prompt", () => {
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
