import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCreatureFullBodyNegativeHints,
  buildCreatureTechnicalLine,
  haystackRequestsSeatedPose,
} from "../image-prompt-character-framing";

describe("haystackRequestsSeatedPose", () => {
  it("detects explicit seated instructions", () => {
    assert.equal(haystackRequestsSeatedPose("generale seduto al tavolo della taverna"), true);
    assert.equal(haystackRequestsSeatedPose("orc sitting on a throne"), true);
  });

  it("defaults to standing when pose not specified", () => {
    assert.equal(haystackRequestsSeatedPose("guerriero nano con ascia"), false);
  });
});

describe("buildCreatureTechnicalLine", () => {
  it("uses standing full-body framing for NPC by default", () => {
    const line = buildCreatureTechnicalLine("npc", "elfo ranger con arco");
    assert.match(line, /full-body fantasy character/i);
    assert.match(line, /standing/i);
    assert.match(line, /head to toe/i);
  });

  it("uses standing full-body framing for monsters by default", () => {
    const line = buildCreatureTechnicalLine("monster", "drago rosso aggressivo");
    assert.match(line, /full-body fantasy creature/i);
    assert.match(line, /standing/i);
  });

  it("allows seated framing when prompt requests it", () => {
    const line = buildCreatureTechnicalLine("npc", "re seduto sul trono di pietra");
    assert.match(line, /seated pose as described/i);
    assert.doesNotMatch(line, /standing/i);
  });
});

describe("buildCreatureFullBodyNegativeHints", () => {
  it("forbids seated poses unless explicitly requested", () => {
    const hints = buildCreatureFullBodyNegativeHints("nano guerriero");
    assert.match(hints, /seated pose/i);
    assert.match(hints, /missing feet/i);
  });

  it("skips seated negative when prompt asks to sit", () => {
    const hints = buildCreatureFullBodyNegativeHints("nano seduto al bancone");
    assert.doesNotMatch(hints, /seated pose/i);
    assert.match(hints, /missing feet/i);
  });
});
