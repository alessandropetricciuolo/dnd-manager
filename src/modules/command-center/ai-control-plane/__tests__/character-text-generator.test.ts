import test from "node:test";
import assert from "node:assert/strict";

import { parseCharacterStoryJson } from "@/lib/ai/character-text-generator";

test("parseCharacterStoryJson accepts valid story JSON", () => {
  const parsed = parseCharacterStoryJson(
    JSON.stringify({
      character_story: "Thalion cresce nelle foreste del nord e cerca vendetta.",
    })
  );
  assert.ok(parsed.ok);
  assert.match(parsed.data.characterStory, /Thalion/i);
});

test("parseCharacterStoryJson rejects empty story", () => {
  const parsed = parseCharacterStoryJson(JSON.stringify({ character_story: "" }));
  assert.equal(parsed.ok, false);
});
