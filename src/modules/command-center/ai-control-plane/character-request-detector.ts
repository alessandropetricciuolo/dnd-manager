export type DetectedCharacterRequest = {
  name: string;
  characterClass: string | null;
  classSubclass: string | null;
  level: number;
  raceSlug: string | null;
  background: string | null;
  userPrompt: string;
};

const PC_HINTS =
  /\b(personaggio\s+giocatore|pg\b|giocatore|party|gruppo|eroe|crea(?:mi)?\s+(?:il\s+)?personaggio)\b/i;
const NPC_HINTS = /\b(npc|png|non\s+giocante|mercante|locandier|pescivendol)\b/i;

const CLASS_ALIASES: Record<string, string> = {
  barbaro: "Barbaro",
  barbarian: "Barbaro",
  guerriero: "Guerriero",
  fighter: "Guerriero",
  ladro: "Ladro",
  rogue: "Ladro",
  mago: "Mago",
  wizard: "Mago",
  chierico: "Chierico",
  cleric: "Chierico",
  ranger: "Ranger",
  paladino: "Paladino",
  paladin: "Paladino",
  bardo: "Bardo",
  bard: "Bardo",
  druido: "Druido",
  druid: "Druido",
  monaco: "Monaco",
  monk: "Monaco",
  stregone: "Stregone",
  sorcerer: "Stregone",
  warlock: "Warlock",
  artefice: "Artefice",
  artificer: "Artefice",
};

const RACE_ALIASES: Record<string, string> = {
  halfling: "halfling",
  "mezzelfo": "half-elf",
  mezzelfa: "half-elf",
  elfo: "elf",
  elfa: "elf",
  nano: "dwarf",
  nana: "dwarf",
  umano: "human",
  umana: "human",
  tiefling: "tiefling",
  dragonide: "dragonborn",
};

function capitalizeName(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function extractCharacterName(message: string): string | null {
  const patterns = [
    /\bgiocatore\s+([A-ZÀ-Ý][\wÀ-ÿ'-]{1,40})\b/i,
    /\bpersonaggio\s+(?:giocatore\s+)?([A-ZÀ-Ý][\wÀ-ÿ'-]{1,40})\b/i,
    /\bpg\s+([A-ZÀ-Ý][\wÀ-ÿ'-]{1,40})\b/i,
    /\bsi\s+chiama\s+([A-ZÀ-Ý][\wÀ-ÿ'-]{1,40})\b/i,
    /\bnome[:\s]+([A-ZÀ-Ý][\wÀ-ÿ'-]{1,40})\b/i,
    /\bcrea(?:mi)?\s+(?:il\s+)?(?:personaggio\s+(?:giocatore\s+)?)?([A-ZÀ-Ý][\wÀ-ÿ'-]{1,40})\b/i,
  ];
  const skip = new Set([
    "un",
    "una",
    "il",
    "la",
    "personaggio",
    "giocatore",
    "pg",
    "nuovo",
    "nuova",
    "il",
    "la",
  ]);
  for (const re of patterns) {
    const m = message.match(re);
    const candidate = m?.[1]?.trim();
    if (!candidate || skip.has(candidate.toLowerCase())) continue;
    return capitalizeName(candidate);
  }
  return null;
}

function extractClass(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [key, label] of Object.entries(CLASS_ALIASES)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(lower)) return label;
  }
  return null;
}

function extractRace(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [key, slug] of Object.entries(RACE_ALIASES)) {
    if (new RegExp(`\\b${key}\\b`, "i").test(lower)) return slug;
  }
  return null;
}

function extractLevel(message: string): number | null {
  const m = message.match(/\blivello\s*(\d{1,2})\b/i) ?? message.match(/\blvl\s*(\d{1,2})\b/i);
  if (!m?.[1]) return null;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function looksLikePcCreate(message: string): boolean {
  const t = message.trim();
  if (t.length < 8) return false;
  if (NPC_HINTS.test(t) && !PC_HINTS.test(t)) return false;
  if (/\b(npc|png|wiki|voce\s+wiki)\b/i.test(t)) return false;
  if (PC_HINTS.test(t)) return true;
  if (/\bcrea(?:mi)?\s+(?:un[a']?\s+)?personaggio\b/i.test(t)) return true;
  return false;
}

export function detectCharacterCreateRequest(message: string): DetectedCharacterRequest | null {
  const userPrompt = message.trim();
  if (!looksLikePcCreate(userPrompt)) return null;

  const name = extractCharacterName(userPrompt) ?? "Nuovo personaggio";
  const characterClass = extractClass(userPrompt);
  const level = extractLevel(userPrompt) ?? 1;

  return {
    name,
    characterClass,
    classSubclass: null,
    level,
    raceSlug: extractRace(userPrompt),
    background: null,
    userPrompt,
  };
}
