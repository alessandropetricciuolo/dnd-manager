import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryThreadRepository } from "../thread-repository";
test("thread repository limits history and resumes active thread", async () => { const repo = new InMemoryThreadRepository(); const a = await repo.getOrCreateThread("u", "c"); const b = await repo.getOrCreateThread("u", "c"); assert.equal(a.id, b.id); for (let i = 0; i < 14; i++) await repo.appendTurn({ threadId: a.id, role: "user", content: String(i), intent: "answer", artifactIds: [] }); assert.deepEqual((await repo.listTurns(a.id, 3)).map(x => x.content), ["11", "12", "13"]); });
