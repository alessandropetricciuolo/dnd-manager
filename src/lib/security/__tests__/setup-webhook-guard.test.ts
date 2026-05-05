import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

function setNodeEnv(value: string | undefined) {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, "NODE_ENV");
    return;
  }
  Object.defineProperty(process.env, "NODE_ENV", { value, configurable: true, enumerable: true, writable: true });
}

test("setup-webhook: in produzione senza TELEGRAM_SETUP_TOKEN risponde 404", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevToken = process.env.TELEGRAM_SETUP_TOKEN;
  try {
    setNodeEnv("production");
    delete process.env.TELEGRAM_SETUP_TOKEN;
    const { GET } = await import("@/app/api/setup-webhook/route");
    const req = new NextRequest("http://localhost/api/setup-webhook");
    const res = await GET(req);
    assert.equal(res.status, 404);
  } finally {
    setNodeEnv(prevEnv);
    if (prevToken !== undefined) process.env.TELEGRAM_SETUP_TOKEN = prevToken;
    else delete process.env.TELEGRAM_SETUP_TOKEN;
  }
});

test("setup-webhook: con token configurato, richiesta senza token → 401", async () => {
  const prevEnv = process.env.NODE_ENV;
  const prevToken = process.env.TELEGRAM_SETUP_TOKEN;
  try {
    setNodeEnv("development");
    process.env.TELEGRAM_SETUP_TOKEN = "secret-test-token";
    const { GET } = await import("@/app/api/setup-webhook/route");
    const req = new NextRequest("http://localhost/api/setup-webhook");
    const res = await GET(req);
    assert.equal(res.status, 401);
  } finally {
    setNodeEnv(prevEnv);
    if (prevToken !== undefined) process.env.TELEGRAM_SETUP_TOKEN = prevToken;
    else delete process.env.TELEGRAM_SETUP_TOKEN;
  }
});
