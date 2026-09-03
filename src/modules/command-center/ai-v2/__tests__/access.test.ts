import test from "node:test";
import assert from "node:assert/strict";
import { resolvePilotEntitlement } from "../access";

test("pilot entitlement rejects players before any downstream work", () => {
  assert.equal(resolvePilotEntitlement("player", { enabled: true }, { enabled: true }).ok, false);
});

test("campaign-specific pilot configuration overrides the global GM record", () => {
  assert.deepEqual(resolvePilotEntitlement("gm", { enabled: true }, { enabled: false }), {
    ok: false,
    error: "Il pilot Assistente v2 non è abilitato per questa campagna.",
  });
  assert.deepEqual(resolvePilotEntitlement("gm", { enabled: false }, { enabled: true }), {
    ok: true,
    via: "campaign",
  });
});

test("admin does not depend on a pilot row", () => {
  assert.deepEqual(resolvePilotEntitlement("admin", null, null), { ok: true, via: "admin" });
});
