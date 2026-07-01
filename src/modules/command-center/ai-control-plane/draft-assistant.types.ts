import type { CommandInputSource } from "../types/workspace";
import type { CommandInputVoicePayload } from "../voice/command-input-voice";

export type DraftAssistantInputSource = Extract<CommandInputSource, "text" | "voice">;

export type RunAiDraftAssistantParams = {
  message: string;
  campaignId?: string | null;
  noteId?: string | null;
  source?: DraftAssistantInputSource;
  transcript?: string | null;
  language?: string;
  voiceMetadata?: CommandInputVoicePayload["metadata"];
};

export type ChatPendingPhase = "text" | "awaiting_image";

export type ChatWikiMeta = {
  entityType: string;
  entityTitle: string;
  userPrompt: string;
  markdownDraft: {
    description: string;
    statblock: string;
    npcTraits?: { race: string | null; class: string | null; age: string | null };
  };
  chatMessages: { role: "user" | "assistant"; content: string }[];
};

export type ChatPendingProposalPayload = {
  action_name: string;
  input: Record<string, unknown>;
  rationale: string | null;
  preview_payload: Record<string, unknown>;
  phase?: ChatPendingPhase;
  wikiMeta?: ChatWikiMeta;
};

export type RunAiChatAssistantParams = RunAiDraftAssistantParams & {
  pendingProposal?: ChatPendingProposalPayload | null;
};
