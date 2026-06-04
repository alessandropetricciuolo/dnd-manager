'use server';

import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import {
  resolveBuildChoicesPreview,
  validateBuildOverrides,
} from "@/lib/sheet-generator/build-choices";
import type { BuildChoicesPreview, CharacterBuildOverrides } from "@/lib/sheet-generator/build-choices-types";
import {
  buildBackgroundPdfSections,
  buildQuickManualSections,
  type QuickManualSection,
} from "@/lib/sheet-generator/quick-manual-builder";
import { mapGeneratedSheetToPdfFields } from "@/lib/sheet-generator/sheet-mapper";
import type { CharacterGeneratorInput, GeneratedCharacterSheet } from "@/lib/sheet-generator/types";
import { headers } from "next/headers";

export type GenerateSheetResult = {
  success: boolean;
  message: string;
  sheet?: GeneratedCharacterSheet;
  sheetData?: Record<string, unknown>;
  quickManualSections?: QuickManualSection[];
  backgroundPdfSections?: QuickManualSection[];
  includeBackgroundStoryInPdf?: boolean;
  characterStory?: string | null;
  warnings?: string[];
};

export type PreviewBuildChoicesResult = {
  success: boolean;
  message: string;
  preview?: BuildChoicesPreview;
};

function parseBuildOverrides(raw: string | null): CharacterBuildOverrides | undefined {
  if (!raw?.trim()) return undefined;
  try {
    return JSON.parse(raw) as CharacterBuildOverrides;
  } catch {
    return undefined;
  }
}

function parseInput(formData: FormData): CharacterGeneratorInput {
  const levelRaw = (formData.get("level") as string | null)?.trim() ?? "1";
  const parsedLevel = Number.parseInt(levelRaw, 10);
  return {
    characterName: (formData.get("characterName") as string | null)?.trim() ?? "PG senza nome",
    raceSlug: (formData.get("raceSlug") as string | null)?.trim() ?? "",
    subraceSlug: (formData.get("subraceSlug") as string | null)?.trim() || null,
    classLabel: (formData.get("classLabel") as string | null)?.trim() ?? "",
    classSubclass: (formData.get("classSubclass") as string | null)?.trim() || null,
    backgroundSlug: (formData.get("backgroundSlug") as string | null)?.trim() ?? "",
    level: Number.isFinite(parsedLevel) ? Math.max(1, Math.min(20, parsedLevel)) : 1,
    alignment: (formData.get("alignment") as string | null)?.trim() || null,
    age: (formData.get("age") as string | null)?.trim() || null,
    height: (formData.get("height") as string | null)?.trim() || null,
    weight: (formData.get("weight") as string | null)?.trim() || null,
    sex: (formData.get("sex") as string | null)?.trim() || null,
    powerPlayer: formData.get("powerPlayer") === "1" || formData.get("powerPlayer") === "on",
    torneoMode: formData.get("torneoMode") === "1" || formData.get("torneoMode") === "on",
    includeBackgroundStoryInPdf:
      formData.get("includeBackgroundStoryInPdf") === "1" ||
      formData.get("includeBackgroundStoryInPdf") === "on",
    characterStory: (formData.get("characterStory") as string | null)?.trim() || null,
    buildOverrides: parseBuildOverrides(formData.get("buildOverridesJson") as string | null),
  };
}

async function requestOriginFromHeaders(): Promise<string | null> {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : null;
}

export async function previewBuildChoicesAction(
  formData: FormData
): Promise<PreviewBuildChoicesResult> {
  const input = parseInput(formData);
  if (!input.raceSlug || !input.classLabel || !input.backgroundSlug) {
    return { success: false, message: "Compila razza, classe, background e livello." };
  }

  try {
    const preview = await resolveBuildChoicesPreview(input, await requestOriginFromHeaders());
    if (!preview.slots.length) {
      return {
        success: true,
        message: "Nessuna scelta aggiuntiva per questa build: procedi alla generazione.",
        preview,
      };
    }
    return {
      success: true,
      message: "Rivedi e modifica le scelte automatiche, poi genera la scheda.",
      preview,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Errore anteprima scelte: ${error.message}`
          : "Errore anteprima scelte.",
    };
  }
}

export async function generateSheetAction(formData: FormData): Promise<GenerateSheetResult> {
  const input = parseInput(formData);
  if (!input.raceSlug || !input.classLabel || !input.backgroundSlug) {
    return { success: false, message: "Compila razza, classe, background e livello." };
  }

  if (input.buildOverrides) {
    try {
      const preview = await resolveBuildChoicesPreview(input, await requestOriginFromHeaders());
      const errors = validateBuildOverrides(input.buildOverrides, preview);
      if (errors.length) {
        return { success: false, message: errors.join(" ") };
      }
    } catch {
      // Se la validazione anteprima fallisce, procedi comunque con override parziali.
    }
  }

  try {
    const requestOrigin = await requestOriginFromHeaders();
    const built = await buildGeneratedCharacterSheet(input, requestOrigin);
    const sheetData = mapGeneratedSheetToPdfFields(built.sheet);
    const quickManualSections = input.torneoMode
      ? await buildQuickManualSections(built.sheet)
      : undefined;
    const backgroundPdfSections = input.includeBackgroundStoryInPdf
      ? buildBackgroundPdfSections(built.sheet)
      : undefined;
    return {
      success: true,
      message: `Scheda generata: ${built.sheet.classLabel} lvl ${built.sheet.level}.`,
      sheet: built.sheet,
      sheetData,
      quickManualSections,
      backgroundPdfSections,
      includeBackgroundStoryInPdf: !!input.includeBackgroundStoryInPdf,
      characterStory: input.characterStory ?? null,
      warnings: built.warnings,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? `Errore generazione scheda: ${error.message}` : "Errore generazione scheda.",
    };
  }
}
