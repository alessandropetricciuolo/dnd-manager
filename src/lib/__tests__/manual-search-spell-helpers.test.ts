import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildSpellNameIndexFromMarkdown,
  extractSpellEntryFromMarkdown,
  hasMarkdownSpellStatBlock,
  resolveSpellNameFromIndex,
  suggestSpellNamesFromIndex,
} from "@/lib/manual-search-spell-helpers";

test("resolveSpellNameFromIndex: esatto, varianti e fuzzy IT", () => {
  const md = readFileSync(join(process.cwd(), "public/manuals/manuale_giocatore.md"), "utf8");
  const index = buildSpellNameIndexFromMarkdown(md);
  assert.ok(index.size > 300);

  assert.equal(resolveSpellNameFromIndex("palla di fuoco", index), "PALLA DI FUOCO");
  assert.equal(resolveSpellNameFromIndex("PALLA DI FUOCO", index), "PALLA DI FUOCO");
  assert.equal(resolveSpellNameFromIndex("cura ferite", index), "CURA FERITE");
  assert.equal(resolveSpellNameFromIndex("cure ferite", index), "CURA FERITE");
  assert.equal(resolveSpellNameFromIndex("volare", index), "VOLARE");
  assert.equal(resolveSpellNameFromIndex("volo", index), "VOLARE");

  const fireball = extractSpellEntryFromMarkdown(md, "PALLA DI FUOCO");
  assert.ok(hasMarkdownSpellStatBlock(fireball));
  assert.match(fireball, /8d6/);

  const suggestions = suggestSpellNamesFromIndex("palla di fuoco", index);
  assert.ok(suggestions.includes("PALLA DI FUOCO"));
  assert.ok(suggestions.some((s) => /RITARDATA/i.test(s)));
});
