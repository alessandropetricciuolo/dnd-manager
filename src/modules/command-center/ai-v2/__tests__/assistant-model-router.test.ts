import assert from "node:assert/strict";
import test from "node:test";
import { createOpenRouterAssistantRouter } from "../assistant-model-router";

const input = {
  message: "dammi 3 idee per missioni di grado c",
  turns: [], artifact: null, context: "TIPO CAMPAGNA: long",
};
const plan = {
  intent: "create", kind: "mission_plan", actionName: "mission.plan",
  message: "Ecco tre proposte.", content: "Tre missioni di grado C da sviluppare.",
  actionInput: { planOnly: true, proposals: [1, 2, 3].map(i => ({ title: `Missione ${i}`, grade: "C" })) },
};

test("mission ideas produce a reviewable plan with the explicit intent contract", async () => {
  let calls = 0;
  const router = createOpenRouterAssistantRouter(async prompt => {
    calls++;
    assert.match(prompt, /intent="create"/);
    assert.match(prompt, /answer, create, revise, generate_image, save, discard, ask_clarification/);
    return JSON.stringify(plan);
  });
  const output = await router.orchestrate(input);
  assert.equal(calls, 1);
  assert.equal(output.intent, "create");
  assert.equal(output.kind, "mission_plan");
  assert.equal(output.actionName, "mission.plan");
  assert.equal((output.actionInput?.proposals as unknown[]).length, 3);
});

test("invalid intent is regenerated once without coercing it into a save", async () => {
  let calls = 0;
  const router = createOpenRouterAssistantRouter(async prompt => {
    if (++calls === 1) return JSON.stringify({ ...plan, intent: "mission_plan" });
    assert.match(prompt, /CORREZIONE FORMATO/);
    return JSON.stringify(plan);
  });
  const output = await router.orchestrate(input);
  assert.equal(calls, 2);
  assert.equal(output.intent, "create");
  assert.equal(output.actionName, "mission.plan");
});

test("repeated invalid intent remains rejected after two attempts", async () => {
  let calls = 0;
  const router = createOpenRouterAssistantRouter(async () => {
    calls++;
    return JSON.stringify({ ...plan, intent: "unsupported" });
  });
  await assert.rejects(router.orchestrate(input), /Intent non consentito/);
  assert.equal(calls, 2);
});

test("transport failure does not trigger format regeneration", async () => {
  let calls = 0;
  const router = createOpenRouterAssistantRouter(async () => { calls++; throw new Error("Provider unavailable"); });
  await assert.rejects(router.orchestrate(input), /Provider unavailable/);
  assert.equal(calls, 1);
});
