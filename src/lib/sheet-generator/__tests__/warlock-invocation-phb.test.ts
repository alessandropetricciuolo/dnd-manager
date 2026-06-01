import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { buildQuickManualSections } from "@/lib/sheet-generator/quick-manual-builder";
import {
  buildWarlockInvocationsManualBody,
  extractWarlockInvocationMarkdown,
} from "@/lib/sheet-generator/warlock-invocation-phb";
import { preloadPhbMarkdown } from "@/lib/server/phb-spell-excerpt";

test("estrazione supplica: testo PHB integrale Armatura delle Ombre", async () => {
  await preloadPhbMarkdown();
  const md = extractWarlockInvocationMarkdown("Armatura delle Ombre");
  assert.ok(md.length > 80, "blocco manuale non vuoto");
  assert.match(md, /armatura magica/i);
  assert.doesNotMatch(md, /\[… testo troncato/i);
});

test("warlock torneo: manuale rapido con suppliche testo integrale", async () => {
  await preloadPhbMarkdown();
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: "Nix Bronzefumo",
    raceSlug: "nano",
    subraceSlug: null,
    classLabel: "Warlock",
    classSubclass: "Il Grande Antico",
    backgroundSlug: "ciarlatano",
    level: 5,
    torneoMode: true,
    powerPlayer: true,
  });

  const manualBody = buildWarlockInvocationsManualBody(sheet.classFeaturesMd);
  assert.ok(manualBody, "corpo suppliche generato");
  assert.match(manualBody!, /armatura magica|deflagrazione occulta|vista del diavolo/i);

  const sections = await buildQuickManualSections(sheet);
  const invSection = sections.find((s) => /suppliche occulte/i.test(s.title));
  assert.ok(invSection, "sezione suppliche nel manuale rapido");
  assert.ok(invSection!.body.length > 200, "testo non riassunto");
  assert.doesNotMatch(invSection!.body, /^Scelte:/m);
});
