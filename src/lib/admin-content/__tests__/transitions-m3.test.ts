import test from "node:test";
import assert from "node:assert/strict";
import { resolveAdminOnlyTransition } from "../transitions";

test("M3 forces a new protected draft intent", () => {
  assert.deepEqual(resolveAdminOnlyTransition({ currentAdminOnly: false, protect: true, release: false }), { ok: true, intent: "protect", nextAdminOnly: true });
});
test("M3 rejects conflicting intents and release of normal content", () => {
  assert.equal(resolveAdminOnlyTransition({ currentAdminOnly: false, protect: true, release: true }).ok, false);
  assert.deepEqual(resolveAdminOnlyTransition({ currentAdminOnly: false, protect: false, release: true }), { ok: false, reason: "release_requires_protected" });
});
test("normal edits preserve protected state without protect audit", () => {
  assert.deepEqual(resolveAdminOnlyTransition({ currentAdminOnly: true, protect: false, release: false }), { ok: true, intent: "none", nextAdminOnly: true });
});
