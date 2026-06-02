import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { buildQuickManualSections } from "@/lib/sheet-generator/quick-manual-builder";
import {
  clearWildShapeBeastsCache,
  filterWildShapeBeastsForDruid,
  getXanatharWildShapeBeasts,
  parseChallengeRating,
  wildShapeLimitsForLevel,
} from "@/lib/sheet-generator/druid-wild-shape";
import { preloadManualMarkdownFile } from "@/lib/server/phb-spell-excerpt";

test("parseChallengeRating frazioni e interi", () => {
  assert.equal(parseChallengeRating("1/4"), 0.25);
  assert.equal(parseChallengeRating("1/2"), 0.5);
  assert.equal(parseChallengeRating("2"), 2);
});

test("druido L2: solo GS 1/4 senza nuoto/volo", async () => {
  await preloadManualMarkdownFile("xanathar.md", null);
  clearWildShapeBeastsCache();
  const limits = wildShapeLimitsForLevel(2, "Circolo della Terra");
  assert.ok(limits);
  assert.equal(limits.maxCr, 0.25);
  assert.equal(limits.noSwim, true);
  assert.equal(limits.noFly, true);

  const result = filterWildShapeBeastsForDruid(getXanatharWildShapeBeasts(), 2, "Circolo della Terra");
  assert.ok(result && result.beasts.length > 10);
  assert.ok(result.beasts.every((b) => b.cr <= 0.25 && !b.hasSwim && !b.hasFly));
  assert.ok(result.beasts.some((b) => /lupo/i.test(b.name)));
  assert.ok(!result.beasts.some((b) => /aquila/i.test(b.name)));
});

test("druido L5 terra: GS 1/2, no volo", async () => {
  await preloadManualMarkdownFile("xanathar.md", null);
  clearWildShapeBeastsCache();
  const result = filterWildShapeBeastsForDruid(
    getXanatharWildShapeBeasts(),
    5,
    "Circolo della Terra"
  );
  assert.ok(result);
  assert.ok(result.beasts.some((b) => /coccodrillo/i.test(b.name)));
  assert.ok(!result.beasts.some((b) => /aquila gigante/i.test(b.name)));
  assert.ok(!result.beasts.some((b) => b.hasFly));
});

test("druido L8: GS 1 con volo e nuoto", async () => {
  await preloadManualMarkdownFile("xanathar.md", null);
  clearWildShapeBeastsCache();
  const result = filterWildShapeBeastsForDruid(
    getXanatharWildShapeBeasts(),
    8,
    "Circolo della Terra"
  );
  assert.ok(result);
  assert.ok(result.beasts.some((b) => /aquila gigante/i.test(b.name)));
});

test("circolo della luna L6: GS fino a 2", async () => {
  await preloadManualMarkdownFile("xanathar.md", null);
  clearWildShapeBeastsCache();
  const limits = wildShapeLimitsForLevel(6, "Circolo della Luna");
  assert.equal(limits?.maxCr, 2);
  const result = filterWildShapeBeastsForDruid(
    getXanatharWildShapeBeasts(),
    6,
    "Circolo della Luna"
  );
  assert.ok(result?.beasts.some((b) => /orso polare/i.test(b.name)));
});

test("Selene Moonbrook L5: manuale rapido con forme bestiali", async () => {
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
  assert.match(ws.body, /GS 1\/4/);
  assert.match(ws.body, /lupo/i);
  assert.ok(!/aquila gigante/i.test(ws.body));
});
