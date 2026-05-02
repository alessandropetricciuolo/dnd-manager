import assert from "node:assert/strict";
import test from "node:test";
import { sanitizePdfAttachmentFileName } from "@/lib/security/pdf-filename";

test("sanitizePdfAttachmentFileName blocca path traversal e caratteri strani", () => {
  assert.equal(sanitizePdfAttachmentFileName("scheda.pdf"), "scheda.pdf");
  const traversal = sanitizePdfAttachmentFileName("../../../etc/passwd");
  assert.ok(!traversal.includes("/"), "non deve contenere slash");
  assert.equal(sanitizePdfAttachmentFileName("a\x00b.pdf"), "a_b.pdf");
  assert.ok(!sanitizePdfAttachmentFileName("x".repeat(300)).includes("\x00"));
  assert.ok(sanitizePdfAttachmentFileName("x".repeat(300)).length <= 200);
});

test("sanitizePdfAttachmentFileName default e trim", () => {
  assert.equal(sanitizePdfAttachmentFileName(null), "scheda-compilata.pdf");
  assert.equal(sanitizePdfAttachmentFileName("   "), "scheda-compilata.pdf");
});
