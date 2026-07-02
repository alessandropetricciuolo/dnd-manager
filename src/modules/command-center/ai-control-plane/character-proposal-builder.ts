import {
  generateCharacterStoryFromPrompt,
  refineCharacterStoryFromPrompt,
} from "@/lib/ai/character-text-generator";
import { previewAction } from "../actions";
import type { ChatCharacterMeta } from "./draft-assistant.types";
import {
  buildCharacterPreviewPayload,
  mergeCharacterInputFromSheet,
} from "./character-proposal-shared";
import type { PreviewedProposal } from "./preview-proposals";
import { resolveRefineUserMessage, type PreviewTextSelection } from "./preview-text-selection";

function ensureString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export {
  attachGeneratedSheetToCharacterProposal,
  buildCharacterPreviewPayload,
  mergeCharacterInputFromSheet,
} from "./character-proposal-shared";

export async function enrichCharacterProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal,
  options?: {
    refine?: boolean;
    characterMeta?: ChatCharacterMeta | null;
    previewTextSelection?: PreviewTextSelection | null;
  }
): Promise<
  | {
      ok: true;
      proposal: PreviewedProposal;
      characterMeta: ChatCharacterMeta;
      assistantMessage: string;
    }
  | { ok: false; error: string }
> {
  const characterName = ensureString(
    options?.characterMeta?.characterName ?? proposal.input.name,
    "Nuovo personaggio"
  );
  const userPrompt = options?.characterMeta?.userPrompt?.trim() || userMessage.trim();
  if (!userPrompt) {
    return { ok: false, error: "Descrivi il personaggio che vuoi creare." };
  }

  const refineMessage = options?.refine
    ? resolveRefineUserMessage(userMessage, options.previewTextSelection)
    : userMessage.trim();

  const chatMessages = options?.refine
    ? [...(options.characterMeta?.chatMessages ?? []), { role: "user" as const, content: refineMessage }]
    : [{ role: "user" as const, content: userMessage.trim() }];

  const generated =
    options?.refine && options.characterMeta?.storyDraft
      ? await refineCharacterStoryFromPrompt(
          campaignId,
          refineMessage,
          options.characterMeta.storyDraft.characterStory,
          characterName
        )
      : await generateCharacterStoryFromPrompt(campaignId, userPrompt, characterName);

  if (!generated.ok) {
    return { ok: false, error: generated.error };
  }

  const characterMeta: ChatCharacterMeta = {
    userPrompt,
    characterName,
    storyDraft: generated.draft,
    generatedSheet: options?.characterMeta?.generatedSheet ?? null,
    chatMessages: [
      ...chatMessages,
      { role: "assistant", content: generated.assistantMessage },
    ],
  };

  const input: Record<string, unknown> = {
    ...proposal.input,
    campaignId,
    name: characterName,
    background: generated.draft.characterStory,
    level: typeof proposal.input.level === "number" ? proposal.input.level : 1,
  };

  if (characterMeta.generatedSheet) {
    Object.assign(input, mergeCharacterInputFromSheet(input, campaignId, characterMeta.generatedSheet));
  }

  const previewResult = await previewAction("character.create", input, { actorType: "ai" });
  const preview_payload = previewResult.success
    ? { ...buildCharacterPreviewPayload(characterMeta), ...(previewResult.data as Record<string, unknown>) }
    : { error: previewResult.error, ...buildCharacterPreviewPayload(characterMeta) };

  return {
    ok: true,
    proposal: {
      action_name: "character.create",
      input,
      rationale: proposal.rationale,
      preview_payload,
    },
    characterMeta,
    assistantMessage: [
      generated.assistantMessage,
      "",
      "_Nel pannello a destra compila razza, classe e background nel generatore scheda, poi premi «Usa questa scheda»._",
    ].join("\n"),
  };
}
