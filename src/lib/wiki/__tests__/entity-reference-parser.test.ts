import test from "node:test";
import assert from "node:assert/strict";
import {
  collectNarrativeTexts,
  extractEntityReferencesFromText,
  mergeManualAndTextRelations,
} from "@/lib/wiki/entity-reference-parser";

const catalog = [
  { id: "a1", name: "Tharion", kind: "wiki" as const },
  { id: "a2", name: "Foresta di Neverwinter", kind: "wiki" as const },
  { id: "m1", name: "Mappa del Dungeon", kind: "map" as const },
];

test("wikilink [[Nome]]", () => {
  const refs = extractEntityReferencesFromText("Il guerriero [[Tharion]] vive qui.", catalog, "x");
  assert.equal(refs.length, 1);
  assert.equal(refs[0]!.targetId, "a1");
});

test("wikilink mappa", () => {
  const refs = extractEntityReferencesFromText("Vedi [[mappa:Mappa del Dungeon]].", catalog);
  assert.equal(refs[0]!.targetType, "map");
  assert.equal(refs[0]!.targetId, "m1");
});

test("menzione @ e nome in prosa", () => {
  const refs = extractEntityReferencesFromText(
    "@Tharion è arrivato nella Foresta di Neverwinter.",
    catalog,
    "self"
  );
  assert.ok(refs.some((r) => r.targetId === "a1"));
  assert.ok(refs.some((r) => r.targetId === "a2"));
});

test("merge manuali hanno priorità etichetta", () => {
  const merged = mergeManualAndTextRelations(
    [{ targetType: "wiki", targetId: "a1", label: "Alleato" }],
    [{ targetType: "wiki", targetId: "a1", label: "Menzionato nel testo" }]
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0]!.label, "Alleato");
});

test("collectNarrativeTexts ignora attributi riservati al GM", () => {
  const parts = collectNarrativeTexts("Testo pubblico", {
    summary: "Sommario pubblico",
    gm_notes: "Segreto su [[Tharion]]",
    relationships: "Rapporto segreto con Tharion",
  });

  assert.deepEqual(parts, ["Testo pubblico", "Sommario pubblico"]);
});
