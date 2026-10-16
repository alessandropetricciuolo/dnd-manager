import test from "node:test";
import assert from "node:assert/strict";
import { extractStructuredPcSaves } from "../stats-helper";

test("TS: un modificatore di caratteristica non è promosso a tiro salvezza verificato", () => {
  const result = extractStructuredPcSaves({
    character_sheet: {
      abilityMods: { str: 1, dex: 2, con: 3, int: 4, wis: 0, cha: -1 },
    },
  }, "mago", 5);

  assert.equal(result.source, "estimated");
  assert.notEqual(result.savingThrows.cos, 3);
});

test("TS: una mappa parziale non viene presentata come interamente verificata", () => {
  const result = extractStructuredPcSaves({
    character_sheet: {
      savingThrows: {
        con: { value: 6 },
        int: { value: 4 },
      },
      abilityMods: { con: 2 },
    },
  }, "mago", 5);

  assert.equal(result.source, "estimated");
  assert.equal(result.savingThrows.cos, 6);
  assert.equal(result.savingThrows.for, 1); // fallback stimato solo per il TS assente
});

test("TS: una mappa esplicita completa viene riconosciuta come proveniente dalla scheda", () => {
  const result = extractStructuredPcSaves({
    character_sheet: {
      savingThrows: {
        str: { value: 1 }, dex: { value: 2 }, con: { value: 6 },
        int: { value: 4 }, wis: { value: 5 }, cha: { value: -1 },
      },
      abilityMods: { con: 2 },
    },
  }, "mago", 5);

  assert.equal(result.source, "sheet");
  assert.equal(result.savingThrows.cos, 6);
});
