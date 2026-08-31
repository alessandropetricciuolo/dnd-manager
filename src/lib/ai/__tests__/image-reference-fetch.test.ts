import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fetchPublicImageAsDataUrl } from "../image-reference-fetch";

describe("fetchPublicImageAsDataUrl", () => {
  it("rejects cloud metadata SSRF targets", async () => {
    await assert.rejects(
      () => fetchPublicImageAsDataUrl("http://169.254.169.254/latest/meta-data/"),
      /\/api\/tg-image/
    );
  });

  it("rejects same-origin paths that are not tg-image proxy routes", async () => {
    await assert.rejects(
      () => fetchPublicImageAsDataUrl("/api/manuals/player-handbook-md"),
      /\/api\/tg-image/
    );
  });

  it("rejects arbitrary external HTTPS URLs", async () => {
    await assert.rejects(
      () => fetchPublicImageAsDataUrl("https://example.com/secret.png"),
      /\/api\/tg-image/
    );
  });

  it("rejects empty reference URLs", async () => {
    await assert.rejects(() => fetchPublicImageAsDataUrl("   "), /mancante/i);
  });
});
