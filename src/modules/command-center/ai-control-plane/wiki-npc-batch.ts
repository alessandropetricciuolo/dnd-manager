import type { WikiMarkdownExtraParams } from "@/lib/ai/wiki-text-generator";
import { extractNpcBuildParams } from "@/lib/ai/wiki-npc-params";

export type DetectedNpcBatchRequest = {
  userPrompt: string;
  count: number;
  roles: string[];
  locationName: string | null;
  extraParams: WikiMarkdownExtraParams;
};

const ITALIAN_NUMBERS: Record<string, number> = {
  uno: 1,
  una: 1,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  sette: 7,
  otto: 8,
  nove: 9,
  dieci: 10,
};

const TOWN_PROFESSIONS = [
  "Panettiere",
  "Calzolaio",
  "Barbiere",
  "Fabbro",
  "Locandiere",
  "Mercante",
  "Guardia cittadina",
  "Guaritore",
  "Bibliotecario",
  "Sarto",
  "Birraio",
  "Pescatore",
  "Falegname",
  "Orafo",
  "Alchimista",
  "Scriba",
  "Macellaio",
  "Vetturino",
  "Ceramista",
  "Stalliere",
  "Carpentiere",
  "Speziale",
  "Contadino",
  "Cacciatore",
  "Sindaco",
  "Prete",
  "Mugnaio",
  "Tessitore",
] as const;

const ROLE_STOPWORDS = new Set([
  "npc",
  "png",
  "personaggio",
  "personaggi",
  "genera",
  "generami",
  "crea",
  "creami",
  "voglio",
  "vorrei",
  "nella",
  "nel",
  "nello",
  "città",
  "citta",
  "villaggio",
  "borgo",
  "luogo",
  "taverna",
  "porto",
  "che",
  "vivono",
  "vivano",
  "lavorano",
  "lavorino",
  "abitano",
  "abitino",
  "della",
  "del",
  "di",
  "la",
  "il",
  "lo",
  "i",
  "gli",
  "le",
  "un",
  "una",
  "e",
]);

