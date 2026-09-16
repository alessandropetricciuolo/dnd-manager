import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWikiLocationMapIndex,
  countPinsByTarget,
  formatPinCountLabel,
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

  it("counts each physical pin once and follows indirect map bindings", () => {
    assert.deepEqual(
      countPinsByTarget(
        [
          { id: "p1", link_map_id: "m1", link_entity_id: null },
          { id: "p1", link_map_id: "m1", link_entity_id: null },
          { id: "p2", link_map_id: null, link_entity_id: "e1" },
          { id: "p3", link_map_id: "m2", link_entity_id: "e2" },
          { id: "p4", link_map_id: "m1", link_entity_id: "e2" },
        ],
        { e1: "m1" },
        { m1: "e1", m2: "e2" },
        { mapIds: ["m1", "m2"], entityIds: ["e1", "e2"] }
      ),
      {
        mapPinCounts: { m1: 3, m2: 1 },
        wikiPinCounts: { e1: 3, e2: 1 },
      }
    );
  });

  it("keeps counts within visible campaign targets and handles unknown counts", () => {
    assert.deepEqual(
      countPinsByTarget(
        [
          { id: "p1", link_map_id: "other-campaign-map", link_entity_id: null },
          { id: "p2", link_map_id: null, link_entity_id: "hidden-location" },
          { id: "p3", link_map_id: null, link_entity_id: null },
          { id: "p4", link_map_id: "hidden-map", link_entity_id: null },
        ],
        { "hidden-location": "visible-map" },
        { "hidden-map": "visible-location" },
        { mapIds: ["current-campaign-map"], entityIds: ["visible-location"] }
      ),
      { mapPinCounts: {}, wikiPinCounts: {} }
    );
    assert.equal(formatPinCountLabel(0), "Nessun pin collegato");
    assert.equal(formatPinCountLabel(3), "Già collegato · 3 pin");
    assert.equal(formatPinCountLabel(undefined), "Conteggio non disponibile");
    assert.equal(formatPinCountLabel(null, false), "Conteggio non disponibile");
  });
});
