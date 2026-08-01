import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildItemNegativeHints,
  buildItemTechnicalLine,
  buildLoreTechnicalLine,
} from "../image-prompt-item-lore";
import {
  dedupeNegativePromptFragments,
  STANDARD_VISUAL_NEGATIVES,
  wikiTypeToImageEntityKind,
} from "../image-prompt-builder";
import { buildImageRefineInstructionText } from "../image-refine-prompt";

describe("wikiTypeToImageEntityKind", () => {
  it("maps wiki types including item and lore", () => {
    assert.equal(wikiTypeToImageEntityKind("item"), "item");
    assert.equal(wikiTypeToImageEntityKind("lore"), "lore");
    assert.equal(wikiTypeToImageEntityKind("npc"), "npc");
    assert.equal(wikiTypeToImageEntityKind("location"), "location");
    assert.equal(wikiTypeToImageEntityKind("monster"), "monster");
  });
});

describe("item/lore framing", () => {
  it("uses isolated object technical line for items", () => {
    const line = buildItemTechnicalLine();
    assert.match(line, /isolated fantasy object/i);
    assert.match(line, /single item/i);
    assert.doesNotMatch(line, /character/i);
  });

  it("forbids people in item negatives", () => {
    const negatives = buildItemNegativeHints();
    assert.match(negatives, /people/i);
    assert.match(negatives, /character/i);
    assert.match(negatives, /portrait/i);
  });

  it("has no framing technical line for lore", () => {
    assert.equal(buildLoreTechnicalLine(), "");
  });

  it("lore negatives keep only campaign style fragments", () => {
    const combined = dedupeNegativePromptFragments(
      "dark fantasy, muted palette",
      "NO neon cyberpunk",
      "" // no STANDARD for lore path
    );
    assert.match(combined, /dark fantasy/i);
    assert.doesNotMatch(combined, /NO jeans/i);
  });

  it("item refine keeps object negatives", () => {
    const text = buildImageRefineInstructionText("item", "Una spada di fuoco", [
      { role: "user", content: "più bagliore rosso" },
    ]);
    assert.match(text, /Tipo soggetto: item/);
    assert.match(text, /isolated fantasy object/i);
    assert.match(text, /people/i);
  });

  it("lore refine does not force character framing", () => {
    const text = buildImageRefineInstructionText("lore", "Una mappa del regno", [
      { role: "user", content: "stile pergamena antica" },
    ]);
    assert.match(text, /Tipo soggetto: lore/);
    assert.doesNotMatch(text, /full-body fantasy character/i);
    assert.doesNotMatch(text, new RegExp(STANDARD_VISUAL_NEGATIVES.slice(0, 20)));
  });
});
