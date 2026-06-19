import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  augmentLocationVisualAnchors,
  buildLocationTechnicalLine,
  detectLocationSceneKind,
  haystackHasSpecificVenueSubject,
} from "../image-prompt-location";

describe("detectLocationSceneKind", () => {
  it("detects interior commerce for butcher shop", () => {
    assert.equal(
      detectLocationSceneKind("bottega del macellaio di portico"),
      "interior_commerce"
    );
  });

  it("detects interior tavern", () => {
    assert.equal(detectLocationSceneKind("locanda del gallo"), "interior_tavern");
  });

  it("defaults to exterior for generic place", () => {
    assert.equal(detectLocationSceneKind("foresta di Eldaria"), "exterior");
  });
});

describe("buildLocationTechnicalLine", () => {
  it("uses interior shop framing for commerce", () => {
    const line = buildLocationTechnicalLine("interior_commerce");
    assert.match(line, /interior shop scene/i);
    assert.match(line, /no wide cityscape/i);
  });

  it("uses wide shot for exterior", () => {
    const line = buildLocationTechnicalLine("exterior");
    assert.match(line, /environmental wide shot/i);
  });
});

describe("augmentLocationVisualAnchors", () => {
  it("adds butcher shop anchors", () => {
    const out = augmentLocationVisualAnchors("bottega del macellaio di portico");
    assert.match(out, /Scene anchors:/);
    assert.match(out, /meat hooks/i);
    assert.match(out, /cutting block/i);
  });

  it("leaves generic exterior unchanged", () => {
    const out = augmentLocationVisualAnchors("collina boscosa");
    assert.equal(out, "collina boscosa");
  });
});

describe("haystackHasSpecificVenueSubject", () => {
  it("matches venue keywords", () => {
    assert.equal(haystackHasSpecificVenueSubject("bottega del macellaio"), true);
    assert.equal(haystackHasSpecificVenueSubject("foresta antica"), false);
  });
});
