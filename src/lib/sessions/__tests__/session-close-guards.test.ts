import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canTransitionSessionToCompleted,
  shouldApplyPreCloseSideEffects,
} from "../session-close-guards";

describe("shouldApplyPreCloseSideEffects", () => {
  it("allows first pre-close on a scheduled session", () => {
    assert.equal(shouldApplyPreCloseSideEffects({ status: "scheduled", is_pre_closed: false }), true);
    assert.equal(shouldApplyPreCloseSideEffects({ status: "scheduled" }), true);
  });

  it("blocks repeat pre-close after draft was saved", () => {
    assert.equal(shouldApplyPreCloseSideEffects({ status: "scheduled", is_pre_closed: true }), false);
  });

  it("blocks pre-close on completed sessions", () => {
    assert.equal(shouldApplyPreCloseSideEffects({ status: "completed", is_pre_closed: false }), false);
  });
});

describe("canTransitionSessionToCompleted", () => {
  it("only allows scheduled sessions to close", () => {
    assert.equal(canTransitionSessionToCompleted({ status: "scheduled" }), true);
    assert.equal(canTransitionSessionToCompleted({ status: "completed" }), false);
  });
});
