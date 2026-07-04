import test from "node:test";
import assert from "node:assert/strict";

import {
  aspectRatioFallbackChain,
  clampOpenRouterImagePrompt,
  extractUnifiedImageFromResponse,
  isOpenRouterClientError,
  normalizeOpenRouterAspectRatio,
} from "../openrouter-image-request";

test("clampOpenRouterImagePrompt truncates long prompts", () => {
  const long = "a".repeat(9000);
  assert.equal(clampOpenRouterImagePrompt(long).length, 8001);
});

test("normalizeOpenRouterAspectRatio falls back for invalid values", () => {
  assert.equal(normalizeOpenRouterAspectRatio("16:9"), "16:9");
  assert.equal(normalizeOpenRouterAspectRatio("99:99", "4:3"), "4:3");
});

test("aspectRatioFallbackChain includes auto and 1:1", () => {
  const chain = aspectRatioFallbackChain("16:9");
  assert.deepEqual(chain.slice(0, 3), ["16:9", "auto", "1:1"]);
});

test("extractUnifiedImageFromResponse reads b64_json", () => {
  const out = extractUnifiedImageFromResponse({
    data: [{ b64_json: "abc123" }],
  });
  assert.match(out.imageBase64 ?? "", /^data:image\/png;base64,abc123$/);
});

test("isOpenRouterClientError detects HTTP 400", () => {
  assert.equal(isOpenRouterClientError("OpenRouter HTTP 400: bad aspect_ratio"), true);
  assert.equal(isOpenRouterClientError("OpenRouter HTTP 500"), false);
});
