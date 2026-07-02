import { formatInTimeZone } from "date-fns-tz";
import { generateOpenRouterChat } from "@/lib/ai/openrouter-client";
import { buildCampaignContextBlock } from "@/lib/campaign-context-prompt";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";
import { SESSION_DISPLAY_TIMEZONE } from "@/lib/session-datetime";
import { extractJsonObject } from "@/modules/command-center/ai-control-plane/interpreter";
import {
  tryParseLooseItalianDate,
  type DetectedSessionRequest,
} from "@/modules/command-center/ai-control-plane/session-request-detector";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";

export type SessionAiDraft = {
  date: string;
  time: string;
  chapterTitle: string | null;
  location: string;
  partyName: string | null;
  maxPlayers: number;
};

export type SessionDraftHints = Partial<SessionAiDraft>;

const CREATE_SYSTEM_PROMPT = `Sei l'assistente di un Game Master D&D 5e che programma sessioni di gioco.

Dal messaggio del Master estrai i dettagli della sessione da creare.

Rispondi SOLO con JSON valido:
{
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "chapter_title": "titolo capitolo o null (solo campagne long)",
  "location": "luogo/note sessione (es. sede, Discord, indirizzo) — stringa vuota se non specificato",
  "party_name": "nome gruppo/party o null",
  "max_players": 6
}

Regole:
- Usa la data di riferimento fornita per interpretare «domani», «venerdì prossimo», «15 marzo», ecc.
- time in formato 24h (default 20:00 se non indicato)
- max_players tra 1 e 20
- chapter_title solo se il Master menziona un capitolo o arco narrativo
- Scrivi in italiano per i testi descrittivi`;

const REFINE_SYSTEM_PROMPT = `Aggiorna i dettagli della sessione in base alle richieste del Master.

Rispondi SOLO con JSON: date, time, chapter_title, location, party_name, max_players (stesse regole della creazione).`;

function ensureString(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw.trim() : fallback;
}

function normalizeTime(raw: unknown, fallback = "20:00"): string {
  const value = typeof raw === "string" ? raw.trim() : fallback;
  const m = value.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return fallback;
  const h = Number.parseInt(m[1]!, 10);
  const mi = m[2] ? Number.parseInt(m[2], 10) : 0;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return fallback;
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

function normalizeDate(raw: unknown, hints?: SessionDraftHints): string | null {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim();
  }
  if (typeof raw === "string") {
    const loose = tryParseLooseItalianDate(raw);
    if (loose) return loose;
  }
  if (hints?.date && /^\d{4}-\d{2}-\d{2}$/.test(hints.date)) return hints.date;
  return null;
}

function normalizeMaxPlayers(raw: unknown, fallback = 6): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(1, Math.min(20, Math.trunc(raw)));
  }
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed)) return Math.max(1, Math.min(20, parsed));
  }
  return fallback;
}

function optionalNullableString(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const value = typeof raw === "string" ? raw.trim() : "";
  return value.length ? value : null;
}

export function parseSessionDraftJson(
  raw: string,
  hints?: SessionDraftHints
): { ok: true; data: SessionAiDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return { ok: false, error: "Il modello non ha restituito JSON valido per la sessione." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Risposta sessione non è un oggetto JSON." };
  }

  const o = parsed as Record<string, unknown>;
  const date = normalizeDate(o.date, hints);
  if (!date) {
    return { ok: false, error: "Data sessione mancante o non valida (servono formato YYYY-MM-DD)." };
  }

  const time = normalizeTime(o.time, hints?.time ?? "20:00");
  const chapterTitle =
    optionalNullableString(o.chapter_title) ?? hints?.chapterTitle ?? null;
  const location = ensureString(o.location, hints?.location ?? "");
  const partyName = optionalNullableString(o.party_name) ?? hints?.partyName ?? null;
  const maxPlayers = normalizeMaxPlayers(o.max_players, hints?.maxPlayers ?? 6);

  return {
    ok: true,
    data: { date, time, chapterTitle, location, partyName, maxPlayers },
  };
}

export function sessionHintsFromInput(input: Record<string, unknown>): SessionDraftHints {
  const hints: SessionDraftHints = {};
  if (typeof input.date === "string" && input.date.trim()) hints.date = input.date.trim();
  if (typeof input.time === "string" && input.time.trim()) hints.time = input.time.trim();
  if (typeof input.chapterTitle === "string" && input.chapterTitle.trim()) {
    hints.chapterTitle = input.chapterTitle.trim();
  }
  if (typeof input.location === "string") hints.location = input.location.trim();
  if (typeof input.partyName === "string" && input.partyName.trim()) {
    hints.partyName = input.partyName.trim();
  }
  if (typeof input.maxPlayers === "number" && Number.isFinite(input.maxPlayers)) {
    hints.maxPlayers = Math.max(1, Math.min(20, Math.trunc(input.maxPlayers)));
  }
  return hints;
}

export function formatSessionDraftForChat(draft: SessionAiDraft, partyLabel?: string | null): string {
  const lines = [
    `**Sessione** — ${draft.date} ore ${draft.time}`,
    draft.chapterTitle ? `Capitolo: ${draft.chapterTitle}` : null,
    partyLabel ? `Party: ${partyLabel}` : draft.partyName ? `Party: ${draft.partyName}` : null,
    draft.location ? `Luogo: ${draft.location}` : null,
    `Posti: ${draft.maxPlayers}`,
  ].filter(Boolean);
  return lines.join("\n");
}

