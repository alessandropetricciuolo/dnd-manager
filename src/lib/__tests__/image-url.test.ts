import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isValidImageUrl } from "@/lib/image-url";

describe("isValidImageUrl", () => {
  it("accepts absolute http(s) URLs", () => {
    assert.equal(isValidImageUrl("https://example.com/portrait.png"), true);
    assert.equal(isValidImageUrl("http://127.0.0.1:3000/img.png"), true);
  });

  it("rejects same-origin Telegram proxy paths used by AI generation", () => {
    assert.equal(isValidImageUrl("/api/tg-image/AgACAgEAAxkBAAI"), false);
  });
});
