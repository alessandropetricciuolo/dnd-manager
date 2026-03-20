import type { Json } from "@/types/database.types";

export type CampaignAiContext = {
  narrative_tone: string;
  magic_level: string;
  mechanics_focus: string;
  visual_positive: string;
  visual_negative: string;
};

const AI_CONTEXT_KEYS = [
  "narrative_tone",
  "magic_level",
  "mechanics_focus",
  "visual_positive",
  "visual_negative",
] as const;

/** Normalizza le chiavi richieste per il salvataggio (nessuna stringa vuota). */
export function normalizeAiContextForSave(parsed: Record<string, unknown>): CampaignAiContext | null {
  const out: Partial<CampaignAiContext> = {};
  for (const k of AI_CONTEXT_KEYS) {
    const v = parsed[k];
    if (typeof v !== "string" || !v.trim()) return null;
    out[k] = v.trim();
  }
  return out as CampaignAiContext;
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
  return out as CampaignAiContext;
}
