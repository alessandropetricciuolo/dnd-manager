import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { cantripsKnownForClass } from "@/lib/sheet-generator/spell-slots";

test("bardo L5 torneo: tre trucchetti in scheda", async () => {
  const expected = cantripsKnownForClass("Bardo", 5);
  assert.equal(expected, 3);

  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: "Pippa Fairsong",
    raceSlug: "halfling",
    subraceSlug: null,
    classLabel: "Bardo",
    classSubclass: null,
    backgroundSlug: "artista",
    level: 5,
    torneoMode: true,
    powerPlayer: true,
  });

  const cantrips = sheet.spells.filter((s) => s.level === 0);
  assert.equal(sheet.cantripsKnown, 3);
  assert.equal(cantrips.length, 3);
  assert.ok(!sheet.spells.some((s) => /scassinare/i.test(s.name)));
});
