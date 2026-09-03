import test from "node:test";
import assert from "node:assert/strict";
import { imagePolicyHash } from "@/lib/ai/image-prompt-policy";
test("image policy hash is stable and excludes binary payloads", () => { const result = { positivePrompt: "night city", strictNegativePrompt: "NO cars", } as any; assert.equal(imagePolicyHash(result), imagePolicyHash(result)); assert.match(imagePolicyHash(result), /^fnv1a-/); });
