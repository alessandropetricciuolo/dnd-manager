import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import {
  extractStatblockSlice,
  parseStatblocksFromBestiaryContent,
} from "@/lib/manuals/bestiary-statblock-parser";
import {
  chunkMonsterManualByCreatureIndex,
  chunkMordenkainenMultiverseByCreatureIndex,
} from "@/lib/manuals/monster-manual-chunks";

test("estrae statblock multipli da sezioni raggruppate (Angelo → Deva, Planetar, …)", () => {
  const mm = readFileSync("public/manuals/manuale mostri.md", "utf8");
  const angelChunks = chunkMonsterManualByCreatureIndex(mm).filter((c) =>
    c.sectionHeading.toLowerCase().includes("angelo")
  );
  assert.ok(angelChunks.length >= 1);

  const combined = angelChunks.map((c) => c.content).join("\n\n");
  const parsed = parseStatblocksFromBestiaryContent(combined);
  const names = parsed.map((p) => p.name.toLowerCase());
  assert.ok(names.includes("deva"));
  assert.ok(names.includes("planetar"));
  assert.ok(parsed.length >= 3);
});

test("estrae statblock MPM con heading ### (Abishai bianco)", () => {
  const mpm = readFileSync("public/manuals/Mostri del multiverso.md", "utf8");
  const abishaiChunk = chunkMordenkainenMultiverseByCreatureIndex(mpm).find((c) =>
    c.sectionHeading.toLowerCase().includes("abishai")
  );
  assert.ok(abishaiChunk);

  const parsed = parseStatblocksFromBestiaryContent(abishaiChunk!.content);
  assert.ok(parsed.some((p) => p.name.toLowerCase().includes("abishai bianco")));
});

test("ritaglia un singolo statblock dal blocco combinato", () => {
  const mm = readFileSync("public/manuals/manuale mostri.md", "utf8");
  const angelChunks = chunkMonsterManualByCreatureIndex(mm).filter((c) =>
    c.sectionHeading.toLowerCase().includes("angelo")
  );
  assert.ok(angelChunks.length >= 1);

  const combined = angelChunks.map((c) => c.content).join("\n\n");
  const slice = extractStatblockSlice(combined, "Deva");
  assert.ok(slice);
  assert.match(slice!, /\*\*Sfida\*\*/i);
  assert.doesNotMatch(slice!, /# PLANETAR/i);
});

test("copre la maggior parte degli statblock del Manuale dei Mostri", () => {
  const mm = readFileSync("public/manuals/manuale mostri.md", "utf8");
  const chunks = chunkMonsterManualByCreatureIndex(mm);
  const combined = chunks
    .filter((c) => !c.sectionHeading.toLowerCase().includes("parte iniziale"))
    .map((c) => c.content)
    .join("\n\n");
  const parsed = parseStatblocksFromBestiaryContent(combined);
  assert.ok(parsed.length > 300);
});
