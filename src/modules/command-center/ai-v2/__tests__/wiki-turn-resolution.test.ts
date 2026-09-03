import test from "node:test";
import assert from "node:assert/strict";
import { finalizeWikiRevision, resolveMissionReference } from "../wiki-turn-resolution";
import type { AiAssistantArtifact } from "../contracts";

const previous: AiAssistantArtifact = {
  id: "draft-1", threadId: "thread-1", campaignId: "campaign-1", kind: "wiki", status: "draft", revision: 1, parentArtifactId: null,
  payload: { title: "Paolo", content: "La storia completa di Paolo.", actionName: "wiki.entity.create", actionInput: { type: "npc", title: "Paolo", content: "La storia completa di Paolo.", visibility: "secret", tags: ["Portico"], attributes: { race: "Umano", combat_stats: { hp: "12", ac: "11" } } } }, sourceRefs: [], policyVersion: null, savedEntity: null,
};

test("resolves an exact campaign mission and rejects a missing one", async () => {
  const db = { from: () => ({ select: () => ({ eq: async () => ({ data: [{ id: "m-1", title: "Coccatrice Scomparsa" }], error: null }) }) }) };
  const found = await resolveMissionReference(db as never, "campaign-1", "collega alla missione, Coccatrice Scomparsa");
  assert.deepEqual(found, { requested: true, status: "resolved", mission: { id: "m-1", title: "Coccatrice Scomparsa" } });
  const absent = await resolveMissionReference(db as never, "campaign-1", "collega alla missione, Inesistente");
  assert.deepEqual(absent, { requested: true, status: "missing", name: "Inesistente" });
});

test("statblock without an official source is refused while other wiki changes survive", () => {
  const result = finalizeWikiRevision({ message: "genera lo statblock: è un popolano livello 1. Aggiungi tag Prova", previous, context: "FONTI: nessuna", mission: { requested: false }, output: { intent: "revise", message: "La storia completa di Paolo.", content: "La storia completa di Paolo.", patch: { path: "/content", value: "La storia completa di Paolo." }, actionName: "wiki.entity.create", actionInput: { tags: ["Portico", "Prova"], attributes: { statblock: "inventato", combat_stats: { hp: "8" } }, xpValue: 200 } } });
  assert.match(result.message, /statblock non applicato/i);
  assert.doesNotMatch(result.message, /La storia completa di Paolo/);
  assert.deepEqual(result.actionInput?.tags, ["Portico", "Prova"]);
  assert.deepEqual(result.actionInput?.attributes, {});
  assert.equal(result.actionInput?.xpValue, undefined);
});

test("mission link uses the server-resolved ID and feedback never duplicates the narrative", () => {
  const result = finalizeWikiRevision({ message: "collega alla missione, Coccatrice Scomparsa", previous, context: "FONTI", mission: { requested: true, status: "resolved", mission: { id: "m-1", title: "Coccatrice Scomparsa" } }, output: { intent: "revise", message: "La storia completa di Paolo.", content: "La storia completa di Paolo.", patch: { path: "/content", value: "La storia completa di Paolo." }, actionName: "wiki.entity.create", actionInput: { attributes: { combat_stats: { hp: "14" } } } } });
  assert.equal(result.actionInput?.linkedMissionId, "m-1");
  assert.match(result.message, /accettato/i);
  assert.doesNotMatch(result.message, /La storia completa di Paolo/);
});
