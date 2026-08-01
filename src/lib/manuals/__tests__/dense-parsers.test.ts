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
  assert.ok(sb.spellcasting.some((s) => /Incantesimi Innati/i.test(s.name)));
  assert.ok(sb.spellcasting.some((s) => /individuazione del bene/i.test(s.body)));
  assert.ok(!sb.traits.some((t) => /Incantesimi/i.test(t.name)));
  assert.ok(sb.parseConfidence !== "low");
});

test("parseDenseStatblock: Drago Rosso Antico (**Nome.** format)", () => {
  const mm = readFileSync(join(process.cwd(), "public/manuals/manuale mostri.md"), "utf8");
  const slice = extractStatblockSlice(mm, "DRAGO ROSSO ANTICO");
  assert.ok(slice, "slice Drago Rosso Antico");
  assert.match(slice!, /### AZIONI/);
  assert.match(slice!, /\*\*Multiattacco\.\*\*/);

  const sb = parseDenseStatblock(slice!, { sourceLabel: "Manuale dei Mostri" });
  assert.match(sb.name, /DRAGO ROSSO ANTICO/i);
  assert.equal(sb.cr, "24");
  assert.ok(sb.traits.some((t) => /Resistenza Leggendaria/i.test(t.name)));
  assert.equal(sb.spellcasting.length, 0);
  assert.ok(sb.actions.some((a) => /Multiattacco/i.test(a.name)));
  assert.ok(sb.actions.some((a) => /Soffio di Fuoco/i.test(a.name)));
  assert.ok(sb.legendaryActions.some((a) => /Attacco di Ali/i.test(a.name)));
  assert.ok(sb.actions.length >= 5);
  assert.equal(sb.parseConfidence, "high");
});

test("parseDenseStatblock: Drow Mago ha sezione Incantesimi dedicata", () => {
  const mm = readFileSync(join(process.cwd(), "public/manuals/manuale mostri.md"), "utf8");
  const slice = extractStatblockSlice(mm, "DROW MAGO");
  assert.ok(slice, "slice Drow Mago");
  const sb = parseDenseStatblock(slice!, { sourceLabel: "Manuale dei Mostri" });
  assert.ok(sb.spellcasting.length >= 2);
  assert.ok(sb.spellcasting.some((s) => /^Incantesimi Innati/i.test(s.name)));
  assert.ok(sb.spellcasting.some((s) => /^Incantesimi$/i.test(s.name)));
  assert.ok(sb.spellcasting.some((s) => /dardo incantato|nube mortale/i.test(s.body)));
  assert.ok(!sb.traits.some((t) => /Incantesimi/i.test(t.name)));
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
