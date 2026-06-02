import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";

test("mago invocazione L5: privilegi solo scuola invocazione, non necromanzia", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Zariel Vex",
    raceSlug: "elfo",
    subraceSlug: null,
    classLabel: "Mago",
    classSubclass: "Scuola di Invocazione",
    backgroundSlug: "sapiente",
    level: 5,
    torneoMode: false,
  });

  const sub = (res.sheet.subclassFeaturesMd ?? "").toLowerCase();
  const cls = res.sheet.classFeaturesMd.toLowerCase();
  const merged = `${cls}\n${sub}`;

  assert.ok(sub.includes("invocatore sapiente") || sub.includes("plasmare incantesimi"));
  assert.ok(!sub.includes("necromante sapiente"), "sottoclasse non deve contenere necromanzia");
  assert.ok(!sub.includes("raccolto macabro"), "sottoclasse non deve contenere raccolto macabro");
  assert.ok(!merged.includes("scuola di necromanzia"), "nessun blocco scuola necromanzia");
  assert.ok(!cls.includes("necromante sapiente"), "privilegi classe base senza necromanzia");
});
