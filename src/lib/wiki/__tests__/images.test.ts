import test from "node:test";
import assert from "node:assert/strict";
import { getWikiImages, parseWikiImageKey, validateWikiImageUpload, promoteWikiImage } from "../images";
const entity = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const image = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
test("projection retains entity and image identity and rejects malformed keys", () => {
  assert.deepEqual(parseWikiImageKey(entity), { entityId: entity, imageId: undefined });
  assert.deepEqual(parseWikiImageKey(`${entity}:${image}`), { entityId: entity, imageId: image });
  for (const key of ["garbage", `${entity}:`, `${entity}:${image}:extra`, `${entity}:../../secret`]) assert.equal(parseWikiImageKey(key), null);
});
test("gallery removes invalid or duplicate images and unsafe URLs", () => {
  assert.deepEqual(getWikiImages({ images: [null, { id: image, url: "javascript:alert(1)" }, { id: image, url: "https://localhost/image" }, { id: image, url: "/api/tg-image/abc", title: " Portrait " }, { id: image, url: "https://example.com/other.png" }] }), [{ id: image, url: "/api/tg-image/abc", title: "Portrait" }]);
  assert.deepEqual(getWikiImages(null), []);
});

test("upload rejects oversized batches before submission", () => {
  const form = new FormData();
  form.append("gallery_images", new Blob([new Uint8Array(5 * 1024 * 1024)], { type: "image/png" }), "large.png");
  assert.match(validateWikiImageUpload(form)!, /4 MB/);
  const batch = new FormData();
  for (let i = 0; i < 3; i++) batch.append("gallery_images", new Blob([new Uint8Array(3 * 1024 * 1024)], { type: "image/png" }), "image.png");
  assert.match(validateWikiImageUpload(batch)!, /8 MB/);
  assert.equal(validateWikiImageUpload(new FormData()), null);
});

test("promoting preserves previous cover, fallback and unrelated attributes", () => {
  const result = promoteWikiImage({ image_url: "https://example.com/cover.png", telegram_fallback_id: "cover_backup", attributes: { gm_notes: "private", images: [{ id: image, url: "/api/tg-image/new", title: "New" }] } }, image);
  assert.equal(result.image_url, "/api/tg-image/new");
  assert.equal(result.telegram_fallback_id, null);
  assert.equal(result.attributes.gm_notes, "private");
  assert.deepEqual(getWikiImages(result.attributes), [{ id: image, url: "https://example.com/cover.png", title: "Copertina precedente", telegram_fallback_id: "cover_backup" }]);
  const restored = promoteWikiImage(result, image);
  assert.equal(restored.image_url, "https://example.com/cover.png");
  assert.equal(restored.telegram_fallback_id, "cover_backup");
});
test("promoting without a previous cover avoids an empty gallery item", () => {
  const result = promoteWikiImage({ image_url: null, attributes: { images: [{ id: image, url: "/api/tg-image/new", title: "New" }] } }, image);
  assert.deepEqual(result.attributes.images, []);
  assert.throws(() => promoteWikiImage({ image_url: null, attributes: {} }, image), /non trovata/);
});
