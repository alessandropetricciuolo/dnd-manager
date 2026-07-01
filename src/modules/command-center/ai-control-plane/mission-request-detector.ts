import { parseGuildRank } from "@/lib/missions/guild-ranks";

export type DetectedMissionRequest = {
  grade: string;
  title: string;
  committente: string;
  ubicazione: string;
  paga: string;
  urgenza: string;
  description: string;
  pointsReward: number;
  userPrompt: string;
};

const MISSION_VERBS =
  /\b(crea(?:mi)?|aggiungi|inserisci|pubblica|scrivi|genera(?:mi)?)\b.{0,40}\b(missione|incarico|quest|commissione)\b/i;
const MISSION_NOUN_FIRST = /\b(?:nuova|nuovo)\s+(?:missione|incarico|quest)\b/i;

function extractMissionTitle(message: string): string | null {
  const afterColon = message.match(/\bgrado\s+[A-S]\s*[:\-]\s*([^,]+)/i);
  if (afterColon?.[1]?.trim()) {
    const cleaned = afterColon[1].trim().replace(/\s+(committente|ubicazione|paga|urgenza)\b.*$/i, "").trim();
    if (cleaned.length >= 3) return cleaned;
  }

  const patterns = [
    /\b(?:una\s+)?missione\s+(?:di\s+)?(?:grado\s+[A-S]\s+)?[:\-]?\s*["«]([^"»]+)["»]/i,
    /\b(?:una\s+)?missione\s+(?:di\s+)?[:\-]?\s*["«]([^"»]+)["»]/i,
    /\bincarico\s+[:\-]?\s+["«]([^"»]+)["»]/i,
    /\btitolo[:\s]+([A-ZÀ-Ý][\wÀ-ÿ'\- ]{2,60})/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    const candidate = m?.[1]?.trim();
    if (!candidate) continue;
    const cleaned = candidate.replace(/\s+(committente|ubicazione|paga|urgenza)\b.*$/i, "").trim();
    if (cleaned.length >= 3) return cleaned;
  }
  return null;
}

function extractGrade(message: string): string {
  const m =
    message.match(/\bgrado\s+([A-S])\b/i) ??
    message.match(/\bmissione\s+([A-S])\b/i) ??
    message.match(/\b(?:rank|classe)\s+([A-S])\b/i);
  if (m?.[1]) return parseGuildRank(m[1]);
  return "C";
}

function extractField(message: string, keys: RegExp): string | null {
  const m = message.match(keys);
  return m?.[1]?.trim() || null;
}

function looksLikeMissionCreate(message: string): boolean {
  const t = message.trim();
  if (t.length < 10) return false;
  if (MISSION_VERBS.test(t)) return true;
  if (MISSION_NOUN_FIRST.test(t)) return true;
  if (/\bbacheca\s+(?:della\s+)?gilda\b/i.test(t) && /\bmissione\b/i.test(t)) return true;
  return false;
}

export function detectMissionCreateRequest(message: string): DetectedMissionRequest | null {
  const userPrompt = message.trim();
  if (!looksLikeMissionCreate(userPrompt)) return null;

  const grade = extractGrade(userPrompt);
  const title = extractMissionTitle(userPrompt) ?? "Nuova missione";
  const committente =
    extractField(userPrompt, /\bcommittente\s*[:\-]?\s*([^,.;\n]+)/i) ??
    extractField(userPrompt, /\bgilda\s+(?:dei|degli|delle|di)\s+([^,.;\n]+)/i) ??
    "Da definire";
  const ubicazione =
    extractField(userPrompt, /\b(?:ubicazione|luogo|a|in)\s*[:\-]?\s*([^,.;\n]+)/i) ?? "Da definire";
  const paga =
    extractField(userPrompt, /\b(?:paga|ricompensa|reward)\s*[:\-]?\s*([^,.;\n]+)/i) ?? "Da definire";
  const urgenza =
    extractField(userPrompt, /\burgenza\s*[:\-]?\s*([^,.;\n]+)/i) ??
    (/\burgent/i.test(userPrompt) ? "Alta" : "Normale");

  const description =
    extractField(userPrompt, /\b(?:descrizione|dettagli|obiettivo)\s*[:\-]?\s*([\s\S]+)/i) ?? userPrompt;

  const pointsMatch = userPrompt.match(/\b(\d{1,4})\s*punti\b/i);
  const pointsReward = pointsMatch ? Number.parseInt(pointsMatch[1]!, 10) : 0;

  return {
    grade,
    title,
    committente,
    ubicazione,
    paga,
    urgenza,
    description,
    pointsReward: Number.isFinite(pointsReward) ? pointsReward : 0,
    userPrompt,
  };
}
