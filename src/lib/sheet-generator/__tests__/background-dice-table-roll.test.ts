import test from "node:test";
import assert from "node:assert/strict";
import { collapseRandomDiceTablesInBackgroundMarkdown } from "@/lib/sheet-generator/background-dice-table-roll";

const CRIMINAL_SPEC_TABLE = [
  "| d8 | Specializzazione | d8 | Specializzazione |",
  "| --- | --- | --- | --- |",
  "| 1 | Assassino | 5 | Picchiatore |",
  "| 2 | Borseggiatore | 6 | Ricattatore |",
  "| 3 | Brigante | 7 | Ricettatore |",
  "| 4 | Contrabbandiere | 8 | Scassinatore |",
].join("\n");

test("tabella d8 criminalità → una sola riga con esito e valore del tiro", () => {
  const alwaysLow = () => 0;
  const out = collapseRandomDiceTablesInBackgroundMarkdown(CRIMINAL_SPEC_TABLE, alwaysLow);
  assert.match(out, /\*\*Esito \(d8: 1\):\*\* Assassino/);
  assert.ok(!out.includes("| d8 |"));
});

test("tiro alto → risultato 8 su tabella criminalità", () => {
  const almostOne = () => 1 - Number.EPSILON;
  const out = collapseRandomDiceTablesInBackgroundMarkdown(CRIMINAL_SPEC_TABLE, almostOne);
  assert.match(out, /\*\*Esito \(d8: 8\):\*\* Scassinatore/);
});

test("tabella senza header dN non viene modificata", () => {
  const md = [
    "| Colonna A | Colonna B |",
    "| --- | --- |",
    "| 1 | Foo |",
  ].join("\n");
  const out = collapseRandomDiceTablesInBackgroundMarkdown(md, () => 0);
  assert.equal(out, md);
});

test("testo prima e dopo la tabella viene preservato", () => {
  const md = `Intro\n\n${CRIMINAL_SPEC_TABLE}\n\nFine`;
  const out = collapseRandomDiceTablesInBackgroundMarkdown(md, () => 0);
  assert.ok(out.startsWith("Intro"));
  assert.ok(out.endsWith("Fine"));
});
