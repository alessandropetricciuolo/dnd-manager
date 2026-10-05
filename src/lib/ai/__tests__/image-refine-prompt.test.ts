import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildImageRefineInstructionText, getImageRefineAspectRatio } from "../image-refine-prompt";

describe("buildImageRefineInstructionText", () => {
  it("includes base description and latest user edit", () => {
    const text = buildImageRefineInstructionText("npc", "elfo ranger con arco", [
      { role: "user", content: "aggiungi una cicatrice sul viso" },
    ]);
    assert.match(text, /elfo ranger con arco/i);
    assert.match(text, /cicatrice sul viso/i);
    assert.match(text, /preserve reference framing/i);
    assert.doesNotMatch(text, /full-body fantasy character/i);
  });

  it("prioritizes a standing full-body edit over a seated original brief", () => {
    const turns = [{ role: "user" as const, content: "stessa persona in piedi a figura intera" }];
    const text = buildImageRefineInstructionText("npc", "bardo seduto al tavolo", turns, true);
    assert.match(text, /immagine 1 = originale/);
    assert.match(text, /full-body fantasy character illustration, entire figure visible standing/);
    assert.doesNotMatch(text, /including seated pose/);
    assert.match(text, /testa, capelli, gambe e piedi interamente visibili/);
    assert.match(text, /cassa bombata/);
    assert.match(text, /proporzioni del volto/);
    assert.equal(getImageRefineAspectRatio("npc", turns), "3:4");
  });

  it("retains full-body format across later edits and allows reframing", () => {
    const turns = [{ role: "user" as const, content: "a figura intera" }, { role: "user" as const, content: "luce più calda" }];
    assert.equal(getImageRefineAspectRatio("npc", turns), "3:4");
    assert.equal(getImageRefineAspectRatio("npc", [...turns, { role: "user", content: "ora primo piano" }]), "1:1");
    assert.equal(getImageRefineAspectRatio("location", turns), "16:9");
  });
});
