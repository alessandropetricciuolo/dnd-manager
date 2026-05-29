import assert from "node:assert/strict";
import test from "node:test";
import { isPrivateNetworkAddress, isSafePublicHttpUrl } from "@/lib/media-export/fetch-image";

test("media export URL guard blocks private and local network addresses", async () => {
  assert.equal(isPrivateNetworkAddress("127.0.0.1"), true);
  assert.equal(isPrivateNetworkAddress("169.254.169.254"), true);
  assert.equal(isPrivateNetworkAddress("10.0.0.1"), true);
  assert.equal(isPrivateNetworkAddress("172.16.0.1"), true);
  assert.equal(isPrivateNetworkAddress("192.168.1.10"), true);
  assert.equal(isPrivateNetworkAddress("::1"), true);

  assert.equal(await isSafePublicHttpUrl("http://127.0.0.1/image.png"), false);
  assert.equal(await isSafePublicHttpUrl("http://169.254.169.254/latest/meta-data/"), false);
  assert.equal(await isSafePublicHttpUrl("http://localhost/image.png"), false);
  assert.equal(await isSafePublicHttpUrl("file:///etc/passwd"), false);
});

test("media export URL guard allows public HTTP image hosts", async () => {
  assert.equal(isPrivateNetworkAddress("8.8.8.8"), false);
  assert.equal(await isSafePublicHttpUrl("https://8.8.8.8/image.png"), true);
});
