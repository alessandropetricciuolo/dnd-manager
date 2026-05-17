import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  appendCharacterStoryToPdf,
  storyInputToPdfPlainText,
  wrapPdfLineParagraph,
} from "@/lib/pdf/append-character-story-page";

test("storyInputToPdfPlainText toglie markdown base", () => {
  assert.equal(storyInputToPdfPlainText("### **Titolo**\nFoo *bar*"), "Titolo\nFoo bar");
});

test("wrapPdfLineParagraph rispetta la larghezza", async () => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const lines = wrapPdfLineParagraph("hello world uno due tre", font, 11, 50);
  assert.ok(lines.length >= 2);
});

test("appendCharacterStoryToPdf aumenta il numero di pagine", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const before = pdf.getPageCount();
  await appendCharacterStoryToPdf(pdf, "Primo paragrafo.\n\nSecondo dopo una riga vuota.", {
    contextLine: "Nome · ladro liv. 5",
  });
  assert.ok(pdf.getPageCount() > before);
});
