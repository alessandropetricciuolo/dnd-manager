import type { WikiMarkdownExtraParams } from "@/lib/ai/wiki-text-generator";
import { extractNpcBuildParams, hasNpcMechanicsParams } from "@/lib/ai/wiki-npc-params";

export type NpcBatchRoleSpec = {
  /** Etichetta leggibile (es. Padre di Bartolo). */
  roleLabel: string;
  /** Riga o frammento originale del Master per questo PNG. */
  linePrompt: string;
  extraParams: WikiMarkdownExtraParams;
};

export type DetectedNpcBatchRequest = {
  userPrompt: string;
  count: number;
  roles: string[];
  roleSpecs: NpcBatchRoleSpec[];
  locationName: string | null;
  missionName: string | null;
  linkedEntityName: string | null;
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

const RELATION_ROLE_PATTERN =
  /^(padre|madre|maggiordomo|maggiordoma|figlio|figlia|fratello|sorella|zio|zia|nonno|nonna|marito|moglie|servo|serva|nipote|cugino|cugina|protettore|protettrice)\s+(?:di\s+)?/i;

const ROLE_STOPWORDS = new Set([
  "npc",
  "png",
  "personaggio",
  "personaggi",
  "genera",
  "generami",
  "generi",
  "crea",
  "creami",
  "voglio",
  "vorrei",
  "bisogno",
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
  "collegati",
  "collegato",
  "collegata",
  "sono",
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
  "missione",
  "incarico",
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

function titleCasePhrase(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase();
      if (["de", "di", "del", "della", "degli", "delle", "da", "van", "von"].includes(lower)) {
        return lower;
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function stripMechanicsTail(text: string): string {
  return text
    .replace(/,?\s*(?:umano|umana|nano|nana|elfo|elfa|mezzelfo|tiefling|gnomo|gnoma|mezzorco|dragonide|drow)\b/gi, "")
    .replace(/,?\s*aristocratic[oa]\b/gi, "")
    .replace(/,?\s*popolan[oa]\b/gi, "")
    .replace(/,?\s*espert[oa]\b/gi, "")
    .replace(/,?\s*combattente\b/gi, "")
    .replace(/,?\s*adept[oa]\b/gi, "")
    .replace(/,?\s*livello\s*\d{1,2}\b/gi, "")
    .replace(/,?\s*lv\.?\s*\d{1,2}\b/gi, "")
    .replace(/,?\s*\d{1,2}\s*°?\s*livello\b/gi, "")
    .trim();
}

export function deriveRoleLabelFromLine(body: string): string {
  const trimmed = body.trim();
  const relation = trimmed.match(
    /^(padre|madre|maggiordomo|maggiordoma|figlio|figlia|fratello|sorella|zio|zia|nonno|nonna|marito|moglie|servo|serva|nipote|cugino|cugina|protettore|protettrice)\s+(?:di\s+)?(.+)$/i
  );
  if (relation) {
    const who = stripMechanicsTail(relation[2] ?? "");
    if (who.length >= 2) {
      return `${capitalizeRole(relation[1])} di ${titleCasePhrase(who)}`;
    }
    return capitalizeRole(relation[1]);
  }

  const stripped = stripMechanicsTail(trimmed);
  if (stripped.length >= 3) {
    return capitalizeRole(stripped);
  }
  return capitalizeRole(trimmed.split(/\s+/).slice(0, 4).join(" "));
}

export function parseNpcRoleLine(line: string): NpcBatchRoleSpec | null {
  const cleaned = line.replace(/^[-*•\d.)]+\s*/, "").trim();
  if (cleaned.length < 6) return null;

  const articleMatch = cleaned.match(/^(?:il|la|l'|lo|i|gli|le)\s+(.+)$/i);
  if (!articleMatch) return null;

  const body = articleMatch[1].trim();
  if (body.length < 4) return null;
  if (/\b(npc|png|personaggi?|missione|incarico)\b/i.test(body) && !RELATION_ROLE_PATTERN.test(body)) {
    return null;
  }

  return {
    roleLabel: deriveRoleLabelFromLine(body),
    linePrompt: cleaned,
    extraParams: extractNpcBuildParams(body),
  };
}

/** Estrae righe strutturate (il padre di…, la madre di…, ecc.) dal prompt multiriga. */
export function extractStructuredNpcRoleSpecs(message: string): NpcBatchRoleSpec[] {
  const specs: NpcBatchRoleSpec[] = [];
  const seen = new Set<string>();

  for (const rawLine of message.split(/\r?\n/)) {
    const spec = parseNpcRoleLine(rawLine);
    if (!spec) continue;
    const key = spec.roleLabel.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    specs.push(spec);
  }

  // Fallback: segmento dopo "sono:" sulla stessa riga
  if (specs.length === 0) {
    const sonoBlock = message.match(/\bsono\s*:?\s*([\s\S]+)$/i);
    if (sonoBlock?.[1]) {
      for (const chunk of sonoBlock[1].split(/\s*(?:;|\n)\s*/)) {
        const spec = parseNpcRoleLine(chunk.trim());
        if (!spec) continue;
        const key = spec.roleLabel.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        specs.push(spec);
      }
    }
  }

  return specs;
}

export function extractBatchCount(message: string): number | null {
  const t = message.trim();

  const patterns = [
    /\b(\d{1,2})\s*(?:npc|png|personaggi?)\b/i,
    /\b(?:genera|generi|crea|crei|fammi|scrivi)\w*\s+(\d{1,2})\s*(?:npc|png|personaggi?)\b/i,
    /\bmi\s+generi\s+(\d{1,2})\s*(?:npc|png|personaggi?)\b/i,
    /\b(?:uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci)\s+(?:npc|png|personaggi?)\b/i,
    /\bgenera(?:mi)?\s+(uno|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|\d{1,2})\s+(?:npc|png)\b/i,
  ];

  for (const re of patterns) {
    const m = t.match(re);
    if (!m?.[1]) continue;
    const raw = m[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? Number(raw) : ITALIAN_NUMBERS[raw];
    if (n && n >= 2 && n <= 20) return n;
  }

  return null;
}

export function extractMissionNameFromPrompt(message: string): string | null {
  const patterns = [
    /\bcollegat\w*\s+alla\s+missione\s+["«]?([^"»\n.]+?)["»]?(?:\s*\.|,|$)/i,
    /\bmissione\s+["«]([^"»]+)["»]/i,
    /\bmissione\s+([A-ZÀ-ÿ][\wÀ-ÿ'’\-\s]{2,60}?)(?:\s*\.|,|$)/,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    const name = m?.[1]?.trim();
    if (name && name.length >= 3) return titleCasePhrase(name);
  }
  return null;
}

export function extractLinkedEntityNameFromPrompt(message: string): string | null {
  const patterns = [
    /\bcollegat\w*\s+a\s+([a-zà-ÿ][\wà-ÿ'’\-\s]{2,60}?)(?:\s*\.|,|\s+sono\b|\n|$)/i,
    /\blegat\w*\s+a\s+([a-zà-ÿ][\wà-ÿ'’\-\s]{2,60}?)(?:\s*\.|,|\s+sono\b|\n|$)/i,
  ];
  for (const re of patterns) {
    const m = message.match(re);
    let name = m?.[1]?.trim().replace(/\s+sono\s*$/i, "");
    if (!name || name.length < 3) continue;
    if (ROLE_STOPWORDS.has(name.toLowerCase())) continue;
    if (/^missione\b/i.test(name)) continue;
    return titleCasePhrase(name);
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
    /(?:(?:genera|generi|crea|crei|voglio|fammi)\w*\s+(?:il|la|l'|i|gli|le)?\s*|ho\s+bisogno\s+che\s+mi\s+generi\s+)([\s\S]+?)(?:\s+(?:nella?|nel|a|per|di)\s+(?:citt[aà]|villaggio|borgo|luogo)|$)/i
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
    const spec = parseNpcRoleLine(chunk);
    if (spec) {
      if (!roles.some((r) => r.toLowerCase() === spec.roleLabel.toLowerCase())) {
        roles.push(spec.roleLabel);
      }
      continue;
    }

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

/** Riempie professioni casuali solo se il Master non ha indicato ruoli espliciti. */
export function planNpcBatchRoles(count: number, explicitRoles: string[]): string[] {
  if (explicitRoles.length >= 2) {
    return explicitRoles.slice(0, Math.max(count, explicitRoles.length));
  }

  if (count < 2) return explicitRoles;

  const picked = [...explicitRoles];
  const pool = [...TOWN_PROFESSIONS];
  while (picked.length < count) {
    const next = pool.shift();
    if (!next) break;
    if (picked.some((r) => r.toLowerCase() === next.toLowerCase())) {
      pool.push(next);
      continue;
    }
    picked.push(next);
  }

  return picked.slice(0, count);
}

export function batchHasCompleteMechanics(batch: Pick<DetectedNpcBatchRequest, "roleSpecs" | "extraParams">): boolean {
  if (batch.roleSpecs.length > 0) {
    return batch.roleSpecs.every((spec) => hasNpcMechanicsParams(spec.extraParams));
  }
  return hasNpcMechanicsParams(batch.extraParams);
}

function looksLikeNpcBatchCreate(message: string): boolean {
  const t = message.trim();
  if (t.length < 12) return false;
  if (!/\b(npc|png|personaggi?)\b/i.test(t)) return false;

  if (extractStructuredNpcRoleSpecs(t).length >= 2) return true;

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

  const roleSpecs = extractStructuredNpcRoleSpecs(userPrompt);
  const explicitRoles =
    roleSpecs.length > 0 ? roleSpecs.map((s) => s.roleLabel) : extractNamedRolesFromPrompt(userPrompt);
  const count = extractBatchCount(userPrompt) ?? explicitRoles.length;
  if (count < 2 && explicitRoles.length < 2 && roleSpecs.length < 2) return null;

  const roles = planNpcBatchRoles(count, explicitRoles);
  const finalSpecs =
    roleSpecs.length > 0
      ? roleSpecs.slice(0, roles.length)
      : roles.map((roleLabel) => ({
          roleLabel,
          linePrompt: roleLabel,
          extraParams: extractNpcBuildParams(userPrompt),
        }));

  return {
    userPrompt,
    count: roles.length,
    roles,
    roleSpecs: finalSpecs,
    locationName: extractLocationNameFromPrompt(userPrompt),
    missionName: extractMissionNameFromPrompt(userPrompt),
    linkedEntityName: extractLinkedEntityNameFromPrompt(userPrompt),
    extraParams: extractNpcBuildParams(userPrompt),
  };
}

export function buildNpcRolePrompt(
  spec: NpcBatchRoleSpec,
  context: {
    locationName: string | null;
    locationExcerpt: string | null;
    missionName: string | null;
    linkedEntityName: string | null;
    originalPrompt: string;
  }
): string {
  const parts = [
    `Genera l'NPC richiesto dal Master: **${spec.roleLabel}**.`,
    `Istruzioni specifiche per questo PNG (segui alla lettera ruolo, legami e tratti indicati): ${spec.linePrompt}`,
    context.missionName
      ? `Contesto missione: **${context.missionName}**. L'NPC deve essere coerente con questa trama.`
      : null,
    context.linkedEntityName
      ? `Legame narrativo con **${context.linkedEntityName}**: rispetta la cronaca di campagna e le relazioni già note.`
      : null,
    context.locationName
      ? `Ambientazione / luogo: **${context.locationName}**.`
      : null,
    context.locationExcerpt?.trim()
      ? `Contesto del luogo (memoria campagna):\n${context.locationExcerpt.trim().slice(0, 1200)}`
      : null,
    `NON inventare un mestiere generico (es. panettiere, fabbro) se il Master ha indicato un ruolo familiare o narrativo diverso.`,
    `Richiesta completa del Master:\n${context.originalPrompt}`,
  ];
  return parts.filter(Boolean).join("\n\n");
}

export function formatNpcBatchIntro(
  roles: string[],
  locationName: string | null,
  activeIndex: number
): string {
  const loc = locationName ? ` · ${locationName}` : "";
  const role = roles[activeIndex] ?? `NPC ${activeIndex + 1}`;
  return `Batch **${activeIndex + 1}/${roles.length}**${loc}: **${role}**. Affina il testo in chat; poi decidi l'immagine e scrivi **conferma** per salvare solo questo PNG. **Salta** per il successivo senza salvare.`;
}
