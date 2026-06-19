import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  combineWikiEntityMemoryText,
  extractWikiEntityMemoryText,
  extractWikiGmNotes,
} from "../../campaign-wiki-ai-memory";

describe("extractWikiGmNotes", () => {
  it("reads gm_notes from attributes", () => {
    assert.equal(
      extractWikiGmNotes({ gm_notes: "  Generale anziano, cicatrice sul volto.  " }),
      "Generale anziano, cicatrice sul volto."
    );
  });
});

describe("extractWikiEntityMemoryText", () => {
  it("uses gm notes when public body is empty", () => {
    const text = extractWikiEntityMemoryText(
      { body: "" },
      { gm_notes: "Comanda le forze di Riavandriel dal quartier generale." }
    );
    assert.match(text, /Note GM \(canon\): Comanda le forze/);
  });

  it("combines public body and gm notes", () => {
    const text = combineWikiEntityMemoryText("Corpo pubblico breve.", "Dettaglio GM riservato.");
    assert.equal(text, "Corpo pubblico breve.\n\nNote GM (canon): Dettaglio GM riservato.");
  });
});
