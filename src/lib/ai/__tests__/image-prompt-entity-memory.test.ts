import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compressBodyToReferenceSnippet,
  formatEntityReferenceLine,
  textMentionsEntityName,
} from "../image-prompt-entity-memory";

describe("textMentionsEntityName", () => {
  it("matches case-insensitive whole token", () => {
    assert.equal(
      textMentionsEntityName("barbiere di portico con barberia di lusso", "Portico"),
      true
    );
  });

  it("does not match substring inside another word", () => {
    assert.equal(textMentionsEntityName("transportico veloce", "Portico"), false);
  });

  it("matches multi-word entity names", () => {
    assert.equal(
      textMentionsEntityName("lavora alla Locanda del Gallo", "Locanda del Gallo"),
      true
    );
  });
});

describe("reference formatting", () => {
  it("formats setting reference line", () => {
    assert.equal(
      formatEntityReferenceLine("Portico", "città portuale medievale."),
      "Setting reference — Portico: città portuale medievale."
    );
  });

  it("compresses markdown body to first sentence", () => {
    const body = "## Portico\n\n**Città portuale** affacciata sul mare. Secondo paragrafo lungo.";
    assert.equal(
      compressBodyToReferenceSnippet(body, 120),
      "Portico Città portuale affacciata sul mare."
    );
  });
});
