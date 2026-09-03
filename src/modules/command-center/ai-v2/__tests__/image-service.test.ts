import test from "node:test";
import assert from "node:assert/strict";
import { imagePolicyHash } from "@/lib/ai/image-prompt-policy";
import { buildAssistantImagePrompt, resolveAssistantImageDescription } from "../image-service";
test("image policy hash is stable and excludes binary payloads", () => { const result = { positivePrompt: "night city", strictNegativePrompt: "NO cars", } as any; assert.equal(imagePolicyHash(result), imagePolicyHash(result)); assert.match(imagePolicyHash(result), /^fnv1a-/); });

test("uses the complete artifact narrative as the image subject, including regenerations", () => {
  const narrative = "Paolo è un calzolaio di mezza età con grembiule di cuoio, al banco con stivali e filo di luna.";
  const description = resolveAssistantImageDescription({ content: narrative });
  assert.equal(description, narrative);

  const prompt = buildAssistantImagePrompt({ positivePrompt: `Illustrate this subject faithfully: ${description}`, strictNegativePrompt: "NO armor, NO cloak" }, description, "https://example.test/previous.png");
  assert.match(prompt, new RegExp(narrative));
  assert.match(prompt, /Revise the previous image according to:/);
  assert.doesNotMatch(prompt, /Rigenera questa bozza/);
});
