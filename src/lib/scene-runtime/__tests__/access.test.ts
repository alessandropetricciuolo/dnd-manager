import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canManageTacticalScene } from "../access";

describe("R6.3 server workspace guard", () => {
  it("allows GM and Admin only", () => {
    assert.equal(canManageTacticalScene("gm"), true);
    assert.equal(canManageTacticalScene("admin"), true);
    assert.equal(canManageTacticalScene("player"), false);
    assert.equal(canManageTacticalScene(null), false);
    assert.equal(canManageTacticalScene(undefined), false);
  });
});
