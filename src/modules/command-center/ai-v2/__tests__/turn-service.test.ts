import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryThreadRepository } from "../thread-repository";
test("thread repository resumes only an explicitly selected thread", async () => { const repo = new InMemoryThreadRepository(); const a = await repo.getOrCreateThread("u", "c"); const b = await repo.getOrCreateThread("u", "c"); assert.notEqual(a.id, b.id); assert.equal((await repo.getOrCreateThread("u", "c", a.id)).id, a.id); for (let i = 0; i < 14; i++) await repo.appendTurn({ threadId: a.id, role: "user", content: String(i), intent: "answer", artifactIds: [] }); assert.deepEqual((await repo.listTurns(a.id, 3)).map(x => x.content), ["11", "12", "13"]); });
