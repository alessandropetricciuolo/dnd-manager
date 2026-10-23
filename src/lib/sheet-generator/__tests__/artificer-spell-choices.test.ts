import test from "node:test";
import assert from "node:assert/strict";
import { resolveBuildChoicesPreview } from "@/lib/sheet-generator/build-choices";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { loadClassSpellPool } from "@/lib/sheet-generator/rules-resolver";
import type { CharacterGeneratorInput } from "@/lib/sheet-generator/types";

const input: CharacterGeneratorInput = {
  characterName: "Test Artefice", raceSlug: "gnomo", subraceSlug: "gnomo_rocce",
  classLabel: "Artefice", classSubclass: null, backgroundSlug: "sapiente", level: 1,
  alignment: null, age: null, height: null, weight: null, sex: null,
};

test("Artefice: opzioni selezionabili dal livello 1 e scelte conservate nella scheda", async () => {
  const preview = await resolveBuildChoicesPreview(input);
  const cantrips = preview.slots.filter((s) => s.id.startsWith("cantrip-"));
  const spells = preview.slots.filter((s) => s.id.startsWith("spell-"));
  assert.equal(cantrips.length, 2);
  assert.ok(spells.length > 0);
  for (const slot of cantrips) {
    assert.ok(slot.options.some((o) => o.value === "Dardo di Fuoco"));
    assert.ok(!slot.options.some((o) => o.value === "Cura Ferite"));
  }
  for (const slot of spells) {
    assert.ok(slot.options.some((o) => o.value === "Cura Ferite"));
    assert.ok(!slot.options.some((o) => o.value === "Aiuto"));
  }
  const result = await buildGeneratedCharacterSheet({
    ...input,
    buildOverrides: { cantrips: ["Dardo di Fuoco", "Guida"], spells: ["Cura Ferite"] },
  });
  assert.ok(result.sheet.spells.some((s) => s.name === "Dardo di Fuoco" && s.level === 0));
  assert.ok(result.sheet.spells.some((s) => s.name === "Cura Ferite" && s.level === 1));
});

test("Artefice: lista separata correttamente per tutti i livelli di incantesimo", async () => {
  const { entries } = await loadClassSpellPool({ ...input, tcWizard: false }, 5);
  for (const [name, level] of [
    ["Guida", 0], ["Cura Ferite", 1], ["Aiuto", 2], ["Dissolvi Magie", 3],
    ["Sfera Elastica di Otiluke", 4], ["Muro di Pietra", 5],
  ] as const) {
    assert.ok(entries.some((s) => s.name === name && s.level === level), `${name}: livello ${level}`);
  }
  assert.ok(entries.every((s) => !/[|*]/.test(s.name)));
});
