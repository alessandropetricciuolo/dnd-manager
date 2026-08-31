import assert from "node:assert/strict";
import test from "node:test";
import {
  isGmOrAdminRole,
  isSafeRemoteImageUrl,
  normalizeStorageDownloadTarget,
} from "@/lib/media-export/security";

test("media storage downloads are limited to privileged roles and known buckets", () => {
  assert.equal(isGmOrAdminRole("gm"), true);
  assert.equal(isGmOrAdminRole("admin"), true);
  assert.equal(isGmOrAdminRole("player"), false);
  assert.equal(isGmOrAdminRole(null), false);

  assert.deepEqual(normalizeStorageDownloadTarget("gm_files", "notes/map.png"), {
    ok: true,
    bucket: "gm_files",
    filePath: "notes/map.png",
  });
  assert.equal(normalizeStorageDownloadTarget("avatars", "user.png").ok, false);
  assert.equal(normalizeStorageDownloadTarget("gm_files", "../secret.png").ok, false);
  assert.equal(normalizeStorageDownloadTarget("gm_files", "/secret.png").ok, false);
});

test("remote media fetch rejects localhost and private-network URLs", () => {
  assert.equal(isSafeRemoteImageUrl("https://drive.google.com/file/d/abc/view"), true);
  assert.equal(isSafeRemoteImageUrl("https://example.com/image.png"), true);

  assert.equal(isSafeRemoteImageUrl("http://localhost/image.png"), false);
  assert.equal(isSafeRemoteImageUrl("http://127.0.0.1/image.png"), false);
  assert.equal(isSafeRemoteImageUrl("http://10.0.0.5/image.png"), false);
  assert.equal(isSafeRemoteImageUrl("http://169.254.169.254/latest/meta-data"), false);
  assert.equal(isSafeRemoteImageUrl("http://[::1]/image.png"), false);
  assert.equal(isSafeRemoteImageUrl("https://user:pass@example.com/image.png"), false);
  assert.equal(isSafeRemoteImageUrl("file:///etc/passwd"), false);
});
