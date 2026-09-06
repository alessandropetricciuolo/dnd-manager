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
  const first = await runAssistantTurn({ ...base, message: "Crea un luogo" });
  const result = await runAssistantTurn({ ...base, threadId: first.threadId, message: "Salva" });
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
  const image = await runAssistantTurn({ ...base, threadId: first.threadId, message: "Genera l'immagine" });
  assert.equal(image.intent, "generate_image");
  assert.equal(image.artifact?.kind, "wiki");
  assert.equal(image.artifact?.revision, 2);
  assert.equal(image.artifact?.payload.actionName, "wiki.entity.create");
  assert.deepEqual((image.artifact?.payload.actionInput as { attributes: unknown; tags: unknown }).attributes, { race: "Umano", class: "Popolano" });
  assert.deepEqual((image.artifact?.payload.actionInput as { attributes: unknown; tags: unknown }).tags, ["Portico"]);
  assert.equal(image.artifact?.parentArtifactId, first.artifact?.id);
});

test("R3 sviluppa due proposte indipendenti e mantiene il piano riutilizzabile", async () => {
  const repo = new InMemoryThreadRepository();
  const router: AssistantModelRouter = { async orchestrate({ artifact }) {
    const payload = (artifact as { payload?: Record<string, unknown> } | null)?.payload;
    if (!payload?.selectedProposals) return { intent: "create", message: "Piano", kind: "mission_plan", title: "Piano D", content: "1. A\n2. B\n3. C", actionName: "mission.plan", actionInput: { planOnly: true, proposals: [{ id: "a", grade: "D", title: "A", premise: "a", committente: "g", ubicazione: "u", canonicalReferences: [] }, { id: "b", grade: "D", title: "B", premise: "b", committente: "g", ubicazione: "u", canonicalReferences: [] }, { id: "c", grade: "D", title: "C", premise: "c", committente: "g", ubicazione: "u", canonicalReferences: [] }] } };
    const selected = (payload.selectedProposals as Array<{ id: string }>)[0];
    return { intent: "create", message: `Missione ${selected.id}`, title: selected.id, content: `Dettagli ${selected.id}`, actionName: "mission.create", actionInput: { grade: "D", title: selected.id, committente: "g", ubicazione: "u", paga: "10", urgenza: "media", description: `Dettagli ${selected.id}`, pointsReward: 1 } };
  } };
  const base = { repo, router, ownerUserId: "gm-1", campaignId: "camp-1", context: "TIPO CAMPAGNA: long" };
  const plan = await runAssistantTurn({ ...base, message: "creami 3 missioni di grado D" });
  const developed = await runAssistantTurn({ ...base, threadId: plan.threadId, message: "sviluppa 1 e 3" });
  const created = developed.artifactOperations.filter((op) => op.op === "create").map((op) => op.artifact).filter((item) => item.payload.actionName === "mission.create");
  assert.equal(created.length, 2);
  assert.deepEqual(created.map((item) => (item.payload.actionInput as Record<string, unknown>).proposalId), ["a", "c"]);
  assert.ok(created.every((item) => (item.payload.actionInput as Record<string, unknown>).originPlanArtifactId === plan.artifact?.id));
  const remaining = await runAssistantTurn({ ...base, threadId: plan.threadId, message: "sviluppa la proposta 2" });
  assert.equal(remaining.artifactOperations.filter((op) => op.op === "create").length, 1);
  assert.ok(repo.artifacts.some((item) => item.kind === "mission_plan"));
});