async function loadSessionGenerationContext(campaignId: string): Promise<{
  context: string;
  isLongCampaign: boolean;
}> {
  const admin = createSupabaseAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("name, description, type, ai_context")
    .eq("id", campaignId)
    .maybeSingle();

  const todayRome = formatInTimeZone(new Date(), SESSION_DISPLAY_TIMEZONE, "yyyy-MM-dd (EEEE)", {
    locale: undefined,
  });

  if (!campaign) {
    return {
      isLongCampaign: false,
      context: `Data di riferimento (Europe/Rome): ${todayRome}\nFantasy D&D 5e.`,
    };
  }

  const row = campaign as {
    name?: string | null;
    description?: string | null;
    type?: string | null;
    ai_context?: Json | null;
  };

  const blocks = [`Data di riferimento (Europe/Rome): ${todayRome}`];
  if (row.name?.trim()) blocks.push(`Campagna: ${row.name.trim()}`);
  if (row.description?.trim()) blocks.push(`Sinossi:\n${row.description.trim()}`);
  blocks.push(buildCampaignContextBlock(parseCampaignAiContextFromDb(row.ai_context ?? null)));

  const isLongCampaign = row.type === "long";
  if (isLongCampaign) {
    const wiki = await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId);
    if (wiki.trim()) blocks.push(wiki);
  }

  return { context: blocks.join("\n\n"), isLongCampaign };
}

function formatHintsBlock(hints: SessionDraftHints | undefined): string {
  if (!hints) return "";
  const lines: string[] = [];
  if (hints.date) lines.push(`Data suggerita: ${hints.date}`);
  if (hints.time) lines.push(`Ora suggerita: ${hints.time}`);
  if (hints.chapterTitle) lines.push(`Capitolo: ${hints.chapterTitle}`);
  if (hints.location) lines.push(`Luogo: ${hints.location}`);
  if (hints.partyName) lines.push(`Party/gruppo: ${hints.partyName}`);
  if (hints.maxPlayers != null) lines.push(`Max giocatori: ${hints.maxPlayers}`);
  if (!lines.length) return "";
  return `--- INDIZI DAL MESSAGGIO ---\n${lines.join("\n")}`;
}

function hintsFromDetected(detected: DetectedSessionRequest | null): SessionDraftHints {
  if (!detected) return {};
  return {
    date: detected.date ?? undefined,
    time: detected.time ?? undefined,
    chapterTitle: detected.chapterTitle ?? undefined,
    location: detected.location ?? undefined,
    partyName: detected.partyName ?? undefined,
    maxPlayers: detected.maxPlayers ?? undefined,
  };
}

export async function generateSessionDraftFromPrompt(
  campaignId: string,
  userPrompt: string,
  hints?: SessionDraftHints
): Promise<
  { ok: true; draft: SessionAiDraft; assistantMessage: string } | { ok: false; error: string }
> {
  const trimmed = userPrompt.trim();
  if (!trimmed) return { ok: false, error: "Descrivi quando e come programmare la sessione." };

  const { context } = await loadSessionGenerationContext(campaignId);
  const prompt = [
    CREATE_SYSTEM_PROMPT,
    "",
    "--- CONTESTO ---",
    context,
    formatHintsBlock(hints),
    "",
    "--- RICHIESTA MASTER ---",
    trimmed,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.35, maxTokens: 800 });
    const parsed = parseSessionDraftJson(raw, hints);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return {
      ok: true,
      draft: parsed.data,
      assistantMessage: formatSessionDraftForChat(parsed.data, hints?.partyName),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore generazione bozza sessione.",
    };
  }
}

export async function refineSessionDraftFromPrompt(
  campaignId: string,
  userPrompt: string,
  current: SessionAiDraft
): Promise<
  { ok: true; draft: SessionAiDraft; assistantMessage: string } | { ok: false; error: string }
> {
  const { context } = await loadSessionGenerationContext(campaignId);
  const prompt = [
    REFINE_SYSTEM_PROMPT,
    "",
    "--- CONTESTO ---",
    context,
    "",
    "--- BOZZA ATTUALE ---",
    JSON.stringify(
      {
        date: current.date,
        time: current.time,
        chapter_title: current.chapterTitle,
        location: current.location,
        party_name: current.partyName,
        max_players: current.maxPlayers,
      },
      null,
      2
    ),
    "",
    "--- RICHIESTA MODIFICA ---",
    userPrompt.trim(),
  ].join("\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.35, maxTokens: 800 });
    const parsed = parseSessionDraftJson(raw, current);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return {
      ok: true,
      draft: parsed.data,
      assistantMessage: formatSessionDraftForChat(parsed.data),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento bozza sessione.",
    };
  }
}

export function buildSessionDraftFromHintsOnly(hints: SessionDraftHints): SessionAiDraft | null {
  const date = hints.date && /^\d{4}-\d{2}-\d{2}$/.test(hints.date) ? hints.date : null;
  if (!date) return null;
  return {
    date,
    time: hints.time ? normalizeTime(hints.time) : "20:00",
    chapterTitle: hints.chapterTitle ?? null,
    location: hints.location ?? "",
    partyName: hints.partyName ?? null,
    maxPlayers: normalizeMaxPlayers(hints.maxPlayers, 6),
  };
}

export { hintsFromDetected };
