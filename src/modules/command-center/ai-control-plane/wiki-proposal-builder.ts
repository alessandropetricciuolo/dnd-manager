import {
  chatWikiMarkdownTextAction,
  type WikiMarkdownChatDraft,
  type WikiTextChatTurn,
} from "@/lib/actions/wiki-text-chat";
import type { WikiMarkdownEntityType, WikiMarkdownExtraParams } from "@/lib/ai/wiki-text-generator";
import { extractNpcBuildParams, mergeWikiExtraParams } from "@/lib/ai/wiki-npc-params";
import { previewAction } from "../actions";
import type { PreviewedProposal } from "./preview-proposals";
import type { ChatWikiMeta } from "./draft-assistant.types";

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
  imageUrl?: string | null
): Record<string, unknown> {
  const input: Record<string, unknown> = {
    campaignId,
    title,
    type: entityType,
    content: draft.description.trim(),
    visibility: "public",
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
  if (imageUrl) {
    input.imageUrl = imageUrl;
  }

  return input;
}

function formatWikiDraftForPreview(
  title: string,
  entityType: string,
  draft: WikiMarkdownChatDraft
): Record<string, unknown> {
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

  const chatMessages: WikiTextChatTurn[] = options?.refine
    ? [...priorMessages, { role: "user", content: userMessage.trim() }]
    : [{ role: "user", content: userMessage.trim() }];

  const extraParams = mergeWikiExtraParams(
    options?.extraParams,
    options?.wikiMeta ? extractNpcBuildParams(options.wikiMeta.userPrompt) : null,
    extractNpcBuildParams(userMessage)
  );

  const result = await chatWikiMarkdownTextAction(
    campaignId,
    entityType,
    safeTitle,
    chatMessages,
    options?.refine ? currentDraft : null,
    extraParams
  );

  if (!result.success) {
    return { ok: false, error: result.message };
  }

  const input = buildWikiEntityInput(campaignId, entityType, safeTitle, result.draft);
  const previewResult = await previewAction("wiki.entity.create", input, { actorType: "ai" });
  const preview_payload = previewResult.success
    ? {
        ...formatWikiDraftForPreview(safeTitle, entityType, result.draft),
        ...(previewResult.data as Record<string, unknown>),
      }
    : { error: previewResult.error };

  const wikiMeta: ChatWikiMeta = {
    entityType,
    entityTitle: safeTitle,
    userPrompt,
    markdownDraft: result.draft,
    chatMessages: [
      ...chatMessages,
      { role: "assistant", content: result.assistantMessage },
    ],
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
