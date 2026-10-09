import test from "node:test";
import assert from "node:assert/strict";
import { getCampaignDefaultTab, shouldResolvePlayerDefaultTab } from "@/lib/campaign-default-tab";
import { isImageSourceOptimizable } from "@/lib/is-image-optimizable";
import { resolveWarRoomTab } from "@/lib/dashboard-war-room-tabs";

test("player default tab stays PG after invalid or inaccessible tab requests", () => {
  assert.equal(shouldResolvePlayerDefaultTab(null, false, true, true), true);
  assert.equal(shouldResolvePlayerDefaultTab("gm", false, true, true), true);
  assert.equal(shouldResolvePlayerDefaultTab("missioni", false, false, true), true);
  assert.equal(shouldResolvePlayerDefaultTab("mappe", false, true, false), true);
  assert.equal(shouldResolvePlayerDefaultTab("wiki", false, true, true), false);
  assert.equal(shouldResolvePlayerDefaultTab(null, true, true, true), false);
  assert.equal(getCampaignDefaultTab(false, true), "pg");
  assert.equal(getCampaignDefaultTab(false, false), "sessioni");
});

test("dashboard URL aliases resolve to the server tab slots", () => {
  assert.equal(resolveWarRoomTab("calendario"), "calendar");
  assert.equal(resolveWarRoomTab("mie-saghe"), "my-campaigns");
  assert.equal(resolveWarRoomTab("avventure"), "all-campaigns");
  assert.equal(resolveWarRoomTab("#prenotazioni"), "sessions");
  assert.equal(resolveWarRoomTab("unknown"), null);
});

test("image optimization is limited to configured safe image origins", () => {
  assert.equal(isImageSourceOptimizable("https://sample.supabase.co/storage/v1/object/public/maps/world.webp"), true);
  assert.equal(isImageSourceOptimizable("https://drive.google.com/uc?id=abc"), true);
  assert.equal(isImageSourceOptimizable("https://lh3.googleusercontent.com/a/photo.jpg"), true);
  assert.equal(isImageSourceOptimizable("/api/tg-image/file-id"), true);
  assert.equal(isImageSourceOptimizable("https://evil.example/image.jpg"), false);
  assert.equal(isImageSourceOptimizable("https://sample.supabase.co/storage/v1/object/sign/maps/private.jpg"), false);
  assert.equal(isImageSourceOptimizable("https://sample.supabase.co/storage/v1/object/public/maps/world.svg"), false);
  assert.equal(isImageSourceOptimizable("/assets/icon.svg"), false);
  assert.equal(isImageSourceOptimizable("//evil.example/image.jpg"), false);
});
