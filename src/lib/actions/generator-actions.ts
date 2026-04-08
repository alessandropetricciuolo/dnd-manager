'use server';

import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { mapGeneratedSheetToPdfFields } from "@/lib/sheet-generator/sheet-mapper";
import type { CharacterGeneratorInput, GeneratedCharacterSheet } from "@/lib/sheet-generator/types";

export type GenerateSheetResult = {
  success: boolean;
  message: string;
  sheet?: GeneratedCharacterSheet;
  sheetData?: Record<string, unknown>;
  warnings?: string[];
};

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
  };
}

export async function generateSheetAction(formData: FormData): Promise<GenerateSheetResult> {
  const input = parseInput(formData);
  if (!input.raceSlug || !input.classLabel || !input.backgroundSlug) {
    return { success: false, message: "Compila razza, classe, background e livello." };
  }

  try {
    const built = await buildGeneratedCharacterSheet(input);
    const sheetData = mapGeneratedSheetToPdfFields(built.sheet);
    return {
      success: true,
      message: `Scheda generata: ${built.sheet.classLabel} lvl ${built.sheet.level}.`,
      sheet: built.sheet,
      sheetData,
      warnings: built.warnings,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? `Errore generazione scheda: ${error.message}` : "Errore generazione scheda.",
    };
  }
}
