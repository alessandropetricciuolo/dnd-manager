import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { buildQuickManualSections } from "@/lib/sheet-generator/quick-manual-builder";
import {
  buildPhbWarlockPactManualBlock,
  buildWarlockInvocationsManualBody,
  buildWarlockPactManualBody,
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

test("patto warlock: blocco PHB integrale con intro e doni del patrono", async () => {
  await preloadPhbMarkdown();
  const block = buildPhbWarlockPactManualBlock("Patto della Lama");
  assert.ok(block.length > 500);
  assert.match(block, /3°\s+livello/i);
  assert.match(block, /arma del patto/i);
  assert.match(block, /I DONI DEL PATTO|doni del patto/i);
  assert.doesNotMatch(block, /####\s+PATTO DELLA CATENA/i);
  assert.doesNotMatch(block, /trova famiglio/i);
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

  const pactManual = buildWarlockPactManualBody(sheet.classFeaturesMd);
  assert.ok(pactManual && pactManual.length > 400);
  assert.doesNotMatch(pactManual!, /^Scelta:/m);
  assert.match(pactManual!, /3°\s+livello/i);

  const sections = await buildQuickManualSections(sheet);
  const pactSection = sections.find((s) => /dono del patto/i.test(s.title));
  const invSection = sections.find((s) => /suppliche occulte/i.test(s.title));
  assert.ok(pactSection, "sezione patto nel manuale rapido");
  assert.ok(invSection, "sezione suppliche nel manuale rapido");
  assert.ok(pactSection!.body.length >= pactManual!.length * 0.85);
  assert.ok(invSection!.body.length > 200, "testo non riassunto");
  assert.doesNotMatch(invSection!.body, /^Scelte:/m);

  const classSection = sections.find((s) => /Privilegi di classe/i.test(s.title));
  assert.ok(classSection);
  assert.doesNotMatch(classSection!.body, /Dono del Patto[\s\S]*Scelta:/i);
});
