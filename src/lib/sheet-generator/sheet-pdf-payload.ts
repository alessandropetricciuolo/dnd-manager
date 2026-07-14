import type { QuickManualSection } from "@/lib/sheet-generator/quick-manual-builder";
import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";

export type CompiledSheetExportPayload = {
  exportedAt: string;
  sheet: GeneratedCharacterSheet;
  /** Stesso payload inviato a `/api/sheet-pdf` (campi AcroForm + sezioni extra). */
  compiledPdf: Record<string, unknown>;
};

export function compiledSheetJsonFileName(sheet: GeneratedCharacterSheet): string {
  const base = (sheet.characterName?.trim() || "scheda").replace(/[^\w\s.-]/gi, "").trim() || "scheda";
  return `${base}-compilata.json`;
}

export function pdfStoryContextLine(sheet: GeneratedCharacterSheet): string {
  const name = sheet.characterName?.trim();
  const cls = [sheet.classLabel, sheet.level ? `liv. ${sheet.level}` : ""].filter(Boolean).join(" ");
  const bg = sheet.backgroundLabel?.trim() ?? "";
  return [name, cls, bg ? `Background: ${bg}` : ""].filter(Boolean).join(" · ");
}

export function buildCompiledSheetPdfRequestBody(params: {
  sheetData: Record<string, unknown>;
  sheet: GeneratedCharacterSheet;
  quickManualSections?: QuickManualSection[];
  backgroundPdfSections?: QuickManualSection[];
  includeBackgroundStoryInPdf: boolean;
  characterStory?: string | null;
  fileName?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    fields: params.sheetData,
    fileName: params.fileName ?? `${params.sheet.characterName || "scheda"}-compilata.pdf`,
  };
  if (params.quickManualSections?.length) {
    body.quickManualSections = params.quickManualSections;
  }
  if (params.backgroundPdfSections?.length) {
    body.backgroundPdfSections = params.backgroundPdfSections;
  }
  const storyTrim = params.includeBackgroundStoryInPdf ? (params.characterStory ?? "").trim() : "";
  if (storyTrim) {
    body.storyText = storyTrim;
    body.storyContextLine = pdfStoryContextLine(params.sheet);
  }
  return body;
}

export function buildCompiledSheetExportPayload(params: {
  sheetData: Record<string, unknown>;
  sheet: GeneratedCharacterSheet;
  quickManualSections?: QuickManualSection[];
  backgroundPdfSections?: QuickManualSection[];
  includeBackgroundStoryInPdf: boolean;
  characterStory?: string | null;
  fileName?: string;
}): CompiledSheetExportPayload {
  return {
    exportedAt: new Date().toISOString(),
    sheet: params.sheet,
    compiledPdf: buildCompiledSheetPdfRequestBody(params),
  };
}
