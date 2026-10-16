import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../[file_id]/route";

test("Telegram paths are refreshed and failures cannot become successful blank images", async () => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_BOT_TOKEN = "test-token";
  const context = { params: Promise.resolve({ file_id: "photo-id" }) };
  const request = new NextRequest("https://example.com/api/tg-image/photo-id");
  const calls: Array<{ url: string; cache?: RequestCache }> = [];
  try {
    let path = "photos/fresh.jpg";
    let downloadStatus = 200;
    let getFileOk = true;
    globalThis.fetch = (async (input, init) => {
      calls.push({ url: String(input), cache: init?.cache });
      if (String(input).includes("/getFile?")) {
        return Response.json(getFileOk ? { ok: true, result: { file_path: path } } : { ok: false });
      }
      return new Response(new Uint8Array([255, 216, 255]), { status: downloadStatus });
    }) as typeof fetch;

    const first = await GET(request, context);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("Content-Type"), "image/jpeg");
    assert.deepEqual(new Uint8Array(await first.arrayBuffer()), new Uint8Array([255, 216, 255]));
    path = "photos/new-path.png";
    const second = await GET(request, context);
    assert.equal(second.headers.get("Content-Type"), "image/png");
    assert.ok(calls[3].url.endsWith("photos/new-path.png"));
    assert.ok(calls.every(call => call.cache === "no-store"));

    downloadStatus = 404;
    const expired = await GET(request, context);
    assert.equal(expired.status, 502);
    assert.equal(expired.headers.get("Cache-Control"), "no-store");
    assert.equal(expired.headers.get("X-Tg-Image-Error"), "download-failed");
    getFileOk = false;
    const missing = await GET(request, context);
    assert.equal(missing.status, 502);
    assert.equal(missing.headers.get("X-Tg-Image-Error"), "getfile-failed");
    globalThis.fetch = async () => { throw new Error("network unavailable"); };
    const failed = await GET(request, context);
    assert.equal(failed.status, 502);
    assert.equal(failed.headers.get("Cache-Control"), "no-store");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = originalToken;
  }
});
