import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import {
  isAuthRoute,
  isProtectedRoute,
  isPublicPath,
  isPublicMediaProxyPath,
  isMobileBearerApiPath,
  shouldRedirectUnauthenticated,
  updateSession,
} from "@/lib/supabase/middleware";

test("path pubblici: home e privacy", () => {
  assert.equal(isPublicPath("/"), true);
  assert.equal(isPublicPath("/privacy"), true);
  assert.equal(isPublicPath("/privacy/"), true);
  assert.equal(isPublicPath("/login"), false);
});

test("rotte protette: dashboard, campaigns, profile, admin", () => {
  assert.equal(isProtectedRoute("/dashboard"), true);
  assert.equal(isProtectedRoute("/campaigns/abc"), true);
  assert.equal(isProtectedRoute("/profile"), true);
  assert.equal(isProtectedRoute("/admin"), true);
  assert.equal(isProtectedRoute("/api/sheet-pdf"), false);
});

test("solo il proxy immagini Telegram pubblico salta il middleware auth", () => {
  assert.equal(isPublicMediaProxyPath("/api/tg-image/file-id"), true);
  assert.equal(isPublicMediaProxyPath("/api/tg-image"), true);
  assert.equal(isPublicMediaProxyPath("/api/sheet-pdf"), false);
  assert.equal(isPublicMediaProxyPath("/dashboard"), false);
});

test("rotte auth: login, signup, forgot-password", () => {
  assert.equal(isAuthRoute("/login"), true);
  assert.equal(isAuthRoute("/signup"), true);
  assert.equal(isAuthRoute("/forgot-password"), true);
});

test("redirect al login solo quando Supabase conferma che la sessione è assente", () => {
  assert.equal(shouldRedirectUnauthenticated(false, false), true);
  assert.equal(shouldRedirectUnauthenticated(true, false), false);
  assert.equal(shouldRedirectUnauthenticated(false, true), false);
});

test("native bearer routes skip browser session refresh without bypassing neighboring paths", async () => {
  assert.equal(isMobileBearerApiPath("/api/mobile/push/device"), true);
  assert.equal(isMobileBearerApiPath("/api/mobile/push/dispatch"), true);
  assert.equal(isMobileBearerApiPath("/api/mobile-other"), false);
  assert.equal(isMobileBearerApiPath("/campaigns/mobile"), false);
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // An invalid web-cookie client configuration must never be initialized for
  // these requests. Their route handlers independently reject missing tokens.
  process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-valid-url";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
  try {
    const response = await updateSession(new NextRequest("https://example.com/api/mobile/push/device", { method: "PUT" }));
    assert.equal(response.headers.get("x-middleware-next"), "1");
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  }
});
