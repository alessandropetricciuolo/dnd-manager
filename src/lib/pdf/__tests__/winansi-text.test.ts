import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeTextForStandardPdfFont } from "@/lib/pdf/winansi-text";

test("sanitizeTextForStandardPdfFont sostituisce trattini e virgolette smart", () => {
  assert.equal(sanitizeTextForStandardPdfFont("ciao — mondo “test”"), 'ciao - mondo "test"');
});

test("sanitizeTextForStandardPdfFont mantiene accenti italiani", () => {
  assert.equal(sanitizeTextForStandardPdfFont("perché àèìòù"), "perché àèìòù");
});
