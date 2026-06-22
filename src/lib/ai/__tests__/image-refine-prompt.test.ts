import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildImageRefineInstructionText } from "../image-refine-prompt";

describe("buildImageRefineInstructionText", () => {
  it("includes base description and latest user edit", () => {
    const text = buildImageRefineInstructionText("npc", "elfo ranger con arco", [
      { role: "user", content: "aggiungi una cicatrice sul viso" },
    ]);
    assert.match(text, /elfo ranger con arco/i);
    assert.match(text, /cicatrice sul viso/i);
    assert.match(text, /full-body fantasy character/i);
  });
});
