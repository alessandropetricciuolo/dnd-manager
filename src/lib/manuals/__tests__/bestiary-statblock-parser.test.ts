import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import {
  extractStatblockSlice,
  findBestChunkIdForStatblock,
  parseStatblocksFromBestiaryContent,
  resolveStatblockFromRowContents,
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

test("Appendice A: Sciame di topi non usa il chunk di Albero risvegliato", () => {
  const mm = readFileSync("public/manuals/manuale mostri.md", "utf8");
  const appendixChunks = chunkMonsterManualByCreatureIndex(mm).filter((c) =>
    c.sectionHeading.toLowerCase().includes("appendice a")
  );
  assert.ok(appendixChunks.length >= 2, "appendice A è divisa in più chunk");

  const combined = appendixChunks.map((c) => c.content).join("\n\n");
  const parsed = parseStatblocksFromBestiaryContent(combined);
  assert.ok(parsed.some((p) => p.name.toLowerCase().includes("sciame di topi")));

  const firstChunkId = "mock-first";
  const rows = appendixChunks.map((c, i) => ({
    id: i === 0 ? firstChunkId : `part-${i}`,
    content: c.content,
  }));

  const ownerId = findBestChunkIdForStatblock(rows, "Sciame di topi");
  assert.notEqual(ownerId, firstChunkId, "Sciame di topi non deve puntare al primo chunk");

  const slice = resolveStatblockFromRowContents(rows, "Sciame di topi");
  assert.ok(slice);
  assert.match(slice!, /sciame di topi/i);
  assert.doesNotMatch(slice!, /albero risvegliato/i);
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
