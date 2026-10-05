import test from "node:test";
import assert from "node:assert/strict";

import {
  aspectRatioFallbackChain,
  clampOpenRouterImagePrompt,
  extractUnifiedImageFromResponse,
  formatOpenRouterImageError,
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

test("provider errors retain the cause from metadata.raw", () => {
  const message = formatOpenRouterImageError(400, { error: {
    message: "Provider returned error",
    metadata: { provider_name: "OpenAI", raw: JSON.stringify({ error: {
      message: "Invalid image URL https://example.com/private?token=secret",
      code: "invalid_image_url", param: "messages[0].content[0].image_url",
    }, prompt: "private prompt" }) },
  } });
  assert.match(message, /OpenAI; Invalid image URL \[URL\]; invalid_image_url/);
  assert.doesNotMatch(message, /token=secret|private prompt|Parametri immagine/);
});

test("provider error objects are supported and credentials redacted", () => {
  const message = formatOpenRouterImageError(400, { error: {
    message: "Provider returned error", metadata: { raw: { error: { message: "Rejected Bearer secret and sk-or-v1-secret" } } },
  } });
  assert.match(message, /Rejected \[redacted\] and \[redacted\]/);
  assert.doesNotMatch(message, /secret/);
});

test("malformed provider payloads are not exposed", () => {
  const message = formatOpenRouterImageError(400, { error: { message: "Provider returned error", metadata: { raw: "private prompt" } } });
  assert.equal(message, "OpenRouter HTTP 400: Provider returned error");
});
