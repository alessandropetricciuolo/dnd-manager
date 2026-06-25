import assert from "node:assert/strict";
import test from "node:test";
import { shouldSkipPreCloseRewards } from "@/lib/sessions/pre-close-guard";

test("shouldSkipPreCloseRewards is true only when session is already pre-closed", () => {
  assert.equal(shouldSkipPreCloseRewards(true), true);
  assert.equal(shouldSkipPreCloseRewards(false), false);
  assert.equal(shouldSkipPreCloseRewards(null), false);
  assert.equal(shouldSkipPreCloseRewards(undefined), false);
});
