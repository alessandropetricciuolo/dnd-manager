import {
  chatWikiMarkdownTextAction,
  type WikiMarkdownChatDraft,
  type WikiTextChatTurn,
} from "@/lib/actions/wiki-text-chat";
import type { WikiMarkdownEntityType, WikiMarkdownExtraParams } from "@/lib/ai/wiki-text-generator";
import { extractNpcBuildParams, mergeWikiExtraParams } from "@/lib/ai/wiki-npc-params";
import {
  resolveWikiVisibilityForAssistant,
  type WikiVisibility,
} from "./wiki-request-detector";
import { previewAction } from "../actions";
import type { PreviewedProposal } from "./preview-proposals";
import type { ChatWikiMeta } from "./draft-assistant.types";
import {
  resolveRefineUserMessage,
  selectionTargetsWikiDescription,
  selectionTargetsWikiStatblock,
  type PreviewTextSelection,
} from "./preview-text-selection";
import { isPlaceholderWikiTitle } from "@/lib/ai/contextual-names";

const WIKI_MARKDOWN_TYPES = new Set<string>([
  "npc",
  "location",
  "item",
  "lore",
  "monster",
  "magic_item",
]);

export function isWikiMarkdownEntityType(type: string): type is WikiMarkdownEntityType {
  return WIKI_MARKDOWN_TYPES.has(type);
}

export function supportsWikiContextualImage(type: string): type is "npc" | "location" | "monster" {
  return type === "npc" || type === "location" || type === "monster";
}

export function buildWikiEntityInput(
  campaignId: string,
  entityType: WikiMarkdownEntityType,
  title: string,
  draft: WikiMarkdownChatDraft,
  options?: { visibility?: WikiVisibility; imageUrl?: string | null }
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    campaignId,
    title,
    type: entityType,
    content: draft.description.trim(),
    visibility: options?.visibility ?? "secret",
  };

  const attributes: Record<string, unknown> = {};
  if (draft.statblock.trim() && (entityType === "npc" || entityType === "monster")) {
    attributes.statblock = draft.statblock.trim();
  }
  if (entityType === "npc" && draft.npcTraits) {
    if (draft.npcTraits.race) attributes.race = draft.npcTraits.race;
    if (draft.npcTraits.class) attributes.class = draft.npcTraits.class;
    if (draft.npcTraits.age) attributes.age = draft.npcTraits.age;
  }
  if (Object.keys(attributes).length > 0) {
    input.attributes = attributes;
  }
  if (options?.imageUrl) {
    input.imageUrl = options.imageUrl;
  }

  return input;
}

function formatWikiDraftForPreview(
  title: string,
  entityType: string,
  draft: WikiMarkdownChatDraft,
  visibility: WikiVisibility
): Record<string, unknown> {
  const visibilityLabel =
    visibility === "public"
      ? "Pubblico"
      : visibility === "selective"
        ? "Selettivo"
        : "Segreto (solo GM)";
  const parts = [draft.description.trim()];
  if (draft.statblock.trim()) {
    parts.push(`---\n\n**Meccanica**\n\n${draft.statblock.trim()}`);
  }
  return {
    name: title,
    type: entityType,
    title,
    content: parts.join("\n\n"),
    contentMarkdown: parts.join("\n\n"),
    visibility,
    visibilityLabel,
  };
}

export async function enrichWikiEntityProposal(
  campaignId: string,
  userMessage: string,
  entityType: WikiMarkdownEntityType,
  title: string,
  options?: {
    refine?: boolean;
    wikiMeta?: ChatWikiMeta | null;
    extraParams?: WikiMarkdownExtraParams;
    previousVisibility?: string | null;
    previewTextSelection?: PreviewTextSelection | null;
  }
): Promise<
  | {
      ok: true;
      proposal: PreviewedProposal;
      wikiMeta: ChatWikiMeta;
      assistantMessage: string;
    }
  | { ok: false; error: string }
> {
  const safeTitle = title.trim();
  if (!safeTitle) {
    return { ok: false, error: "Serve un titolo per la voce wiki." };
  }

  const priorMessages = options?.wikiMeta?.chatMessages ?? [];
  const currentDraft = options?.wikiMeta?.markdownDraft ?? null;
  const userPrompt = options?.wikiMeta?.userPrompt?.trim() || userMessage.trim();

  const refineMessage = options?.refine
    ? resolveRefineUserMessage(userMessage, options.previewTextSelection)
    : userMessage.trim();

  const chatMessages: WikiTextChatTurn[] = options?.refine
    ? [...priorMessages, { role: "user", content: refineMessage }]
    : [{ role: "user", content: userMessage.trim() }];

  const extraParams = mergeWikiExtraParams(
    options?.extraParams,
    options?.wikiMeta?.npcBuildParams,
    options?.wikiMeta ? extractNpcBuildParams(options.wikiMeta.userPrompt) : null,
    extractNpcBuildParams(userMessage)
  );

  const refineFocus = options?.previewTextSelection
    ? selectionTargetsWikiStatblock(options.previewTextSelection)
      ? ("meccanica" as const)
      : selectionTargetsWikiDescription(options.previewTextSelection)
        ? ("narrativa" as const)
        : undefined
    : undefined;

  const result = await chatWikiMarkdownTextAction(
    campaignId,
    entityType,
    safeTitle,
    chatMessages,
    options?.refine ? currentDraft : null,
    extraParams,
    refineFocus ? { focus: refineFocus } : undefined
  );

  if (!result.success) {
    return { ok: false, error: result.message };
  }

  const resolvedTitle =
    result.resolvedTitle && isPlaceholderWikiTitle(safeTitle)
      ? result.resolvedTitle.trim()
      : safeTitle;

  const visibility = resolveWikiVisibilityForAssistant(
    userMessage,
    userPrompt,
    options?.previousVisibility,
    { preservePrevious: options?.refine }
  );

  const input = buildWikiEntityInput(campaignId, entityType, resolvedTitle, result.draft, {
    visibility,
  });
  const previewResult = await previewAction("wiki.entity.create", input, { actorType: "ai" });
  const preview_payload = previewResult.success
    ? {
        ...formatWikiDraftForPreview(resolvedTitle, entityType, result.draft, visibility),
        ...(previewResult.data as Record<string, unknown>),
      }
    : { error: previewResult.error };

  const wikiMeta: ChatWikiMeta = {
    entityType,
    entityTitle: resolvedTitle,
    userPrompt,
    markdownDraft: result.draft,
    chatMessages: [
      ...chatMessages,
      { role: "assistant", content: result.assistantMessage },
    ],
    npcBuildParams: extraParams,
  };

  return {
    ok: true,
    proposal: {
      action_name: "wiki.entity.create",
      input,
      rationale: null,
      preview_payload,
    },
    wikiMeta,
    assistantMessage: result.assistantMessage,
  };
}
