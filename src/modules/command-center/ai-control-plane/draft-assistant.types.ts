import type { SessionAiDraft } from "@/lib/ai/session-text-generator";
import type { CharacterAiStoryDraft } from "@/lib/ai/character-text-generator";
import type { CampaignAiDraft } from "@/lib/ai/campaign-text-generator";
import type { MissionAiDraft } from "@/lib/ai/mission-text-generator";
import type { CommandInputSource } from "../types/workspace";
import type { CommandInputVoicePayload } from "../voice/command-input-voice";
import type { PreviewTextSelection } from "./preview-text-selection";

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

export type ChatPendingPhase =
  | "text"
  | "awaiting_campaign_type"
  | "awaiting_sheet"
  | "awaiting_image"
  | "awaiting_avatar"
  | "awaiting_architect"
  | "awaiting_close_info";

export type CharacterGeneratedSheetPayload = {
  pdfBase64: string;
  fileName: string;
  armorClass: number;
  hitPoints: number;
  sheetData?: Record<string, unknown>;
  quickManualSections?: import("@/lib/sheet-generator/quick-manual-builder").QuickManualSection[];
  backgroundPdfSections?: import("@/lib/sheet-generator/quick-manual-builder").QuickManualSection[];
  includeBackgroundStoryInPdf?: boolean;
  characterStory?: string | null;
  spellcasting?: {
    spellSlots: Array<{ level: number; count: number }>;
    cantripsKnown: number;
    spellcastingAbility: string | null;
  } | null;
  build: {
    race_slug: string;
    subclass_slug: string;
    character_class: string;
    class_subclass: string;
    background_slug: string;
    level: string;
  };
  characterName: string;
};

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

export type ChatCampaignMeta = {
  userPrompt: string;
  draft: CampaignAiDraft;
  chatMessages: { role: "user" | "assistant"; content: string }[];
  /** Tipo scelto esplicitamente dal GM (fase iniziale). */
  typeConfirmed?: boolean;
  /** Descrizione approvata e fase copertina completata. */
  coverDecided?: boolean;
  /** Campagna già creata (retry Architect senza duplicare). */
  createdCampaignId?: string;
};

export type ChatMissionMeta = {
  userPrompt: string;
  draft: MissionAiDraft;
  chatMessages: { role: "user" | "assistant"; content: string }[];
};

export type ChatCharacterMeta = {
  userPrompt: string;
  characterName: string;
  storyDraft: CharacterAiStoryDraft;
  generatedSheet?: CharacterGeneratedSheetPayload | null;
  chatMessages: { role: "user" | "assistant"; content: string }[];
};

export type ChatRelationshipResolved = {
  sourceId: string;
  sourceName: string;
  targetId: string | null;
  targetMapId: string | null;
  targetName: string;
  targetKind: "wiki" | "map";
  label: string;
};

export type ChatRelationshipMeta = {
  userPrompt: string;
  request: {
    sourceName: string;
    targetName: string;
    label: string;
    userPrompt: string;
  };
  resolved: ChatRelationshipResolved;
  chatMessages: { role: "user" | "assistant"; content: string }[];
};

export type ChatSessionMeta = {
  userPrompt: string;
  draft: SessionAiDraft;
  partyId: string | null;
  partyLabel: string | null;
  isLongCampaign: boolean;
  chatMessages: { role: "user" | "assistant"; content: string }[];
};

import type { ChatSessionCloseMeta } from "./session-close.types";

export type { ChatSessionCloseMeta };

export type ChatPendingProposalPayload = {
  action_name: string;
  input: Record<string, unknown>;
  rationale: string | null;
  preview_payload: Record<string, unknown>;
  phase?: ChatPendingPhase;
  wikiMeta?: ChatWikiMeta;
  campaignMeta?: ChatCampaignMeta;
  missionMeta?: ChatMissionMeta;
  characterMeta?: ChatCharacterMeta;
  relationshipMeta?: ChatRelationshipMeta;
  sessionMeta?: ChatSessionMeta;
  sessionCloseMeta?: ChatSessionCloseMeta;
};

export type RunAiChatAssistantParams = RunAiDraftAssistantParams & {
  pendingProposal?: ChatPendingProposalPayload | null;
  recentUserMessages?: string[];
  previewTextSelection?: PreviewTextSelection | null;
};
