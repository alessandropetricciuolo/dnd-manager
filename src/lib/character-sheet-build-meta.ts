import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";

/** Campi build da sincronizzare tra generatore scheda e creazione/modifica PG. */
export type GeneratedSheetBuildMeta = {
  raceSlug: string;
  subclassSlug: string | null;
  characterClass: string;
  classSubclass: string | null;
  backgroundSlug: string;
  level: number;
};

export type CharacterFormBuildDraft = {
  name?: string;
  race_slug?: string;
  subclass_slug?: string;
  character_class?: string;
  class_subclass?: string;
  background_slug?: string;
  level?: string;
};

/** Mappa il form del generatore alle chiavi del dialog creazione/modifica PG. */
export function mapGeneratorFormToCharacterBuildDraft(
  form: HTMLFormElement | null,
  sheet?: GeneratedCharacterSheet | null
): CharacterFormBuildDraft {
  const fd = form ? new FormData(form) : null;
  const levelRaw =
    (fd?.get("level") as string | null)?.trim() ||
    (sheet?.level != null ? String(sheet.level) : "") ||
    "1";
  const parsedLevel = Number.parseInt(levelRaw, 10);
  const level =
    Number.isFinite(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 20
      ? String(parsedLevel)
      : "1";

  return {
    name: (fd?.get("characterName") as string | null)?.trim() ?? sheet?.characterName ?? "",
    race_slug: (fd?.get("raceSlug") as string | null)?.trim() ?? "",
    subclass_slug: (fd?.get("subraceSlug") as string | null)?.trim() ?? "",
    character_class: (fd?.get("classLabel") as string | null)?.trim() ?? sheet?.classLabel ?? "",
    class_subclass: (fd?.get("classSubclass") as string | null)?.trim() ?? "",
    background_slug: (fd?.get("backgroundSlug") as string | null)?.trim() ?? "",
    level,
  };
}

export function parseGeneratedSheetBuildMeta(
  form: HTMLFormElement | null,
  sheet: GeneratedCharacterSheet
): GeneratedSheetBuildMeta | null {
  const draft = mapGeneratorFormToCharacterBuildDraft(form, sheet);
  const raceSlug = draft.race_slug?.trim() ?? "";
  const characterClass = draft.character_class?.trim() ?? "";
  const backgroundSlug = draft.background_slug?.trim() ?? "";
  if (!raceSlug || !characterClass || !backgroundSlug) return null;

  const level = Number.parseInt(draft.level ?? "1", 10);
  return {
    raceSlug,
    subclassSlug: draft.subclass_slug?.trim() || null,
    characterClass,
    classSubclass: draft.class_subclass?.trim() || null,
    backgroundSlug,
    level: Number.isFinite(level) && level >= 1 && level <= 20 ? level : sheet.level,
  };
}
