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

export type ChatPendingProposalPayload = {
  action_name: string;
  input: Record<string, unknown>;
  rationale: string | null;
  preview_payload: Record<string, unknown>;
};

export type RunAiChatAssistantParams = RunAiDraftAssistantParams & {
  pendingProposal?: ChatPendingProposalPayload | null;
};
