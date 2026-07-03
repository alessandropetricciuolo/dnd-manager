import { CAMPAIGN_TYPE_VALUES, type CampaignType } from "@/lib/campaign-type";
import { hasExplicitCampaignType } from "./campaign-type-selection";

export type DetectedCampaignRequest = {
  title: string;
  description: string;
  type: CampaignType | null;
  isLongCampaign: boolean;
  userPrompt: string;
};

const CAMPAIGN_VERBS =
  /\b(crea(?:mi)?|apri|avvia|genera(?:mi)?|voglio|vorrei)\b.{0,30}\b(campagna|oneshot|avventura)\b/i;
const CAMPAIGN_NOUN = /\b(?:nuova|nuovo)\s+(?:campagna|oneshot|avventura)\b/i;

function extractCampaignTitle(message: string): string | null {
  const patterns = [
    /\bcampagna\s+(?:di\s+|su\s+|chiamata\s+)?["«]([^"»]+)["»]/i,
    /\bcampagna\s+(?:di\s+|su\s+|chiamata\s+)?([A-ZÀ-Ý][\wÀ-ÿ'\- ]{2,60})/i,
    /\boneshot\s+[:\-]?\s*["«]([^"»]+)["»]/i,
    /\btitolo[:\s]+([A-ZÀ-Ý][\wÀ-ÿ'\- ]{2,60})/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    const candidate = m?.[1]?.trim();
    if (!candidate) continue;
    const cleaned = candidate
      .replace(/\s+(long|lunga|oneshot|quest|torneo)\b.*$/i, "")
      .trim();
    if (cleaned.length >= 3) return cleaned;
  }
  return null;
}

function inferCampaignType(message: string): CampaignType {
  const t = message.toLowerCase();
  if (/\b(long|lunga|campagna\s+lunga)\b/.test(t)) return "long";
  if (/\bquest\b/.test(t)) return "quest";
  if (/\btorneo\b/.test(t)) return "torneo";
  if (/\boneshot\b/.test(t)) return "oneshot";
  return "oneshot";
}

function looksLikeCampaignCreate(message: string): boolean {
  const t = message.trim();
  if (t.length < 10) return false;
  if (CAMPAIGN_VERBS.test(t)) return true;
  if (CAMPAIGN_NOUN.test(t)) return true;
  return false;
}

export function detectCampaignCreateRequest(message: string): DetectedCampaignRequest | null {
  const userPrompt = message.trim();
  if (!looksLikeCampaignCreate(userPrompt)) return null;

  const type = hasExplicitCampaignType(userPrompt) ? inferCampaignType(userPrompt) : null;
  const isLongCampaign = type === "long" || /\b(long|lunga)\b/i.test(userPrompt);

  return {
    title: extractCampaignTitle(userPrompt) ?? "Nuova campagna",
    description: userPrompt,
    type: type && CAMPAIGN_TYPE_VALUES.includes(type) ? type : null,
    isLongCampaign,
    userPrompt,
  };
}
