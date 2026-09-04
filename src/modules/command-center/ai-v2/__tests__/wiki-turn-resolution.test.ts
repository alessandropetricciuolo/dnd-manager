import test from "node:test";
import assert from "node:assert/strict";
import { finalizeWikiRevision, findOfficialStatblockContext, resolveMissionReference, resolveNpcStatblockClass } from "../wiki-turn-resolution";
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
  assert.deepEqual(result.actionInput?.attributes, { class: "Popolano" });
  assert.equal(result.actionInput?.xpValue, undefined);
});

test("uses the recognized Popolano class rather than the NPC name for official statblock lookup", async () => {
  const resolution = resolveNpcStatblockClass("generami lo statblock di Paolo, è un popolano di livello 1", previous);
  assert.deepEqual(resolution, { status: "recognized", npcClass: "Popolano" });
  let pattern = "";
  const db = { from: () => ({ select: () => ({ ilike: (_column: string, value: string) => ({ limit: async () => { pattern = value; return { data: [{ content: "## Popolano\nStatistiche ufficiali", metadata: { manual_book_key: "dungeon_masters_guide" } }], error: null }; } }) }) }) };
  const context = await findOfficialStatblockContext(db as never, "generami lo statblock di Paolo, è un popolano di livello 1", resolution.npcClass);
  assert.equal(pattern, "%## Popolano%");
  assert.match(context ?? "", /Popolano/);
});

test("asks the GM to select a supported class when the stored profession is not a class", () => {
  const withProfession = { ...previous, payload: { ...previous.payload, actionInput: { ...previous.payload.actionInput, attributes: { class: "Artigiano" } } } };
  const result = finalizeWikiRevision({ message: "genera lo statblock di Paolo", previous: withProfession, context: "FONTI", mission: { requested: false }, output: { intent: "revise", message: "Fatto", content: "Contenuto", patch: { path: "/content", value: "Contenuto" }, actionName: "wiki.entity.create", actionInput: {} } });
  assert.equal(result.intent, "ask_clarification");
  assert.match(result.message, /Artigiano/i);
  assert.match(result.message, /Popolano/);
  assert.match(result.message, /Classi degli avventurieri/);
});

test("a recognized class replaces an obsolete profession in the wiki attributes", () => {
  const withProfession = { ...previous, payload: { ...previous.payload, actionInput: { ...previous.payload.actionInput, attributes: { class: "Artigiano" } } } };
  const result = finalizeWikiRevision({ message: "genera lo statblock di Paolo, è un popolano di livello 1", previous: withProfession, context: "FONTE REGOLISTICA UFFICIALE — Guida del DM", mission: { requested: false }, output: { intent: "revise", message: "Fatto", content: "Contenuto", patch: { path: "/content", value: "Contenuto" }, actionName: "wiki.entity.create", actionInput: { attributes: { statblock: "Statblock ufficiale" } } } });
  assert.equal(result.actionInput?.attributes?.class, "Popolano");
  assert.equal(result.actionInput?.attributes?.statblock, "Statblock ufficiale");
});

test("mission link uses the server-resolved ID and feedback never duplicates the narrative", () => {
  const result = finalizeWikiRevision({ message: "collega alla missione, Coccatrice Scomparsa", previous, context: "FONTI", mission: { requested: true, status: "resolved", mission: { id: "m-1", title: "Coccatrice Scomparsa" } }, output: { intent: "revise", message: "La storia completa di Paolo.", content: "La storia completa di Paolo.", patch: { path: "/content", value: "La storia completa di Paolo." }, actionName: "wiki.entity.create", actionInput: { attributes: { combat_stats: { hp: "14" } } } } });
  assert.equal(result.actionInput?.linkedMissionId, "m-1");
  assert.match(result.message, /accettato/i);
  assert.doesNotMatch(result.message, /La storia completa di Paolo/);
});

test("verified canonical references add durable tags and relations without replacing existing ones", () => {
  const result = finalizeWikiRevision({
    message: "Crea Dan della Locanda della Sirena a Portico.",
    previous,
    context: "FONTI",
    mission: { requested: false },
    canonicalReferences: [
      { targetType: "wiki", targetId: "inn-1", name: "Locanda della Sirena" },
      { targetType: "map", targetId: "map-1", name: "Portico" },
    ],
    output: {
      intent: "revise", message: "Fatto", content: "Dan lavora alla locanda.", patch: { path: "/content", value: "Dan lavora alla locanda." }, actionName: "wiki.entity.create",
      actionInput: { tags: ["Locandiere"], relations: [{ targetType: "wiki", targetId: "existing-1", label: "Famiglia" }] },
    },
  });
  assert.deepEqual(result.actionInput?.tags, ["Portico", "Locandiere", "Locanda della Sirena"]);
  assert.deepEqual(result.actionInput?.relations, [
    { targetType: "wiki", targetId: "existing-1", label: "Famiglia" },
    { targetType: "wiki", targetId: "inn-1", label: "Riferimento canonico: Locanda della Sirena" },
    { targetType: "map", targetId: "map-1", label: "Riferimento canonico: Portico" },
  ]);
});

test("a Wiki draft always has a type and defaults to secret visibility", () => {
  const result = finalizeWikiRevision({ message: "Generami Dan, il locandiere", previous: null, context: "FONTI", mission: { requested: false }, output: { intent: "create", message: "Fatto", content: "Dan", kind: "wiki", actionName: "wiki.entity.create", actionInput: { title: "Dan" } } });
  assert.equal(result.actionInput?.type, "npc");
  assert.equal(result.actionInput?.visibility, "secret");
});

test("a Wiki output without a model action name still receives the create contract", () => {
  const result = finalizeWikiRevision({ message: "Generami Dan, il locandiere", previous: null, context: "FONTI", mission: { requested: false }, output: { intent: "create", message: "Fatto", content: "Dan", kind: "wiki" } });
  assert.equal(result.actionName, "wiki.entity.create");
  assert.equal(result.actionInput?.type, "npc");
});
