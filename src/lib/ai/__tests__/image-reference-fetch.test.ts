import test from "node:test";
import assert from "node:assert/strict";
import { imageBufferToDataUrl, resolveImageReferenceForOpenRouter } from "../image-reference-fetch";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=", "base64");

test("HTTPS references are downloaded and sent with their actual image format", async (t) => {
  let requested = "";
  t.mock.method(globalThis, "fetch", async (url: string) => {
    requested = url;
    return new Response(png, { headers: { "content-type": "application/octet-stream" } });
  });
  const reference = await resolveImageReferenceForOpenRouter("https://example.com/image");
  assert.equal(requested, "https://example.com/image");
  assert.equal(reference, `data:image/png;base64,${png.toString("base64")}`);
});

test("HTML error pages are rejected even when advertised as images", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("<html>Login</html>", { headers: { "content-type": "image/png" } }));
  await assert.rejects(resolveImageReferenceForOpenRouter("https://example.com/image"), /riferimento scaricato/);
});

test("empty references and unsupported formats are rejected", () => {
  assert.throws(() => imageBufferToDataUrl(Buffer.alloc(0)), /riferimento scaricato/);
  assert.throws(() => imageBufferToDataUrl(Buffer.from("<svg></svg>")), /riferimento scaricato/);
});
