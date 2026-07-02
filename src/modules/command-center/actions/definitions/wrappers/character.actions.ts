import { createCharacter, updateCharacter } from "@/app/campaigns/character-actions";
import { registerAction } from "../../registry";

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim() || null : null;
}

type CharacterActionInput = {
  campaignId: string;
  characterId: string;
  name: string;
  characterClass: string | null;
  classSubclass: string | null;
  level: number;
  background: string | null;
  raceSlug: string | null;
  subclassSlug: string | null;
  backgroundSlug: string | null;
  armorClass: number | null;
  hitPoints: number | null;
  imageUrl: string | null;
  avatarImageBase64: string | null;
  avatarImageMimeType: string | null;
  generatedSheetPdfBase64: string | null;
  generatedSheetFileName: string | null;
  generatedSheetSpellcasting: string | null;
};

function parseCharacterBase(
  o: Record<string, unknown>,
  requireId = false
): { ok: true; data: CharacterActionInput } | { ok: false; error: string } {
  const campaignId = typeof o.campaignId === "string" ? o.campaignId.trim() : "";
  const characterId = typeof o.characterId === "string" ? o.characterId.trim() : "";
  const name = typeof o.name === "string" ? o.name.trim() : "";
  if (!campaignId) return { ok: false as const, error: "Campagna obbligatoria." };
  if (!name) return { ok: false as const, error: "Nome personaggio obbligatorio." };
  if (requireId && !characterId) return { ok: false as const, error: "ID personaggio obbligatorio." };

  const levelRaw = o.level;
  const level =
    typeof levelRaw === "number"
      ? levelRaw
      : typeof levelRaw === "string" && levelRaw.trim()
        ? Number.parseInt(levelRaw, 10)
        : 1;

  const armorClass =
    typeof o.armorClass === "number"
      ? o.armorClass
      : typeof o.armor_class === "number"
        ? o.armor_class
        : typeof o.generatedSheetArmorClass === "number"
          ? o.generatedSheetArmorClass
          : null;

  const hitPoints =
    typeof o.hitPoints === "number"
      ? o.hitPoints
      : typeof o.hit_points === "number"
        ? o.hit_points
        : typeof o.generatedSheetHitPoints === "number"
          ? o.generatedSheetHitPoints
          : null;

  return {
    ok: true as const,
    data: {
      campaignId,
      characterId,
      name,
      characterClass: optionalString(o.characterClass ?? o.character_class),
      classSubclass: optionalString(o.classSubclass ?? o.class_subclass),
      level: Number.isFinite(level) && level >= 1 ? level : 1,
      background: optionalString(o.background),
      raceSlug: optionalString(o.raceSlug ?? o.race_slug),
      subclassSlug: optionalString(o.subclass_slug),
      backgroundSlug: optionalString(o.background_slug),
      armorClass,
      hitPoints,
      imageUrl: optionalString(o.imageUrl ?? o.image_url),
      avatarImageBase64: optionalString(o.avatarImageBase64),
      avatarImageMimeType: optionalString(o.avatarImageMimeType),
      generatedSheetPdfBase64: optionalString(o.generatedSheetPdfBase64),
      generatedSheetFileName: optionalString(o.generatedSheetFileName),
      generatedSheetSpellcasting: optionalString(o.generatedSheetSpellcasting),
    },
  };
}

function toCharacterFormData(data: CharacterActionInput): FormData {
  const fd = new FormData();
  fd.set("name", data.name);
  if (data.characterClass) fd.set("character_class", data.characterClass);
  if (data.classSubclass) fd.set("class_subclass", data.classSubclass);
  fd.set("level", String(data.level));
  if (data.background) fd.set("background", data.background);
  if (data.raceSlug) fd.set("race_slug", data.raceSlug);
  if (data.subclassSlug) fd.set("subclass_slug", data.subclassSlug);
  if (data.backgroundSlug) fd.set("background_slug", data.backgroundSlug);
  if (data.armorClass != null) fd.set("armor_class", String(data.armorClass));
  if (data.hitPoints != null) fd.set("hit_points", String(data.hitPoints));
  if (data.imageUrl) fd.set("image_url", data.imageUrl);
  if (data.avatarImageBase64) fd.set("avatar_image_base64", data.avatarImageBase64);
  if (data.avatarImageMimeType) fd.set("avatar_image_mime_type", data.avatarImageMimeType);
  if (data.generatedSheetPdfBase64) {
    fd.set("generated_sheet_pdf_base64", data.generatedSheetPdfBase64);
    fd.set(
      "generated_sheet_file_name",
      data.generatedSheetFileName?.trim() || `${data.name}-compilata.pdf`
    );
    if (data.armorClass != null) fd.set("generated_sheet_armor_class", String(data.armorClass));
    if (data.hitPoints != null) fd.set("generated_sheet_hit_points", String(data.hitPoints));
    if (data.generatedSheetSpellcasting) {
      fd.set("generated_sheet_spellcasting", data.generatedSheetSpellcasting);
    }
  }
  return fd;
}

export function registerCharacterWrapperActions(): void {
  registerAction({
    name: "character.create",
    description: "Crea un personaggio in campagna (scheda PDF generata, avatar opzionale)",
    category: "campaign",
    validate: (input) => parseCharacterBase(input as Record<string, unknown>),
    preview: async (_ctx, input) => ({
      campaignId: input.campaignId,
      name: input.name,
      characterClass: input.characterClass,
      level: input.level,
      background: input.background,
      sheetReady: Boolean(input.generatedSheetPdfBase64),
    }),
    execute: async (_ctx, input) => {
      if (!input.generatedSheetPdfBase64) {
        throw new Error(
          "Collega una scheda PDF dal generatore prima di creare il personaggio."
        );
      }
      const result = await createCharacter(input.campaignId, toCharacterFormData(input));
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    auditEntity: (_input, result) => ({
      entityType: "campaign_character",
      entityId: result.id,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });

  registerAction({
    name: "character.update",
    description: "Aggiorna un personaggio in campagna (campi testuali)",
    category: "campaign",
    validate: (input) => parseCharacterBase(input as Record<string, unknown>, true),
    preview: async (_ctx, input) => ({
      characterId: input.characterId,
      name: input.name,
      level: input.level,
      characterClass: input.characterClass,
    }),
    execute: async (_ctx, input) => {
      const result = await updateCharacter(
        input.characterId,
        input.campaignId,
        toCharacterFormData(input)
      );
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    auditEntity: (input) => ({
      entityType: "campaign_character",
      entityId: input.characterId,
    }),
    revalidatePaths: (input) => [`/campaigns/${input.campaignId}`, "/command-center"],
  });
}
