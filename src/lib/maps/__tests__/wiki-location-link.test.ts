import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWikiLocationMapIndex,
  resolveMapPinTarget,
} from "../wiki-location-link";

describe("wiki-location-link", () => {
  it("resolves direct map pin", () => {
    assert.deepEqual(resolveMapPinTarget({ linkMapId: "map-1" }, {}), {
      kind: "map",
      mapId: "map-1",
    });
  });

  it("resolves wiki location with bound map to map", () => {
    assert.deepEqual(
      resolveMapPinTarget({ linkEntityId: "ent-1" }, { "ent-1": "map-interior" }),
      { kind: "map", mapId: "map-interior" }
    );
  });

  it("resolves wiki location without map to wiki page", () => {
    assert.deepEqual(resolveMapPinTarget({ linkEntityId: "ent-2" }, {}), {
      kind: "wiki",
      entityId: "ent-2",
    });
  });

  it("builds entity to map index", () => {
    assert.deepEqual(
      buildWikiLocationMapIndex([
        { id: "m1", wiki_entity_id: "e1" },
        { id: "m2", wiki_entity_id: null },
      ]),
      { e1: "m1" }
    );
  });
});
