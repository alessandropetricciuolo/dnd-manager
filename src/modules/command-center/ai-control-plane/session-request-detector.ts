import { addDays, format, nextDay, parse } from "date-fns";
import { it } from "date-fns/locale";

export type DetectedSessionRequest = {
  date: string | null;
  time: string | null;
  chapterTitle: string | null;
  location: string | null;
  partyName: string | null;
  maxPlayers: number | null;
  userPrompt: string;
};

const SESSION_VERBS =
  /\b(programma|pianifica|crea(?:mi)?|aggiungi|fissa|organizza|schedula)\b.{0,40}\b(sessione|appuntamento|incontro)\b/i;
const SESSION_NOUN = /\b(?:nuova|nuovo)\s+sessione\b/i;

const MONTHS: Record<string, number> = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
};

const WEEKDAYS: Record<string, number> = {
  domenica: 0,
  lunedi: 1,
  lunedì: 1,
  martedi: 2,
  martedì: 2,
  mercoledi: 3,
  mercoledì: 3,
  giovedi: 4,
  giovedì: 4,
  venerdi: 5,
  venerdì: 5,
  sabato: 6,
};

function referenceToday(): Date {
  return new Date();
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function parseNumericDate(message: string): string | null {
  const iso = message.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = message.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](20\d{2}))?\b/);
  if (slash) {
    const day = Number.parseInt(slash[1]!, 10);
    const month = Number.parseInt(slash[2]!, 10);
    const year = slash[3] ? Number.parseInt(slash[3], 10) : referenceToday().getFullYear();
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return format(new Date(year, month - 1, day), "yyyy-MM-dd");
    }
  }
  return null;
}

function parseItalianMonthDate(message: string): string | null {
  const m = message.match(
    /\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(20\d{2}))?\b/i
  );
  if (!m) return null;
  const day = Number.parseInt(m[1]!, 10);
  const month = MONTHS[m[2]!.toLowerCase()];
  const year = m[3] ? Number.parseInt(m[3], 10) : referenceToday().getFullYear();
  if (!month || day < 1 || day > 31) return null;
  return format(new Date(year, month - 1, day), "yyyy-MM-dd");
}

function parseRelativeDate(message: string): string | null {
  const lower = message.toLowerCase();
  const today = referenceToday();
  if (/\bdomani\b/.test(lower)) return toIsoDate(addDays(today, 1));
  if (/\bdopodomani\b/.test(lower)) return toIsoDate(addDays(today, 2));

  for (const [name, weekday] of Object.entries(WEEKDAYS)) {
    const re = new RegExp(`\\b${name}(?:\\s+prossim[oa])?\\b`, "i");
    if (re.test(lower)) {
      const target = nextDay(today, weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6);
      return toIsoDate(target);
    }
  }
  return null;
}

function extractTime(message: string): string | null {
  const hhmm = message.match(/\b(?:ore|alle|h)\s*(\d{1,2})[:.](\d{2})\b/i);
  if (hhmm) {
    const h = Number.parseInt(hhmm[1]!, 10);
    const m = Number.parseInt(hhmm[2]!, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }
  const hourOnly = message.match(/\b(?:ore|alle)\s*(\d{1,2})\b/i);
  if (hourOnly) {
    const h = Number.parseInt(hourOnly[1]!, 10);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
  }
  return null;
}

function extractChapterTitle(message: string): string | null {
  const patterns = [
    /\bcapitolo\s+\d+\s*[:\-]?\s*["«']([^"»']+)["»']/i,
    /\bcapitolo\s+\d+\s*[:\-]?\s+([^,.;\n]+)/i,
    /\btitolo\s+(?:capitolo\s*)?[:\-]?\s*["«']([^"»']+)["»']/i,
    /\b["«']([^"»']{3,80})["»']\s*(?:come\s+)?capitolo/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    const title = m?.[1]?.trim();
    if (title && title.length >= 3) return title;
  }
  return null;
}

function extractPartyName(message: string): string | null {
  const patterns = [
    /\bparty\s+(?:degli|delle|dei|di)\s+([^,.;\n]+)/i,
    /\bgruppo\s+["«']?([^"»',.;\n]+)["»']?/i,
    /\bparty\s+["«']([^"»']+)["»']/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    const name = m?.[1]?.trim();
    if (name && name.length >= 2) return name.replace(/\s+$/g, "");
  }
  return null;
}

function extractLocation(message: string): string | null {
  const patterns = [
    /\b(?:location|luogo|sede|presso|in)\s*[:\-]?\s*([^,.;\n]+)/i,
    /\b(?:online|discord|roll20|foundry)\b/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    if (!m) continue;
    if (!m[1]) {
      const match = message.match(re);
      return match?.[0]?.trim() ?? null;
    }
    const loc = m[1].trim();
    if (loc.length >= 2) return loc;
  }
  return null;
}

function extractMaxPlayers(message: string): number | null {
  const m = message.match(/\b(\d{1,2})\s*(?:giocator|player|pg)\b/i);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : null;
}

function looksLikeSessionCreate(message: string): boolean {
  const t = message.trim();
  if (t.length < 10) return false;
  if (SESSION_VERBS.test(t)) return true;
  if (SESSION_NOUN.test(t)) return true;
  if (/\bprogramma(?:re)?\s+.*\b(?:venerd|sabato|domenica|luned|marted|mercoled|gioved)\b/i.test(t)) {
    return true;
  }
  return false;
}

export function detectSessionCreateRequest(message: string): DetectedSessionRequest | null {
  const userPrompt = message.trim();
  if (!looksLikeSessionCreate(userPrompt)) return null;

  const date =
    parseNumericDate(userPrompt) ??
    parseItalianMonthDate(userPrompt) ??
    parseRelativeDate(userPrompt);

  return {
    date,
    time: extractTime(userPrompt),
    chapterTitle: extractChapterTitle(userPrompt),
    location: extractLocation(userPrompt),
    partyName: extractPartyName(userPrompt),
    maxPlayers: extractMaxPlayers(userPrompt),
    userPrompt,
  };
}

export function sessionHintsFromDetected(
  detected: DetectedSessionRequest | null,
  input?: Record<string, unknown>
): Partial<DetectedSessionRequest> {
  const hints: Partial<DetectedSessionRequest> = {};
  if (detected) Object.assign(hints, detected);

  if (typeof input?.date === "string" && input.date.trim()) hints.date = input.date.trim();
  if (typeof input?.time === "string" && input.time.trim()) hints.time = input.time.trim();
  if (typeof input?.chapterTitle === "string" && input.chapterTitle.trim()) {
    hints.chapterTitle = input.chapterTitle.trim();
  }
  if (typeof input?.location === "string" && input.location.trim()) {
    hints.location = input.location.trim();
  }
  if (typeof input?.partyName === "string" && input.partyName.trim()) {
    hints.partyName = input.partyName.trim();
  }
  if (typeof input?.maxPlayers === "number" && Number.isFinite(input.maxPlayers)) {
    hints.maxPlayers = Math.max(1, Math.min(20, Math.trunc(input.maxPlayers)));
  }
  return hints;
}

/** Prova a interpretare una data italiana libera (fallback AI/heuristic). */
export function tryParseLooseItalianDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return (
    parseNumericDate(trimmed) ??
    parseItalianMonthDate(trimmed) ??
    parseRelativeDate(trimmed) ??
    (() => {
      try {
        const parsed = parse(trimmed, "d MMMM yyyy", referenceToday(), { locale: it });
        if (!Number.isNaN(parsed.getTime())) return toIsoDate(parsed);
      } catch {
        /* ignore */
      }
      return null;
    })()
  );
}
