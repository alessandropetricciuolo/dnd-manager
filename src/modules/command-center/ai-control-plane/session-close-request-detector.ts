export type DetectedSessionCloseRequest = {
  sessionDateHint: string | null;
  sessionTitleHint: string | null;
  userPrompt: string;
};

const CLOSE_VERBS =
  /\b(chiudi|chiudere|concludi|concludere|termina|terminare|fine|debrief|riassumi|recap)\b.{0,30}\b(sessione|incontro|appuntamento)\b/i;
const CLOSE_NOUN = /\b(?:chiusura|fine)\s+(?:della\s+)?sessione\b/i;
const CLOSE_IMPERATIVE = /\bchiudi\s+(?:la\s+)?sessione\b/i;

function extractSessionDateHint(message: string): string | null {
  const iso = message.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  const slash = message.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](20\d{2}))?\b/);
  if (slash) {
    const day = slash[1]!.padStart(2, "0");
    const month = slash[2]!.padStart(2, "0");
    const year = slash[3] ?? String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
  }

  const italian = message.match(
    /\b(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)(?:\s+(20\d{2}))?\b/i
  );
  if (italian) {
    const months: Record<string, string> = {
      gennaio: "01",
      febbraio: "02",
      marzo: "03",
      aprile: "04",
      maggio: "05",
      giugno: "06",
      luglio: "07",
      agosto: "08",
      settembre: "09",
      ottobre: "10",
      novembre: "11",
      dicembre: "12",
    };
    const m = months[italian[2]!.toLowerCase()];
    if (m) {
      const year = italian[3] ?? String(new Date().getFullYear());
      return `${year}-${m}-${italian[1]!.padStart(2, "0")}`;
    }
  }

  if (/\b(ultima|più recente|appena finita)\s+sessione\b/i.test(message)) {
    return "latest";
  }
  if (/\bieri\b/i.test(message)) return "yesterday";
  if (/\boggi\b/i.test(message)) return "today";

  return null;
}

function looksLikeSessionClose(message: string): boolean {
  const t = message.trim();
  if (t.length < 8) return false;
  if (CLOSE_IMPERATIVE.test(t)) return true;
  if (CLOSE_VERBS.test(t)) return true;
  if (CLOSE_NOUN.test(t)) return true;
  if (/\bdebrief\b/i.test(t) && /\b(sessione|pg|giocator)/i.test(t)) return true;
  return false;
}

export function detectSessionCloseRequest(message: string): DetectedSessionCloseRequest | null {
  const userPrompt = message.trim();
  if (!looksLikeSessionClose(userPrompt)) return null;

  const chapter = userPrompt.match(/\bsessione\s+(?:del|di)\s+["«']([^"»']+)["»']/i);
  return {
    sessionDateHint: extractSessionDateHint(userPrompt),
    sessionTitleHint: chapter?.[1]?.trim() ?? null,
    userPrompt,
  };
}
