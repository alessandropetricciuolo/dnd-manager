import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedMediaStorageRequest } from "@/app/api/media-download/route";

test("media download only accepts expected storage buckets and object paths", () => {
  assert.equal(isAllowedMediaStorageRequest("gm_files", "campaign/file.png"), true);
  assert.equal(isAllowedMediaStorageRequest("exploration_maps", "campaign/map.webp"), true);

  assert.equal(isAllowedMediaStorageRequest("avatars", "user/avatar.png"), false);
  assert.equal(isAllowedMediaStorageRequest("gm_files", "../secret.png"), false);
  assert.equal(isAllowedMediaStorageRequest("gm_files", "/campaign/file.png"), false);
  assert.equal(isAllowedMediaStorageRequest("gm_files", null), false);
  assert.equal(isAllowedMediaStorageRequest(null, "campaign/file.png"), false);
});
