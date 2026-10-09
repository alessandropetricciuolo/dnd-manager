import test from "node:test";
import assert from "node:assert/strict";
import { getWikiVideos, parseWikiVideoKey, MAX_WIKI_VIDEO_BYTES, validateWikiVideoFile } from "../videos";
import { parseWikiImageKey, getWikiImages } from "../images";
const entity = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const video = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

test("video projection keys cannot be mistaken for cover or gallery images", () => {
  const key = `video:${entity}:${video}`;
  assert.deepEqual(parseWikiVideoKey(key), { entityId: entity, videoId: video });
  assert.equal(parseWikiImageKey(key), null);
  assert.equal(parseWikiVideoKey(`${entity}:${video}`), null);
  for (const key of [`video:${entity}:${video}:extra`, `video:${entity}:`, "video:../../audio:bad"]) assert.equal(parseWikiVideoKey(key), null);
});

test("MP4 upload rejects empty, oversized and nonvideo files before transfer", () => {
  assert.equal(validateWikiVideoFile(MAX_WIKI_VIDEO_BYTES, "video/mp4"), null);
  for (const size of [0, -1, NaN, Infinity, MAX_WIKI_VIDEO_BYTES + 1]) assert.match(validateWikiVideoFile(size, "video/mp4")!, /100 MB/);
  assert.match(validateWikiVideoFile(100, "image/png")!, /MP4/);
});

test("malformed and unsafe video records are ignored without changing the image gallery", () => {
  const valid = { id: video, url: "https://example.com/background.mp4", title: "Rain", storage_key: `wiki-videos/${entity}/${entity}/${video}.mp4`, file_size_bytes: 100 };
  const attributes = { videos: [null, { ...valid, url: "javascript:alert(1)" }, { ...valid, url: "https://user:pass@example.com/file" }, valid, valid], images: [{ id: video, url: "/api/tg-image/example", title: "Cover" }], gm_notes: "Keep" };
  assert.deepEqual(getWikiVideos(attributes), [valid]);
  assert.equal(getWikiImages(attributes).length, 1);
  assert.equal(attributes.gm_notes, "Keep");
  assert.deepEqual(getWikiVideos(null), []);
});
