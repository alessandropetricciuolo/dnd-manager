import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeRaceTraitsMarkdown,
  stripTrailingPhbRaceChapterFooterAfterLinguaggi,
} from "@/lib/race-traits-sanitizer";

test("strip teaser tiefling dopo tratti mezzorco (footer CAPITOLO)", () => {
  const md = [
    "## TRATTI DEI MEZZORCHI",
    "",
    "**Linguaggi.** Un mezzorco può parlare in Orchesco.",
    "",
    "CAPITOLO 2 | RAZZE",
    "41",
    "",
    '> *Citazione Erin M. Evans*',
    "",
    "Essere oggetto di sguardi ostili … tiefling.",
    "",
    "# TIEFLING",
  ].join("\n");

  const out = stripTrailingPhbRaceChapterFooterAfterLinguaggi(md);
  assert.ok(out.includes("Orchesco"));
  assert.ok(!out.includes("tiefling"));
  assert.ok(!out.includes("Citazione Erin"));
});

test("non taglia dopo Linguaggi se segue Sottorazze (elfo)", () => {
  const md = [
    "**Linguaggi.** Elfico.",
    "",
    "***Sottorazze.*** Altro.",
    "",
    "### ELFO ALTO",
  ].join("\n");

  const out = stripTrailingPhbRaceChapterFooterAfterLinguaggi(md);
  assert.equal(out, md.replace(/\r/g, ""));
});

test("sanitizeRaceTraitsMarkdown applica strip footer per qualsiasi slug", () => {
  const md =
    "**Linguaggi.** Fine.\n\nCAPITOLO 2 | RAZZE\n44\n\nParagrafo teaser razza dopo.";
  const out = sanitizeRaceTraitsMarkdown("mezzorco", md);
  assert.ok(out.endsWith("Fine."));
  assert.ok(!out.includes("teaser"));
});
