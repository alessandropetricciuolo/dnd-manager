import test from "node:test";
import assert from "node:assert/strict";

import {
  extractBalancedJsonObject,
  parseJsonObjectFromLlm,
  repairLooseJsonText,
} from "../json-extract";

test("extractBalancedJsonObject handles markdown fence", () => {
  const raw = 'Ecco il JSON:\n```json\n{"title":"Test","description":"x"}\n```';
  assert.equal(extractBalancedJsonObject(raw), '{"title":"Test","description":"x"}');
});

test("extractBalancedJsonObject respects braces inside strings", () => {
  const raw = `{"title":"Ombre","description":"Un regno {antico} e misterioso."}`;
  assert.equal(
    extractBalancedJsonObject(raw),
    '{"title":"Ombre","description":"Un regno {antico} e misterioso."}'
  );
});

test("parseJsonObjectFromLlm repairs trailing commas", () => {
  const parsed = parseJsonObjectFromLlm('{"title":"A","description":"B",}');
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.title, "A");
    assert.equal(parsed.value.description, "B");
  }
});

test("repairLooseJsonText normalizes smart quotes", () => {
  const fixed = repairLooseJsonText("{\u201ctitle\u201d:\u201cA\u201d}");
  assert.equal(fixed, '{"title":"A"}');
});
