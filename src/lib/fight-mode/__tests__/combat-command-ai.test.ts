import test from "node:test";
import assert from "node:assert/strict";
import { authorizeCombatCommandAi } from "../combat-command-ai-access";
import { validateAiCombatPayload } from "../combat-command-ai-schema";

const context = (user: { id: string } | null, role: string | null) => async () => ({ user, profile: { role } });

test("auth errors, no user e GM assegnato a un'altra campagna fermano il provider", async () => {
  let providerCalls = 0;
  const mockedProvider = async () => { providerCalls += 1; };
  const cases = [
    authorizeCombatCommandAi("campaign-1", async () => { throw new Error("auth unavailable"); }, async () => "gm-1"),
    authorizeCombatCommandAi("campaign-1", context(null, null), async () => "gm-1"),
    authorizeCombatCommandAi("campaign-1", context({ id: "gm-2" }, "gm"), async () => "gm-1"),
  ];
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    for (const result of await Promise.all(cases)) {
      if (result.authorized) await mockedProvider();
      assert.equal(result.authorized, false);
    }
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(providerCalls, 0);
});

test("solo GM della campagna specifica e admin globale sono autorizzati", async () => {
  assert.deepEqual(await authorizeCombatCommandAi("campaign-1", context({ id: "gm-1" }, "gm"), async () => "gm-1"), { authorized: true });
  assert.deepEqual(await authorizeCombatCommandAi("campaign-1", context({ id: "admin-1" }, "admin"), async () => null), { authorized: true });
  assert.equal((await authorizeCombatCommandAi(undefined, context({ id: "gm-1" }, "gm"), async () => null)).authorized, false);
});

test("schema AI rifiuta kind, numeric range, ID malformati e campi estranei", () => {
  const valid = { explanation: "Ok", operations: [{ kind: "damage", targetId: "pc-1", amount: 10 }], unresolvedTargets: [], missingData: [] };
  assert.equal(validateAiCombatPayload(valid).success, true);
  assert.equal(validateAiCombatPayload({ ...valid, operations: [{ kind: "damage", targetId: "pc-1", amount: 10001 }] }).success, false);
  assert.equal(validateAiCombatPayload({ ...valid, operations: [{ kind: "damage", targetId: "invented", amount: 10, extra: true }] }).success, false);
  assert.equal(validateAiCombatPayload({ ...valid, operations: [{ kind: "other", targetId: "pc-1" }] }).success, false);
});
