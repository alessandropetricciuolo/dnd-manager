import test from "node:test";
import assert from "node:assert/strict";

import {
  formatMissionDraftForChat,
  missionHintsFromInput,
  parseMissionDraftJson,
} from "@/lib/ai/mission-text-generator";

test("parseMissionDraftJson accepts valid mission JSON", () => {
  const raw = JSON.stringify({
    grade: "B",
    title: "L'anello nel cimitero",
    committente: "Gilda dei mercanti",
    ubicazione: "Cimitero di Nordhollow",
    paga: "200 mo",
    urgenza: "Alta",
    description: "Recuperare un anello rubato prima del rito di mezzanotte.",
    points_reward: 50,
  });
  const parsed = parseMissionDraftJson(raw);
  assert.ok(parsed.ok);
  assert.equal(parsed.data.grade, "B");
  assert.equal(parsed.data.pointsReward, 50);
  assert.match(parsed.data.description, /anello/i);
});

test("parseMissionDraftJson merges hints for missing title", () => {
  const parsed = parseMissionDraftJson(
    JSON.stringify({
      grade: "C",
      committente: "Villaggio",
      ubicazione: "Foresta",
      paga: "50 mo",
      urgenza: "Normale",
      description: "Cacciare il lupo mannaro.",
      points_reward: 20,
    }),
    { title: "Caccia al lupo" }
  );
  assert.ok(parsed.ok);
  assert.equal(parsed.data.title, "Caccia al lupo");
});

test("missionHintsFromInput reads proposal fields", () => {
  const hints = missionHintsFromInput({
    grade: "A",
    title: "Minaccia arcana",
    committente: "Arcimago",
    pointsReward: 120,
  });
  assert.equal(hints.grade, "A");
  assert.equal(hints.title, "Minaccia arcana");
  assert.equal(hints.pointsReward, 120);
});

test("formatMissionDraftForChat includes grade and payout", () => {
  const text = formatMissionDraftForChat({
    grade: "S",
    title: "Il drago risvegliato",
    committente: "Consiglio",
    ubicazione: "Montagne",
    paga: "1000 mo",
    urgenza: "Critica",
    description: "Fermare il drago.",
    pointsReward: 250,
  });
  assert.match(text, /grado S/i);
  assert.match(text, /1000 mo/i);
  assert.match(text, /Fermare il drago/i);
});
