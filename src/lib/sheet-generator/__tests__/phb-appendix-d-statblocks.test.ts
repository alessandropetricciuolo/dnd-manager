import test from "node:test";
import assert from "node:assert/strict";
import {
  formatAppendixDStatBlockForManual,
  getPhbAppendixDBeasts,
  parsePhbAppendixDStatBlocks,
  resolvePhbAppendixDStatBlock,
} from "@/lib/sheet-generator/phb-appendix-d-statblocks";
import { preloadPhbMarkdown } from "@/lib/server/phb-spell-excerpt";
import { getPhbMarkdownText } from "@/lib/server/phb-spell-excerpt";

test("parsePhbAppendixDStatBlocks include bestie wild shape comuni", async () => {
  await preloadPhbMarkdown(null);
  const blocks = parsePhbAppendixDStatBlocks(getPhbMarkdownText());
  assert.ok(blocks.size >= 25);
  for (const key of ["lupo", "aquila gigante", "coccodrillo", "pantera", "tigre"]) {
    assert.ok(blocks.has(key), `manca ${key}`);
  }
  const beasts = getPhbAppendixDBeasts();
  assert.ok(beasts.length >= 20);
  assert.ok(beasts.every((b) => /bestia/i.test(b.statBlock)));
});

test("formatAppendixDStatBlockForManual converte tabella abilità", async () => {
  await preloadPhbMarkdown(null);
  const raw = resolvePhbAppendixDStatBlock("Lupo");
  assert.ok(raw);
  const plain = formatAppendixDStatBlockForManual(raw!);
  assert.match(plain, /FOR 12/i);
  assert.match(plain, /Morso/i);
  assert.doesNotMatch(plain, /<table/i);
});
