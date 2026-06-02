import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { buildQuickManualSections } from "@/lib/sheet-generator/quick-manual-builder";
import {
  buildDruidWildShapeStatBlocksManualBody,
  clearWildShapeBeastsCache,
  filterWildShapeBeastsForDruid,
  getPhbWildShapeBeasts,
  parseChallengeRating,
  wildShapeLimitsForLevel,
} from "@/lib/sheet-generator/druid-wild-shape";
import {
  clearPhbAppendixDStatBlocksCache,
  getPhbAppendixDBeasts,
  parsePhbAppendixDBeasts,
  parsePhbAppendixDStatBlocks,
  resolvePhbAppendixDStatBlock,
} from "@/lib/sheet-generator/phb-appendix-d-statblocks";
import { getPhbMarkdownText, preloadPhbMarkdown } from "@/lib/server/phb-spell-excerpt";

async function preloadPhb(): Promise<void> {
  await preloadPhbMarkdown(null);
  clearPhbAppendixDStatBlocksCache();
  clearWildShapeBeastsCache();
}

test("parseChallengeRating frazioni e interi", () => {
  assert.equal(parseChallengeRating("1/4"), 0.25);
  assert.equal(parseChallengeRating("1/2"), 0.5);
  assert.equal(parseChallengeRating("2"), 2);
});

test("appendice D: solo bestie tipo Bestia", async () => {
  await preloadPhb();
  const beasts = getPhbAppendixDBeasts();
  assert.ok(beasts.length >= 20);
  assert.ok(beasts.every((b) => b.statBlock.includes("Bestia")));
  assert.ok(!beasts.some((b) => /pseudodrago|quasit|scheletro/i.test(b.name)));
  assert.ok(beasts.some((b) => /lupo/i.test(b.name)));
});

test("druido L2: solo GS 1/4 senza nuoto/volo (Appendice D)", async () => {
  await preloadPhb();
  const limits = wildShapeLimitsForLevel(2, "Circolo della Terra");
  assert.ok(limits);
  assert.equal(limits.maxCr, 0.25);
  assert.equal(limits.noSwim, true);
  assert.equal(limits.noFly, true);

  const result = filterWildShapeBeastsForDruid(getPhbWildShapeBeasts(), 2, "Circolo della Terra");
  assert.ok(result && result.beasts.length > 5);
  assert.ok(result.beasts.every((b) => b.cr <= 0.25 && !b.hasSwim && !b.hasFly));
  assert.ok(result.beasts.some((b) => /lupo/i.test(b.name)));
  assert.ok(!result.beasts.some((b) => /aquila/i.test(b.name)));
  assert.ok(!result.beasts.some((b) => /coccodrillo/i.test(b.name)));
});

test("druido L5 terra: GS 1/2, no volo (Appendice D)", async () => {
  await preloadPhb();
  const result = filterWildShapeBeastsForDruid(
    getPhbWildShapeBeasts(),
    5,
    "Circolo della Terra"
  );
  assert.ok(result);
  assert.ok(result.beasts.some((b) => /coccodrillo/i.test(b.name)));
  assert.ok(!result.beasts.some((b) => /aquila gigante/i.test(b.name)));
  assert.ok(!result.beasts.some((b) => b.hasFly));
});

test("druido L8: GS 1 con volo e nuoto (Appendice D)", async () => {
  await preloadPhb();
  const result = filterWildShapeBeastsForDruid(
    getPhbWildShapeBeasts(),
    8,
    "Circolo della Terra"
  );
  assert.ok(result);
  assert.ok(result.beasts.some((b) => /aquila gigante/i.test(b.name)));
});

test("circolo della luna L6: include bestie GS fino a 2 presenti in appendice", async () => {
  await preloadPhb();
  const limits = wildShapeLimitsForLevel(6, "Circolo della Luna");
  assert.equal(limits?.maxCr, 2);
  const result = filterWildShapeBeastsForDruid(
    getPhbWildShapeBeasts(),
    6,
    "Circolo della Luna"
  );
  assert.ok(result?.beasts.some((b) => /orso bruno|lupo feroce|tigre/i.test(b.name)));
});

test("Selene Moonbrook L5: manuale rapido con forme bestiali Appendice D", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Selene Moonbrook",
    raceSlug: "elfo",
    subraceSlug: null,
    classLabel: "Druido",
    classSubclass: "Circolo della Terra",
    backgroundSlug: "eremita",
    level: 5,
    torneoMode: true,
  });
  assert.match(res.sheet.classFeaturesMd.toLowerCase(), /forma selvatica/);
  const sections = await buildQuickManualSections(res.sheet);
  const ws = sections.find((s) => s.title.includes("Forme bestiali"));
  assert.ok(ws, "sezione forme bestiali");
  assert.match(ws.body, /Appendice D/i);
  assert.match(ws.body, /lupo/i);
  assert.match(ws.body, /Classe Armatura|classe armatura/i);
  assert.match(ws.body, /Morso|morso/i);
  assert.ok(!/aquila gigante/i.test(ws.body));
  assert.ok(!/xanathar/i.test(ws.body));
});

test("appendice D: estrae stat block lupo", async () => {
  await preloadPhb();
  const phb = getPhbMarkdownText();
  assert.ok(phb.length > 1000);
  const blocks = parsePhbAppendixDStatBlocks(phb);
  assert.ok(blocks.has("lupo"));
  assert.ok(resolvePhbAppendixDStatBlock("Lupo"));
  const beasts = parsePhbAppendixDBeasts(phb);
  const lupo = beasts.find((b) => b.key === "lupo");
  assert.ok(lupo);
  assert.equal(lupo!.crLabel, "1/4");
  const statBody = await buildDruidWildShapeStatBlocksManualBody(5, "Circolo della Terra");
  assert.ok(statBody && statBody.length > 500);
  assert.match(statBody, /lupo/i);
  assert.match(statBody, /manuale base/i);
});
