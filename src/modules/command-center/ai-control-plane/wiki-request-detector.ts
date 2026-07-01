import type { WikiMarkdownEntityType } from "@/lib/ai/wiki-text-generator";
import type { WikiMarkdownExtraParams } from "@/lib/ai/wiki-text-generator";
import { extractNpcBuildParams, mergeWikiExtraParams } from "@/lib/ai/wiki-npc-params";

export type DetectedWikiRequest = {
  entityType: WikiMarkdownEntityType;
  title: string;
  userPrompt: string;
  extraParams: WikiMarkdownExtraParams;
};

export { extractNpcBuildParams, hasNpcMechanicsParams, mergeWikiExtraParams } from "@/lib/ai/wiki-npc-params";

const NPC_VERBS =
  /\b(crea(?:mi)?|genera(?:mi)?|voglio|vorrei|ho\s+bisogno|fammi|scrivi)\b/i;
const NPC_ROLES =
  /\b(npc|png|personaggio|pgn|locandier|pescivendol|mercante|guard|capo|sacerdot|strega|mago|ladro|barbaro|guerriero|halfling|elfo|nano|umano|mezzelfo|tiefling|drow|dragonide)\b/i;
const LOCATION_HINTS =
  /\b(luogo|location|taverna|locanda|porto|città|citta|villaggio|dungeon|fortezza|tempio|mercato|piazza)\b/i;
const LORE_HINTS = /\b(lore|storia|leggenda|mito|cronaca|background)\b/i;
const MONSTER_HINTS = /\b(mostro|monster|creatura|bestia|drago|demone)\b/i;
const ITEM_HINTS = /\b(oggetto|item|arma|armatura|artefatto|reliquia|pozione)\b/i;

function capitalizeName(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function extractTitle(message: string): string | null {
  const patterns = [
    /\bgenera(?:mi)?\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]{1,40})\b/i,
    /\bcrea(?:mi)?\s+(?:un[a']?\s+)?(?:npc\s+)?([A-Za-zÀ-ÿ][\wÀ-ÿ'-]{1,40})\b/i,
    /\b(?:npc|png)\s+(?:di\s+nome\s+)?([A-Za-zÀ-ÿ][\wÀ-ÿ'-]{1,40})\b/i,
    /\bsi\s+chiama\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]{1,40})\b/i,
    /\bnome[:\s]+([A-Za-zÀ-ÿ][\wÀ-ÿ'-]{1,40})\b/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    const candidate = m?.[1]?.trim();
    if (!candidate) continue;
    const skip = new Set([
      "un",
      "una",
      "npc",
      "png",
      "personaggio",
      "halfling",
      "elfo",
      "nano",
      "umano",
      "barbaro",
      "guerriero",
      "il",
      "la",
      "lo",
    ]);
    if (skip.has(candidate.toLowerCase())) continue;
    return capitalizeName(candidate);
  }
  return null;
}

function inferEntityType(message: string): WikiMarkdownEntityType {
  if (MONSTER_HINTS.test(message)) return "monster";
  if (ITEM_HINTS.test(message)) return "item";
  if (LORE_HINTS.test(message)) return "lore";
  if (LOCATION_HINTS.test(message) && !NPC_ROLES.test(message)) return "location";
  return "npc";
}

function looksLikeWikiCreate(message: string): boolean {
  const t = message.trim();
  if (t.length < 8) return false;
  if (NPC_VERBS.test(t) && (NPC_ROLES.test(t) || LOCATION_HINTS.test(t) || extractTitle(t))) {
    return true;
  }
  if (/\bgenerami\s+\w+/i.test(t)) return true;
  if (/\bcrea(?:mi)?\s+(?:un[a']?\s+)?(?:npc|png|luogo|voce\s+wiki)/i.test(t)) return true;
  if (NPC_ROLES.test(t) && t.length > 40) return true;
  return false;
}

export function detectWikiCreateRequest(message: string): DetectedWikiRequest | null {
  const userPrompt = message.trim();
  if (!looksLikeWikiCreate(userPrompt)) return null;

  const entityType = inferEntityType(userPrompt);
  const title =
    extractTitle(userPrompt) ??
    (entityType === "location" ? "Nuovo luogo" : entityType === "npc" ? "Nuovo NPC" : "Nuova voce");

  return {
    entityType,
    title,
    userPrompt,
    extraParams: entityType === "npc" ? extractNpcBuildParams(userPrompt) : {},
  };
}