function capitalizePlaceName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function capitalizeRole(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function extractBatchCount(message: string): number | null {
  const t = message.trim();
  const digit = t.match(/\b(\d{1,2})\s*(?:npc|png|personaggi?)\b/i);
  if (digit?.[1]) {
    const n = Number(digit[1]);
    if (n >= 2 && n <= 20) return n;
  }

  const word = t.match(
    /\b(uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+(?:npc|png|personaggi?)\b/i
  );
  if (word?.[1]) {
    const n = ITALIAN_NUMBERS[word[1].toLowerCase()];
    if (n && n >= 2) return n;
  }

  const generami = t.match(/\bgenera(?:mi)?\s+(uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|\d{1,2})\s+(?:npc|png)\b/i);
  if (generami?.[1]) {
    const raw = generami[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : ITALIAN_NUMBERS[raw];
    if (n && n >= 2 && n <= 20) return n;
  }

  return null;
}

export function extractLocationNameFromPrompt(message: string): string | null {
  const patterns = [
    /\b(?:nella?|nel|nello|a|per|di)\s+(?:citt[aà]|villaggio|borgo|luogo|taverna|porto|mercato|piazza)\s+(?:di\s+|del\s+|della\s+)?([A-Za-zÀ-ÿ][\wÀ-ÿ'’\-\s]{1,48}?)(?:\s*[,.]|$|\s+che\b|\s+con\b)/i,
    /\b(?:citt[aà]|villaggio|borgo|luogo|taverna|porto)\s+(?:di\s+|del\s+|della\s+)?([A-Za-zÀ-ÿ][\wÀ-ÿ'’\-]{1,48})/i,
    /\b(?:abitano|vivono|lavorano|lavorino|vivano)\s+(?:a|in|nella?|nel)\s+([A-Za-zÀ-ÿ][\wÀ-ÿ'’\-]{1,48})/i,
  ];

  for (const re of patterns) {
    const m = message.match(re);
    const candidate = m?.[1]?.trim().replace(/\s+(che|con|e)\b.*$/i, "").trim();
    if (!candidate || candidate.length < 2) continue;
    const key = candidate.toLowerCase();
    if (ROLE_STOPWORDS.has(key)) continue;
    return capitalizePlaceName(candidate);
  }
  return null;
}

export function extractNamedRolesFromPrompt(message: string): string[] {
  const roles: string[] = [];

  const listMatch = message.match(
    /(?:genera(?:mi)?|crea(?:mi)?|voglio)\s+(?:il|la|l'|i|gli|le)?\s*([\s\S]+?)(?:\s+(?:nella?|nel|a|per|di)\s+(?:citt[aà]|villaggio|borgo|luogo)|$)/i
  );
  let segment = listMatch?.[1]?.trim() ?? message;
  segment = segment.replace(
    /\s+(?:della?|del|di)\s+(?:citt[aà]|villaggio|borgo|luogo)\s+.+$/i,
    ""
  );

  const chunks = segment
    .split(/\s*,\s*|\s+e\s+/i)
    .map((c) => c.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const m =
      chunk.match(/^(?:il|la|l'|lo|i|gli|le)\s+(.+)$/i) ??
      chunk.match(/^([A-Za-zÀ-ÿ][\wÀ-ÿ'’\-]{2,40})$/);
    const raw = m?.[1]?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (ROLE_STOPWORDS.has(key)) continue;
    if (/\b(npc|png|personaggi?)\b/i.test(raw)) continue;
    const role = capitalizeRole(raw);
    if (!roles.some((r) => r.toLowerCase() === role.toLowerCase())) {
      roles.push(role);
    }
  }

  return roles;
}

export function planNpcBatchRoles(count: number, explicitRoles: string[]): string[] {
  const target = Math.max(count, explicitRoles.length, 2);
  const picked = [...explicitRoles];

  const pool = [...TOWN_PROFESSIONS];
  while (picked.length < target) {
    const next = pool.shift();
    if (!next) break;
    if (picked.some((r) => r.toLowerCase() === next.toLowerCase())) {
      pool.push(next);
      continue;
    }
    picked.push(next);
  }

  return picked.slice(0, target);
}

function looksLikeNpcBatchCreate(message: string): boolean {
  const t = message.trim();
  if (t.length < 12) return false;
  if (!/\b(npc|png|personaggi?)\b/i.test(t)) return false;

  const count = extractBatchCount(t);
  if (count && count >= 2) return true;

  const roles = extractNamedRolesFromPrompt(t);
  if (roles.length >= 2) return true;

  if (/\b(più|vari|diversi|alcuni|molti)\s+(?:npc|png|personaggi?)\b/i.test(t)) return true;

  return false;
}

export function detectNpcBatchCreateRequest(message: string): DetectedNpcBatchRequest | null {
  const userPrompt = message.trim();
  if (!looksLikeNpcBatchCreate(userPrompt)) return null;

  const explicitRoles = extractNamedRolesFromPrompt(userPrompt);
  const count = extractBatchCount(userPrompt) ?? explicitRoles.length;
  if (count < 2 && explicitRoles.length < 2) return null;

  const roles = planNpcBatchRoles(count, explicitRoles);
  const locationName = extractLocationNameFromPrompt(userPrompt);

  return {
    userPrompt,
    count: roles.length,
    roles,
    locationName,
    extraParams: extractNpcBuildParams(userPrompt),
  };
}

export function buildNpcRolePrompt(
  roleLabel: string,
  locationName: string | null,
  locationExcerpt: string | null,
  originalPrompt: string
): string {
  const parts = [
    `Genera un NPC con ruolo/professione: **${roleLabel}**.`,
    locationName
      ? `Vive e lavora a **${locationName}**. Deve essere coerente con la storia e l'ambientazione di quel luogo.`
      : "Integra l'NPC nel mondo della campagna in modo coerente con la cronaca.",
    locationExcerpt?.trim()
      ? `Contesto del luogo (memoria campagna):\n${locationExcerpt.trim().slice(0, 1200)}`
      : null,
    `Richiesta originale del Master: ${originalPrompt}`,
  ];
  return parts.filter(Boolean).join("\n\n");
}

export function formatNpcBatchIntro(
  roles: string[],
  locationName: string | null,
  activeIndex: number
): string {
  const loc = locationName ? ` per **${locationName}**` : "";
  const role = roles[activeIndex] ?? `NPC ${activeIndex + 1}`;
  return `Batch **${activeIndex + 1}/${roles.length}**${loc}: **${role}**. Puoi affinare il testo in chat; poi decidi l'immagine e scrivi **conferma** per salvare solo questo PNG. Scrivi **salta** per passare al successivo senza salvare.`;
}
