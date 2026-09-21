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

test("parseDenseStatblock: impagina la tabella verticale degli homebrew", () => {
  const sb = parseDenseStatblock(`# Custode del Varco

## Stat Block

| Statistica | Valore |
| --- | --- |
| CA | 16 |
| PF | 85 (10d10 + 30) |
| Velocità | 9 m |
| FOR | 18 (+4) |
| DES | 12 (+1) |
| COS | 16 (+3) |
| INT | 8 (-1) |
| SAG | 14 (+2) |
| CAR | 10 (+0) |
| CR | 5 |
| PE | 1.800 |

## Azioni

**Artiglio.** Attacco con arma da mischia: +7 a colpire.`);

  assert.equal(sb.ac, "16");
  assert.equal(sb.hp, "85 (10d10 + 30)");
  assert.equal(sb.speed, "9 m");
  assert.equal(sb.cr, "5");
  assert.equal(sb.xp, "1.800");
  assert.equal(sb.abilities.FOR?.score, 18);
  assert.equal(sb.abilities.CAR?.mod, "+0");
  assert.ok(sb.actions.some((action) => action.name === "Artiglio"));
  assert.equal(sb.parseConfidence, "high");
});

test("parseDenseStatblock: impagina la tabella orizzontale degli homebrew", () => {
  const sb = parseDenseStatblock(`# Predatore Cinereo

## Stat Block

| CA | PF | Velocità | FOR | DES | COS | INT | SAG | CAR | CR | PE |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 | 68 (8d10 + 24) | 12 m | 17 (+3) | 14 (+2) | 16 (+3) | 7 (-2) | 12 (+1) | 8 (-1) | 4 | 1.100 |`);

  assert.equal(sb.ac, "15");
  assert.equal(sb.hp, "68 (8d10 + 24)");
  assert.equal(sb.speed, "12 m");
  assert.equal(sb.cr, "4");
  assert.equal(sb.xp, "1.100");
  assert.equal(sb.abilities.DES?.score, 14);
  assert.equal(sb.abilities.INT?.mod, "-2");
  assert.equal(sb.parseConfidence, "medium");
});

test("parseDenseStatblock: usa combat_stats per uno statblock homebrew non strutturato", () => {
  const sb = parseDenseStatblock("# Segugio delle Maree\n\nCreatura anfibia in agguato.", {
    fallbackStats: {
      ac: "14",
      hp: "45",
      cr: "2",
      xp: 450,
      attacks: "Morso +5, 1d8+3 perforanti.",
    },
  });

  assert.equal(sb.ac, "14");
  assert.equal(sb.hp, "45");
  assert.equal(sb.cr, "2");
  assert.equal(sb.xp, "450");
  assert.deepEqual(sb.actions, [{ name: "Attacchi", body: "Morso +5, 1d8+3 perforanti." }]);
  assert.notEqual(sb.parseConfidence, "low");
  assert.equal(sb.leftoverMarkdown, "");
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
