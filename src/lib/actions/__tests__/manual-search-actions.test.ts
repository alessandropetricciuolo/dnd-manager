import assert from "node:assert/strict";
import test from "node:test";
import { __manualSearchInternals } from "@/lib/actions/manual-search-actions";

const SAMPLE_MD = `
# DARDO INCANTATO
*Invocazione di 1° livello*
**Tempo di Lancio:** 1 azione
**Gittata:** 36 metri

# PALLA DI FUOCO
*Invocazione di 3° livello*
**Tempo di Lancio:** 1 azione
**Gittata:** 45 metri

# PALLA DI FUOCO RITARDATA
*Invocazione di 7° livello*
**Tempo di Lancio:** 1 azione
**Gittata:** 45 metri

# ISPIRAZIONE BARDICA
Un bardo può ispirare...
`;

test("normalize heading strips accents and punctuation", () => {
  const n = __manualSearchInternals.normalizeHeadingForExactMatch("Palla di fuoco (rituale)");
  assert.equal(n, "PALLA DI FUOCO");
});

test("build spell index keeps only spell-like entries", () => {
  const idx = __manualSearchInternals.buildSpellNameIndexFromMarkdown(SAMPLE_MD);
  assert.equal(idx.has("PALLA DI FUOCO"), true);
  assert.equal(idx.has("PALLA DI FUOCO RITARDATA"), true);
  assert.equal(idx.has("ISPIRAZIONE BARDICA"), false);
});

test("extract exact spell entry avoids delayed-fireball collision", () => {
  const entry = __manualSearchInternals.extractSpellEntryFromMarkdown(SAMPLE_MD, "palla di fuoco");
  assert.match(entry, /^# PALLA DI FUOCO$/m);
  assert.doesNotMatch(entry, /RITARDATA/);
});
