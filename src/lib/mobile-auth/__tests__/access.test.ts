import assert from "node:assert/strict";
import test from "node:test";
import { prepareLoginCredentials, resolveTrustedProfileRole } from "../../../../mobile/src/auth/access";

test("only a valid trusted profile role grants an app role", () => {
  assert.equal(resolveTrustedProfileRole("player"), "player");
  assert.equal(resolveTrustedProfileRole("gm"), "gm");
  assert.equal(resolveTrustedProfileRole("admin"), "admin");
  assert.equal(resolveTrustedProfileRole(null), null);
  assert.equal(resolveTrustedProfileRole(undefined), null);
  assert.equal(resolveTrustedProfileRole("owner"), null);
  assert.equal(resolveTrustedProfileRole({ role: "admin" }), null);
});

test("login trims the email but preserves password whitespace exactly", () => {
  assert.deepEqual(prepareLoginCredentials("  player@example.com  ", " pass word "), {
    email: "player@example.com",
    password: " pass word ",
  });
  assert.equal(prepareLoginCredentials("  ", "secret").error, "Inserisci il tuo indirizzo email.");
  assert.equal(prepareLoginCredentials("player@example.com", "").error, "Inserisci la tua password.");
});
