import { createCharacterSheetV1, isCharacterSheetV1, type CharacterSheetV1 } from "@/lib/character-sheet";
import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";
import type { QuickManualSection } from "@/lib/sheet-generator/quick-manual-builder";
import type { CharacterFormBuildDraft } from "@/lib/character-sheet-build-meta";

export type StoredSpellcastingMeta = {
  spellSlots: Array<{ level: number; count: number }>;
  cantripsKnown: number;
  spellcastingAbility: string | null;
};

export type StoredGeneratedSheet = {
  pdfBase64: string;
  fileName: string;
  armorClass: number;
  hitPoints: number;
  sheet?: GeneratedCharacterSheet;
  sheetData?: Record<string, unknown>;
  quickManualSections?: QuickManualSection[];
  backgroundPdfSections?: QuickManualSection[];
  includeBackgroundStoryInPdf?: boolean;
  characterStory?: string | null;
  spellcasting?: StoredSpellcastingMeta | null;
  build?: CharacterFormBuildDraft;
};

/** Validate the full generated object restored from the create-dialog localStorage handoff. */
export function readGeneratedCharacterSheet(raw: unknown): GeneratedCharacterSheet | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const sheet = createCharacterSheetV1("generator", value as Omit<CharacterSheetV1, "version" | "source">);
  if (!isCharacterSheetV1(sheet)) return null;
  const abilities = sheet.abilities;
  const mods = sheet.abilityMods;
  const saves = sheet.savingThrows;
  const skills = sheet.skills;
  const abilitiesComplete = ["str", "dex", "con", "int", "wis", "cha"].every((key) =>
    typeof abilities?.[key as keyof typeof abilities] === "number" && typeof mods?.[key as keyof typeof mods] === "number" &&
    typeof saves?.[key as keyof typeof saves]?.value === "number" && typeof saves?.[key as keyof typeof saves]?.proficient === "boolean");
  const requiredStrings = ["characterName", "raceLabel", "classLabel", "backgroundLabel", "speed", "hitDie"];
  if (!requiredStrings.every((key) => typeof value[key] === "string") ||
      !Number.isInteger(value.level) || !abilitiesComplete || !skills ||
      !Array.isArray(value.weaponRows) || !Array.isArray(value.inventory) || !Array.isArray(value.languages) ||
      !Array.isArray(value.proficiencies) || !Array.isArray(value.spells) || !value.spellSlots || typeof value.spellSlots !== "object") {
    return null;
  }
  return value as unknown as GeneratedCharacterSheet;
}

/** Read and validate the generator-to-create-dialog localStorage handoff. */
export function parseStoredGeneratedSheet(raw: string | null): StoredGeneratedSheet | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sheet = readGeneratedCharacterSheet(parsed.sheet);
    if (typeof parsed.pdfBase64 !== "string" || !parsed.pdfBase64 || typeof parsed.fileName !== "string" ||
        typeof parsed.armorClass !== "number" || !Number.isFinite(parsed.armorClass) ||
        typeof parsed.hitPoints !== "number" || !Number.isFinite(parsed.hitPoints)) return null;
    const sheetData = parsed.sheetData != null && typeof parsed.sheetData === "object" && !Array.isArray(parsed.sheetData)
      ? parsed.sheetData as Record<string, unknown>
      : undefined;
    const quickManualSections = Array.isArray(parsed.quickManualSections) ? parsed.quickManualSections as QuickManualSection[] : undefined;
    const backgroundPdfSections = Array.isArray(parsed.backgroundPdfSections) ? parsed.backgroundPdfSections as QuickManualSection[] : undefined;
    let spellcasting: StoredSpellcastingMeta | null | undefined;
    if (parsed.spellcasting != null && typeof parsed.spellcasting === "object") {
      const sc = parsed.spellcasting as StoredSpellcastingMeta;
      if (Array.isArray(sc.spellSlots)) spellcasting = sc;
    }
    const build = parsed.build != null && typeof parsed.build === "object" && !Array.isArray(parsed.build)
      ? parsed.build as CharacterFormBuildDraft
      : undefined;
    return {
      pdfBase64: parsed.pdfBase64,
      fileName: parsed.fileName,
      armorClass: parsed.armorClass,
      hitPoints: parsed.hitPoints,
      sheet: sheet ?? undefined,
      sheetData,
      quickManualSections,
      backgroundPdfSections,
      includeBackgroundStoryInPdf: parsed.includeBackgroundStoryInPdf === true,
      characterStory: typeof parsed.characterStory === "string" ? parsed.characterStory : undefined,
      spellcasting,
      build,
    };
  } catch {
    return null;
  }
}
