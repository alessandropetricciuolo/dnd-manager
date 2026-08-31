import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { parseStatblocksFromBestiaryContent } from "@/lib/manuals/bestiary-statblock-parser";
import { chunkMonsterManualByCreatureIndex } from "@/lib/manuals/monster-manual-chunks";

/**
 * Smoke test della logica di espansione statblock (allineata a rowToBestiaryHits):
 * chunk multi-creatura deve produrre ID compositi distinti per ogni mostro.
 */
test("chunk Angelo produce statblock distinti con ID compositi simulati", () => {
  const mm = readFileSync("public/manuals/manuale mostri.md", "utf8");
  const angelChunks = chunkMonsterManualByCreatureIndex(mm).filter((c) =>
    c.sectionHeading.toLowerCase().includes("angelo")
  );
  assert.ok(angelChunks.length >= 1);

  const combined = angelChunks.map((c) => c.content).join("\n\n");
  const parsed = parseStatblocksFromBestiaryContent(combined);
  assert.ok(parsed.length >= 3);

  const chunkId = "test-chunk-123";
  const LIST_ID_SEP = "::";
  const ids = parsed.map((sb) => {
    const encoded = encodeURIComponent(
      sb.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
    );
    return `${chunkId}${LIST_ID_SEP}${encoded}`;
  });

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.some((id) => id.includes("deva")));
  assert.ok(ids.some((id) => id.includes("planetar")));
});
