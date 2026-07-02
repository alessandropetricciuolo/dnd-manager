import type { SessionEconomyPayload } from "@/lib/actions/campaign-economy-actions";
import type { SessionCloseAiDraft } from "@/lib/ai/session-close-text-generator";

export type SessionCloseMissingField = {
  id: string;
  severity: "blocking" | "info";
  question: string;
};

export type SessionCloseResolvedDraft = {
  summary: string;
  gmPrivateNotes: string | null;
  xpGained: number;
  perPlayerXpAwards: { playerId: string; playerName: string; xp: number }[];
  elapsedHours: number;
  attendance: Record<string, "attended" | "absent">;
  entityStatusUpdates: Record<string, "alive" | "dead" | "missing">;
  unlockContent: boolean;
  unlockContentIds: { id: string; type: "wiki" | "map"; name: string }[];
  economy?: SessionEconomyPayload;
};

export type ChatSessionCloseMeta = {
  userPrompt: string;
  sessionId: string;
  sessionLabel: string;
  campaignId: string;
  isLongCampaign: boolean;
  isPreClosed: boolean;
  aiDraft: SessionCloseAiDraft;
  resolved: SessionCloseResolvedDraft;
  missingFields: SessionCloseMissingField[];
  wizardEconomyUrl: string;
  chatMessages: { role: "user" | "assistant"; content: string }[];
};
