import assert from "node:assert/strict";
import test from "node:test";
import { isAuthRoute, isProtectedRoute, isPublicPath } from "@/lib/supabase/middleware";

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

test("rotte auth: login, signup, forgot-password", () => {
  assert.equal(isAuthRoute("/login"), true);
  assert.equal(isAuthRoute("/signup"), true);
  assert.equal(isAuthRoute("/forgot-password"), true);
});
