import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDenseStatblock } from "@/lib/manuals/dense-statblock-parser";
import { parseDenseRulesDoc } from "@/lib/manuals/dense-rules-parser";
import { extractStatblockSlice } from "@/lib/manuals/bestiary-statblock-parser";

test("parseDenseStatblock: Deva from MM markdown", () => {
  const mm = readFileSync(join(process.cwd(), "public/manuals/manuale mostri.md"), "utf8");
  const slice = extractStatblockSlice(mm, "DEVA");
  assert.ok(slice, "slice Deva");
  const sb = parseDenseStatblock(slice!, { sourceLabel: "Manuale dei Mostri" });
  assert.equal(sb.name.toUpperCase(), "DEVA");
  assert.ok(sb.typeLine?.toLowerCase().includes("celestiale"));
  assert.ok(sb.ac?.startsWith("17"));
  assert.ok(sb.hp?.includes("136"));
  assert.equal(sb.cr, "10");
  assert.ok(sb.abilities.FOR?.score === 18);
  assert.ok(sb.abilities.SAG?.save === "+9" || sb.savesLine?.includes("Sag"));
  assert.ok(sb.actions.some((a) => /mazza/i.test(a.name)));
  assert.ok(sb.parseConfidence !== "low");
});

test("parseDenseRulesDoc: Spese sections", () => {
  const phb = readFileSync(join(process.cwd(), "public/manuals/manuale_giocatore.md"), "utf8");
  const start = phb.indexOf("# SPESE\n");
  assert.ok(start >= 0);
  const chunk = phb.slice(start, start + 2500);
  const doc = parseDenseRulesDoc(chunk, { sourceLabel: "PHB" });
  assert.ok(doc.sections.length >= 2);
  assert.match(doc.sections[0]!.title, /SPESE/i);
  assert.ok(doc.sections.some((s) => /STILE DI VITA/i.test(s.title)));
});
