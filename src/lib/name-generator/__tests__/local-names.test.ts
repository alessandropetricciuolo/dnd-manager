import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateLocalNameSuggestions } from "@/lib/name-generator/local-names";
import type { NameGeneratorKind } from "@/lib/name-generator/types";

const ALL_KINDS: NameGeneratorKind[] = [
  "npc",
  "location",
  "monster",
  "item",
  "magic_item",
  "lore",
  "character",
  "mission",
  "campaign",
  "guild",
  "scene",
];

describe("generateLocalNameSuggestions", () => {
  for (const kind of ALL_KINDS) {
    it(`returns unique non-empty names for kind ${kind}`, () => {
      const names = generateLocalNameSuggestions(kind, 5);
      assert.equal(names.length, 5);
      assert.equal(new Set(names.map((n) => n.toLowerCase())).size, 5);
      for (const name of names) {
        assert.ok(name.trim().length >= 2);
      }
    });
  }

  it("clamps count between 1 and 8", () => {
    assert.equal(generateLocalNameSuggestions("npc", 0).length, 1);
    assert.equal(generateLocalNameSuggestions("npc", 20).length, 8);
  });
});
