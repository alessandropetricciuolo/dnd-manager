import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compressBodyToReferenceSnippet,
  compactNameMatchesHaystack,
  entityNameMatchVariants,
  entityNameMatchesHaystack,
  formatEntityReferenceLine,
  shouldSuppressParentPlaceMemoryReference,
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

describe("entityNameMatchesHaystack", () => {
  it("matches partial distinctive word from entity name", () => {
    assert.equal(
      entityNameMatchesHaystack(
        "capitale del regno di Druven",
        "Regno di Druven"
      ),
      true
    );
  });

  it("matches full NPC name in longer sentence", () => {
    assert.equal(
      entityNameMatchesHaystack(
        "il generale in capo delle forze di Riavandriel, si trova nella città di Rocca Ferrea",
        "Riavandriel"
      ),
      true
    );
  });

  it("matches compact place names without spaces (Roccaferrea)", () => {
    assert.equal(
      compactNameMatchesHaystack(
        "si trova nella città di rocca ferrea capitale di druven",
        "Roccaferrea"
      ),
      true
    );
  });

  it("expands Riavandriel/Rianvadriel spelling variants", () => {
    assert.deepEqual(entityNameMatchVariants("Riavandriel"), ["Riavandriel", "Rianvadriel"]);
    assert.equal(
      entityNameMatchesHaystack("generale dell'esercito di Rianvadriel Oropher", "Riavandriel"),
      true
    );
  });
});

describe("shouldSuppressParentPlaceMemoryReference", () => {
  const haystack = "bottega del macellaio di portico";

  it("suppresses parent city Portico when depicting a shop", () => {
    assert.equal(
      shouldSuppressParentPlaceMemoryReference(
        haystack,
        "Portico",
        "Grande città portuale con molo e indagini."
      ),
      true
    );
  });

  it("suppresses Portale di Portico landmark via partial portico match", () => {
    assert.equal(
      shouldSuppressParentPlaceMemoryReference(
        haystack,
        "Portale di Portico",
        "Antico arco d'ingresso alla città."
      ),
      true
    );
  });

  it("keeps entity whose name is the venue itself", () => {
    assert.equal(
      shouldSuppressParentPlaceMemoryReference(
        haystack,
        "Locanda del Gallo di Portico",
        "Taverna famosa nel quartiere del porto."
      ),
      false
    );
  });

  it("does not suppress when haystack lacks venue subject", () => {
    assert.equal(
      shouldSuppressParentPlaceMemoryReference(
        "vista panoramica di portico dal mare",
        "Portico",
        "Città portuale."
      ),
      false
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
