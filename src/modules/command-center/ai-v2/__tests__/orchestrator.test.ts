import test from "node:test";
import assert from "node:assert/strict";
import { runAssistantTurn } from "../orchestrator";
import { deterministicRouter } from "../assistant-model-router";
import { InMemoryThreadRepository } from "../thread-repository";
import type { AssistantModelRouter } from "../assistant-model-router";

test("creates and naturally revises the same draft three times", async () => {
  const repo = new InMemoryThreadRepository();
  const base = { repo, router: deterministicRouter, ownerUserId: "gm-1", campaignId: "camp-1" };
  const first = await runAssistantTurn({ ...base, message: "Crea un PNG per la Città di Sotto" });
  assert.equal(first.intent, "create");
  let threadId = repo.threads[0].id;
  for (const message of ["Rendilo più anziano", "Legalo al Catino", "Fallo notturno"]) {
    const result = await runAssistantTurn({ ...base, threadId, message });
    assert.equal(result.intent, "revise");
  }
  assert.equal(repo.artifacts.length, 4);
  assert.equal(repo.artifacts.at(-1)?.revision, 4);
  assert.equal(repo.artifacts.at(-1)?.parentArtifactId, repo.artifacts.at(-2)?.id);
  assert.equal(repo.turns.length, 8);
});

test("ambiguous empty input asks one targeted clarification", async () => {
  const result = await runAssistantTurn({ repo: new InMemoryThreadRepository(), router: deterministicRouter, ownerUserId: "gm-1", campaignId: "camp-1", message: "   " });
  assert.equal(result.intent, "ask_clarification");
  assert.equal(result.clarification.required, true);
});

test("save proposes confirmation and never invokes a domain action", async () => {
  const repo = new InMemoryThreadRepository();
  const base = { repo, router: deterministicRouter, ownerUserId: "gm-1", campaignId: "camp-1" };
  await runAssistantTurn({ ...base, message: "Crea un luogo" });
  const result = await runAssistantTurn({ ...base, message: "Salva" });
  assert.equal(result.intent, "save");
  assert.deepEqual(result.artifactOperations[0], { op: "request_confirmation", artifactId: repo.artifacts[0].id, actionName: "assistant.artifact.save" });
});

test("stale thread is rejected", async () => {
  await assert.rejects(() => runAssistantTurn({ repo: new InMemoryThreadRepository(), router: deterministicRouter, ownerUserId: "gm-1", campaignId: "camp-1", threadId: "wrong", message: "Crea" }), /non autorizzato/);
});

test("generating an image from a Wiki revision keeps the complete Wiki artifact", async () => {
  const repo = new InMemoryThreadRepository();
  const router: AssistantModelRouter = {
    async orchestrate({ artifact }) {
      if (!artifact) return {
        message: "Wiki pronta.", intent: "create", kind: "wiki", title: "Dan", content: "Testo della scheda", actionName: "wiki.entity.create",
        actionInput: { type: "npc", title: "Dan", content: "Testo della scheda", attributes: { race: "Umano", class: "Popolano" }, tags: ["Portico"], relations: [] },
      };
      return { message: "Genero l'immagine.", intent: "generate_image", content: "Descrizione visiva" };
    },
  };
  const base = { repo, router, ownerUserId: "gm-1", campaignId: "camp-1" };
  const first = await runAssistantTurn({ ...base, message: "Crea Dan" });
  const image = await runAssistantTurn({ ...base, message: "Genera l'immagine" });
  assert.equal(image.intent, "generate_image");
  assert.equal(image.artifact?.kind, "wiki");
  assert.equal(image.artifact?.revision, 2);
  assert.equal(image.artifact?.payload.actionName, "wiki.entity.create");
  assert.deepEqual((image.artifact?.payload.actionInput as { attributes: unknown; tags: unknown }).attributes, { race: "Umano", class: "Popolano" });
  assert.deepEqual((image.artifact?.payload.actionInput as { attributes: unknown; tags: unknown }).tags, ["Portico"]);
  assert.equal(image.artifact?.parentArtifactId, first.artifact?.id);
});
