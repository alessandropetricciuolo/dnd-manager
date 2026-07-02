import test from "node:test";
import assert from "node:assert/strict";

import { detectSessionCreateRequest } from "../session-request-detector";
import { parseSessionDraftJson } from "@/lib/ai/session-text-generator";

test("detectSessionCreateRequest from programma sessione con data italiana", () => {
  const detected = detectSessionCreateRequest(
    "programma sessione sabato 15 marzo ore 21, capitolo 3 'La torre sommersa', party degli eroi"
  );
  assert.ok(detected);
  assert.equal(detected!.date, "2026-03-15");
  assert.equal(detected!.time, "21:00");
  assert.match(detected!.chapterTitle ?? "", /torre sommersa/i);
  assert.match(detected!.partyName ?? "", /eroi/i);
});

test("detectSessionCreateRequest parses domani", () => {
  const detected = detectSessionCreateRequest("crea una sessione per domani alle 20");
  assert.ok(detected);
  assert.ok(detected!.date);
  assert.equal(detected!.time, "20:00");
});

test("detectSessionCreateRequest returns null for unrelated text", () => {
  assert.equal(detectSessionCreateRequest("ciao"), null);
});

test("parseSessionDraftJson accepts valid session JSON", () => {
  const parsed = parseSessionDraftJson(
    JSON.stringify({
      date: "2026-04-10",
      time: "21:30",
      chapter_title: "Il portale",
      location: "Discord",
      party_name: "Eroi",
      max_players: 5,
    })
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.date, "2026-04-10");
    assert.equal(parsed.data.time, "21:30");
    assert.equal(parsed.data.maxPlayers, 5);
  }
});

test("parseSessionDraftJson rejects missing date", () => {
  const parsed = parseSessionDraftJson(JSON.stringify({ time: "20:00" }));
  assert.equal(parsed.ok, false);
});
