import test from "node:test";
import assert from "node:assert/strict";
import { mergeWikiArtifactActionInput, normalizeWikiArtifactActionInput } from "../wiki-artifact";

test("normalizes supported wiki types and rejects malformed transport fields", () => {
  const result = normalizeWikiArtifactActionInput({ type: "npc", visibility: "selective", tags: [" porto ", 3, "porto"], audiences: { userIds: ["u-1"], partyIds: ["p-1"] }, relations: [{ targetType: "wiki", targetId: "entity-1", label: "conosce" }, { targetType: "invalid", targetId: "x" }] });
  assert.equal(result.type, "npc"); assert.deepEqual(result.tags, ["porto"]); assert.deepEqual(result.audiences, { userIds: ["u-1"], partyIds: ["p-1"] }); assert.deepEqual(result.relations, [{ targetType: "wiki", targetId: "entity-1", label: "conosce" }]);
});

test("targeted revisions preserve common and nested wiki fields", () => {
  const revised = mergeWikiArtifactActionInput({ type: "monster", visibility: "secret", tags: ["fogne"], attributes: { gm_notes: "Segreto", combat_stats: { hp: "45", ac: "15", cr: "2", attacks: "Morso" } }, relations: [{ targetType: "map", targetId: "map-1", label: "Tana" }] }, { visibility: "selective", attributes: { combat_stats: { hp: "52" } } });
  assert.equal(revised.visibility, "selective"); assert.deepEqual((revised.attributes as { combat_stats: unknown }).combat_stats, { hp: "52", ac: "15", cr: "2", attacks: "Morso" }); assert.equal((revised.attributes as { gm_notes: string }).gm_notes, "Segreto"); assert.deepEqual(revised.tags, ["fogne"]); assert.deepEqual(revised.relations, [{ targetType: "map", targetId: "map-1", label: "Tana" }]);
});
