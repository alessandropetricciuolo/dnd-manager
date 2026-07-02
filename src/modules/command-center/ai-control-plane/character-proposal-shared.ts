import type {
  ChatCharacterMeta,
  CharacterGeneratedSheetPayload,
  ChatPendingProposalPayload,
} from "./draft-assistant.types";
import type { PreviewedProposal } from "./preview-proposals";

function ensureString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function formatCharacterStoryForChat(
  name: string,
  draft: { characterStory: string }
): string {
  return [`**${name}** — bozza storia`, "", draft.characterStory].join("\n");
}

export function mergeCharacterInputFromSheet(
  baseInput: Record<string, unknown>,
  campaignId: string,
  sheet: CharacterGeneratedSheetPayload
): Record<string, unknown> {
  const level = Number.parseInt(sheet.build.level, 10);
  return {
    ...baseInput,
    campaignId,
    name: sheet.characterName || baseInput.name,
    characterClass: sheet.build.character_class || null,
    classSubclass: sheet.build.class_subclass || null,
    raceSlug: sheet.build.race_slug || null,
    race_slug: sheet.build.race_slug || null,
    subclass_slug: sheet.build.subclass_slug || null,
    background_slug: sheet.build.background_slug || null,
    level: Number.isFinite(level) && level >= 1 ? level : 1,
    background: sheet.characterStory ?? baseInput.background ?? null,
    armorClass: sheet.armorClass,
    hitPoints: sheet.hitPoints,
    generatedSheetPdfBase64: sheet.pdfBase64,
    generatedSheetFileName: sheet.fileName,
    generatedSheetArmorClass: sheet.armorClass,
    generatedSheetHitPoints: sheet.hitPoints,
    generatedSheetSpellcasting: sheet.spellcasting ? JSON.stringify(sheet.spellcasting) : null,
  };
}

export function buildCharacterPreviewPayload(
  characterMeta: ChatCharacterMeta
): Record<string, unknown> {
  const { storyDraft, characterName, generatedSheet } = characterMeta;
  return {
    name: characterName,
    title: characterName,
    characterStory: storyDraft.characterStory,
    contentMarkdown: formatCharacterStoryForChat(characterName, storyDraft),
    assistantPreview: formatCharacterStoryForChat(characterName, storyDraft),
    sheetReady: Boolean(generatedSheet),
    sheetFileName: generatedSheet?.fileName ?? null,
    armorClass: generatedSheet?.armorClass ?? null,
    hitPoints: generatedSheet?.hitPoints ?? null,
  };
}

export function attachGeneratedSheetToCharacterProposal(
  pending: ChatPendingProposalPayload | (PreviewedProposal & { characterMeta?: ChatCharacterMeta | null }),
  campaignId: string,
  sheet: CharacterGeneratedSheetPayload
): {
  proposal: PreviewedProposal;
  characterMeta: ChatCharacterMeta;
} {
  const characterMeta: ChatCharacterMeta = {
    userPrompt: pending.characterMeta?.userPrompt ?? "",
    characterName: sheet.characterName || ensureString(pending.input.name, "Nuovo personaggio"),
    storyDraft: pending.characterMeta?.storyDraft ?? {
      characterStory: sheet.characterStory?.trim() || String(pending.input.background ?? ""),
    },
    generatedSheet: sheet,
    chatMessages: pending.characterMeta?.chatMessages ?? [],
  };

  const input = mergeCharacterInputFromSheet(
    { ...pending.input, name: characterMeta.characterName, background: characterMeta.storyDraft.characterStory },
    campaignId,
    sheet
  );

  return {
    proposal: {
      action_name: pending.action_name,
      input,
      rationale: pending.rationale,
      preview_payload: {
        ...buildCharacterPreviewPayload(characterMeta),
        ...(pending.preview_payload ?? {}),
        sheetReady: true,
      },
    },
    characterMeta,
  };
}
