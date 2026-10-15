import test from "node:test";
import assert from "node:assert/strict";
import { mergeCharacterInputFromSheet } from "../character-proposal-shared";
import type { CharacterGeneratedSheetPayload } from "../draft-assistant.types";

test("AI character proposal carries the entire generated sheet into create action input", () => {
  const characterSheet = {
    version: 1 as const,
    source: "generator" as const,
    abilities: { str: 8, dex: 16, con: 14, int: 12, wis: 10, cha: 18 },
    weaponRows: [{ name: "Arco", toHit: "+7", damage: "1d8+4", type: "perforante" }],
    inventory: ["Arco", "Frecce"],
    spells: [{ level: 1, name: "Scudo", summary: "Reazione", verbal: true, somatic: true }],
  };
  const payload: CharacterGeneratedSheetPayload = {
    pdfBase64: "JVBERi0x",
    fileName: "Hero.pdf",
    armorClass: 15,
    hitPoints: 24,
    build: {
      race_slug: "elf",
      subclass_slug: "high-elf",
      character_class: "Wizard",
      class_subclass: "Evocation",
      background_slug: "sage",
      level: "3",
    },
    characterName: "Hero",
    characterSheet,
  };
  const input = mergeCharacterInputFromSheet({}, "campaign-1", payload);
  assert.deepEqual(JSON.parse(String(input.generatedCharacterSheet)), characterSheet);
  assert.equal(input.generatedSheetPdfBase64, payload.pdfBase64);
});
