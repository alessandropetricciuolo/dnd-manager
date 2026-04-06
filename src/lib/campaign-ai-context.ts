import type { Json } from "@/types/database.types";
import { normalizeExcludedWikiManualKeys } from "@/lib/manual-book-catalog";

/** I sei paletti testuali dell'Architetto (salvati nel JSON `ai_context`). */
export type CampaignAiCoreFields = {
  narrative_tone: string;
  magic_level: string;
  mechanics_focus: string;
  visual_positive: string;
  visual_negative: string;
};

/** Contesto completo persistito: paletti + manuali esclusi dal RAG wiki. */
export type CampaignAiContext = CampaignAiCoreFields & {
  excluded_manual_book_keys: string[];
};

const AI_CONTEXT_KEYS = [
  "narrative_tone",
  "magic_level",
  "mechanics_focus",
  "visual_positive",
  "visual_negative",
] as const;

/** Solo i sei paletti testuali (JSON Architetto). */
export function normalizeAiContextForSave(parsed: Record<string, unknown>): CampaignAiCoreFields | null {
  const out: Partial<CampaignAiCoreFields> = {};
  for (const k of AI_CONTEXT_KEYS) {
    const v = parsed[k];
    if (typeof v !== "string" || !v.trim()) return null;
    out[k] = v.trim();
  }
  return out as CampaignAiCoreFields;
}

/** Legge le esclusioni manuali da `campaigns.ai_context` senza richiedere i sei paletti. */
export function readExcludedManualBookKeysFromAiContextJson(value: Json | null): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value !== "object" || Array.isArray(value)) return [];
  const raw = (value as Record<string, unknown>).excluded_manual_book_keys;
  return normalizeExcludedWikiManualKeys(raw);
}

/** Legge ai_context dal DB (accetta stringhe anche vuote per la sola visualizzazione). */
export function parseCampaignAiContextFromDb(value: Json | null): CampaignAiContext | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const out: Partial<CampaignAiContext> = {};
  for (const k of AI_CONTEXT_KEYS) {
    if (typeof o[k] !== "string") return null;
    out[k] = o[k] as string;
  }
  out.excluded_manual_book_keys = normalizeExcludedWikiManualKeys(o.excluded_manual_book_keys);
  return out as CampaignAiContext;
}

/** Etichette UI solo per i sei campi Architetto (non per `excluded_manual_book_keys`). */
export const CAMPAIGN_AI_CORE_FIELD_LABELS: Record<keyof CampaignAiCoreFields, string> = {
  narrative_tone: "Tono narrativo",
  magic_level: "Livello di magia",
  mechanics_focus: "Focus meccaniche 5e",
  visual_positive: "Stile visivo (positivo)",
  visual_negative: "Vietato in immagine",
};
