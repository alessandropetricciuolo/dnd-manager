import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

test("setup-webhook: in produzione senza TELEGRAM_SETUP_TOKEN risponde 404", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevToken = process.env.TELEGRAM_SETUP_TOKEN;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.TELEGRAM_SETUP_TOKEN;
    const { GET } = await import("@/app/api/setup-webhook/route");
    const req = new NextRequest("http://localhost/api/setup-webhook");
    const res = await GET(req);
    assert.equal(res.status, 404);
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevToken !== undefined) process.env.TELEGRAM_SETUP_TOKEN = prevToken;
    else delete process.env.TELEGRAM_SETUP_TOKEN;
  }
});

test("setup-webhook: con token configurato, richiesta senza token → 401", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevToken = process.env.TELEGRAM_SETUP_TOKEN;
  try {
    process.env.NODE_ENV = "development";
    process.env.TELEGRAM_SETUP_TOKEN = "secret-test-token";
    const { GET } = await import("@/app/api/setup-webhook/route");
    const req = new NextRequest("http://localhost/api/setup-webhook");
    const res = await GET(req);
    assert.equal(res.status, 401);
  } finally {
    process.env.NODE_ENV = prevEnv;
    if (prevToken !== undefined) process.env.TELEGRAM_SETUP_TOKEN = prevToken;
    else delete process.env.TELEGRAM_SETUP_TOKEN;
  }
});
