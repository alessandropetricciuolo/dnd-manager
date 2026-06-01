import test from "node:test";
import assert from "node:assert/strict";
import {
  ensurePaladinPunishmentSpell,
  isPaladinPunishmentSpell,
  isTorneoCombatSpell,
} from "@/lib/sheet-generator/spell-torneo-combat";

test("esclude utilità/divinazione forti ma non da combattimento", () => {
  assert.equal(isTorneoCombatSpell("Zona di Verità"), false);
  assert.equal(isTorneoCombatSpell("Individuazione del Magico"), false);
  assert.equal(isTorneoCombatSpell("Chiaroveggenza"), false);
});

test("esclude Luce diurna in torneo (illuminazione, non combattimento)", () => {
  assert.equal(isTorneoCombatSpell("Luce diurna"), false);
  assert.equal(isTorneoCombatSpell("Luce Diurna"), false);
});

test("esclude Scassinare in torneo (utilità fuori combattimento)", () => {
  assert.equal(isTorneoCombatSpell("Scassinare"), false);
});

test("include danni e controllo da combattimento", () => {
  assert.equal(isTorneoCombatSpell("Palla di Fuoco"), true);
  assert.equal(isTorneoCombatSpell("Fulmine"), true);
  assert.equal(isTorneoCombatSpell("Ragnatela"), true);
});

test("inserisce una Punizione se mancante", () => {
  const pool = [
    { name: "Punizione Collerica", level: 1 },
    { name: "Zona di Verità", level: 2 },
    { name: "Benedizione", level: 1 },
  ];
  const picked = [{ name: "Benedizione", level: 1 }];
  const out = ensurePaladinPunishmentSpell(picked, pool, 2);
  assert.ok(out.some((s) => isPaladinPunishmentSpell(s.name)));
});

test("non modifica se già presente una Punizione", () => {
  const pool = [{ name: "Punizione Incandescente", level: 2 }];
  const picked = [{ name: "Punizione Incandescente", level: 2 }];
  assert.deepEqual(ensurePaladinPunishmentSpell(picked, pool, 2), picked);
});
