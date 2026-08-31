import test from "node:test";
import assert from "node:assert/strict";

test("fetchPublicImageAsDataUrl rifiuta URL verso host privati (SSRF)", async () => {
  const { fetchPublicImageAsDataUrl } = await import("@/lib/ai/image-reference-fetch");

  await assert.rejects(
    () => fetchPublicImageAsDataUrl("http://169.254.169.254/latest/meta-data/"),
    /non consentito/i
  );
  await assert.rejects(
    () => fetchPublicImageAsDataUrl("http://127.0.0.1:8080/internal"),
    /non consentito/i
  );
});

test("fetchPublicImageAsDataUrl accetta path proxy Telegram interno", async () => {
  const { fetchPublicImageAsDataUrl } = await import("@/lib/ai/image-reference-fetch");

  await assert.rejects(
    () => fetchPublicImageAsDataUrl("/api/tg-image/not-a-real-file-id"),
    (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      return !/non consentito/i.test(message);
    }
  );
});
