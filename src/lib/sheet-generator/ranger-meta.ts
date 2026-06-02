/** Tipi di nemico prescelto (PHB italiano). */
export const RANGER_FAVORED_ENEMY_TYPES = [
  "aberrazioni",
  "bestie",
  "celestiali",
  "costrutti",
  "draghi",
  "elementali",
  "folletti",
  "giganti",
  "immondi",
  "melme",
  "mostruosità",
  "non morti",
  "vegetali",
] as const;

/** Terreni prescelti (PHB italiano). */
export const RANGER_FAVORED_TERRAINS = [
  "artico",
  "costa",
  "deserto",
  "foresta",
  "montagna",
  "palude",
  "prateria",
  "Underdark",
] as const;

function stableHashNonNegative(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickDistinct<T>(items: readonly T[], count: number, seed: string): T[] {
  const n = Math.min(count, items.length);
  if (n <= 0) return [];
  const used = new Set<number>();
  const out: T[] = [];
  let salt = 0;
  while (out.length < n && used.size < items.length) {
    const idx = stableHashNonNegative(`${seed}|prescelto|${salt}`) % items.length;
    salt += 1;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(items[idx]);
  }
  return out;
}

export function favoredEnemyCountForLevel(level: number): number {
  if (level >= 14) return 3;
  if (level >= 6) return 2;
  return 1;
}

export function favoredTerrainCountForLevel(level: number): number {
  if (level >= 10) return 3;
  if (level >= 6) return 2;
  return 1;
}

export function pickRangerFavoredEnemies(seed: string, level: number): string[] {
  return pickDistinct(RANGER_FAVORED_ENEMY_TYPES, favoredEnemyCountForLevel(level), `${seed}|nemico`);
}

export function pickRangerFavoredTerrains(seed: string, level: number): string[] {
  return pickDistinct(RANGER_FAVORED_TERRAINS, favoredTerrainCountForLevel(level), `${seed}|terreno`);
}

function normalizeHeading(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

type H3Section = { headingRaw: string; headingNorm: string; body: string };

function splitMarkdownH3Sections(md: string): H3Section[] {
  const lines = md.replace(/\r/g, "").split("\n");
  const sections: H3Section[] = [];
  let currentHeading: string | null = null;
  let currentBody: string[] = [];

  function flush() {
    if (!currentHeading) return;
    sections.push({
      headingRaw: currentHeading,
      headingNorm: normalizeHeading(currentHeading),
      body: currentBody.join("\n").trim(),
    });
    currentHeading = null;
    currentBody = [];
  }

  for (const line of lines) {
    const m = line.match(/^### (.+)$/);
    if (m) {
      flush();
      currentHeading = m[1].trim();
      continue;
    }
    if (currentHeading) currentBody.push(line);
  }
  flush();
  return sections;
}

function joinMarkdownH3Sections(sections: H3Section[]): string {
  return sections.map((s) => `### ${s.headingRaw}\n\n${s.body}`).join("\n\n").trim();
}

const NEMICO_HEADING = normalizeHeading("NEMICO PRESCELTO");
const ESPLORATORE_HEADING = normalizeHeading("ESPLORATORE NATO");

/**
 * Inserisce le scelte deterministiche di nemico e terreno prescelto nei blocchi privilegi ranger.
 */
export function injectRangerPrescelteChoices(md: string, seed: string, level: number): string {
  const trimmed = md.trim();
  if (!trimmed) return trimmed;

  const enemies = pickRangerFavoredEnemies(seed, level);
  const terrains = pickRangerFavoredTerrains(seed, level);
  if (!enemies.length && !terrains.length) return trimmed;

  const sections = splitMarkdownH3Sections(trimmed);
  if (!sections.length) return trimmed;

  for (const section of sections) {
    if (section.headingNorm === NEMICO_HEADING && enemies.length) {
      const list = enemies.map((e) => `**${e}**`).join(", ");
      section.body = `**Scelta:** ${list}.\n\n${section.body}`.trim();
    }
    if (section.headingNorm === ESPLORATORE_HEADING && terrains.length) {
      const list = terrains.map((t) => `**${t}**`).join(", ");
      section.body = `**Scelta:** ${list}.\n\n${section.body}`.trim();
    }
  }

  return joinMarkdownH3Sections(sections);
}

export function summarizeRangerPrescelteFromBody(body: string): string | null {
  const m = body.match(/\*\*Scelta:\*\*\s*([^\n]+)/i);
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim();
}
