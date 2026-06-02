import {
  getManualMarkdownByFileName,
  preloadManualMarkdownFile,
} from "@/lib/server/phb-spell-excerpt";

export type WildShapeBeast = {
  name: string;
  cr: number;
  crLabel: string;
  movementNote: string;
  hasSwim: boolean;
  hasFly: boolean;
  environments: string[];
};

export type WildShapeLimits = {
  maxCr: number;
  maxCrLabel: string;
  noSwim: boolean;
  noFly: boolean;
  moonCircle: boolean;
};

export function isMoonCircleDruid(classSubclass: string | null | undefined): boolean {
  return /circolo\s+della\s+luna/i.test((classSubclass ?? "").trim());
}

/** Converte GS testuale (es. «1/4», «2») in numero per confronti. */
export function parseChallengeRating(crRaw: string): number {
  const t = crRaw.trim().replace(",", ".");
  if (t.includes("/")) {
    const [a, b] = t.split("/").map((x) => Number.parseFloat(x.trim()));
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
    return Number.POSITIVE_INFINITY;
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function formatCrLabel(cr: number): string {
  if (cr === 0) return "0";
  const inv = [8, 4, 2];
  for (const d of inv) {
    if (Math.abs(cr - 1 / d) < 1e-6) return `1/${d}`;
  }
  return Number.isInteger(cr) ? String(cr) : String(cr);
}

function movementFlags(note: string): { hasSwim: boolean; hasFly: boolean } {
  const n = note.trim().toLowerCase();
  return {
    hasSwim: n.includes("nuotare"),
    hasFly: n.includes("volare"),
  };
}

let cachedBeasts: WildShapeBeast[] | null = null;

/** Bestie dalle tabelle Xanathar «Apprendere forme bestiali». */
export function parseXanatharWildShapeBeasts(markdown: string): WildShapeBeast[] {
  const txt = markdown.replace(/\r/g, "");
  const start = txt.search(/^##\s+APPRENDERE\s+FORME\s+BESTIALI\s*$/im);
  if (start < 0) return [];

  const slice = txt.slice(start);
  const end = slice.search(/^#\s+GUERRIERO\s*$/im);
  const section = end > 0 ? slice.slice(0, end) : slice;

  const byName = new Map<string, WildShapeBeast>();
  let currentEnv: string | null = null;

  for (const line of section.split("\n")) {
    const envMatch = line.match(/^##\s+(.+?)\s*$/);
    if (envMatch) {
      const env = envMatch[1]!.trim();
      if (!/^APPRENDERE/i.test(env)) currentEnv = env;
      continue;
    }

    const row = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!row || !currentEnv) continue;
    const crRaw = row[1]!.trim();
    const name = row[2]!.trim();
    const move = row[3]!.trim();
    if (!name || /^-+$/.test(crRaw) || /^gs$/i.test(crRaw) || /^bestia$/i.test(name)) continue;

    const cr = parseChallengeRating(crRaw);
    const { hasSwim, hasFly } = movementFlags(move);
    const key = name.toLocaleLowerCase("it");
    const existing = byName.get(key);
    if (existing) {
      if (!existing.environments.includes(currentEnv)) existing.environments.push(currentEnv);
      continue;
    }
    byName.set(key, {
      name,
      cr,
      crLabel: crRaw,
      movementNote: move === "—" || move === "-" ? "" : move,
      hasSwim,
      hasFly,
      environments: [currentEnv],
    });
  }

  return [...byName.values()];
}

export function getXanatharWildShapeBeasts(): WildShapeBeast[] {
  if (cachedBeasts) return cachedBeasts;
  const md = getManualMarkdownByFileName("xanathar.md");
  cachedBeasts = md ? parseXanatharWildShapeBeasts(md) : [];
  return cachedBeasts;
}

/** Limiti PHB tabella «Forme bestiali» (+ Circolo della Luna). */
export function wildShapeLimitsForLevel(
  level: number,
  classSubclass: string | null | undefined
): WildShapeLimits | null {
  if (level < 2) return null;
  const moonCircle = isMoonCircleDruid(classSubclass);

  let maxCr: number;
  if (moonCircle) {
    maxCr = level >= 6 ? Math.floor(level / 3) : 1;
  } else if (level >= 8) {
    maxCr = 1;
  } else if (level >= 4) {
    maxCr = 0.5;
  } else {
    maxCr = 0.25;
  }

  return {
    maxCr,
    maxCrLabel: formatCrLabel(maxCr),
    noSwim: level < 4,
    noFly: level < 8,
    moonCircle,
  };
}

export function isBeastEligibleForWildShape(beast: WildShapeBeast, limits: WildShapeLimits): boolean {
  if (beast.cr > limits.maxCr + 1e-9) return false;
  if (limits.noSwim && beast.hasSwim) return false;
  if (limits.noFly && beast.hasFly) return false;
  return true;
}

export function filterWildShapeBeastsForDruid(
  beasts: WildShapeBeast[],
  level: number,
  classSubclass: string | null | undefined
): { limits: WildShapeLimits; beasts: WildShapeBeast[] } | null {
  const limits = wildShapeLimitsForLevel(level, classSubclass);
  if (!limits) return null;
  const eligible = beasts
    .filter((b) => isBeastEligibleForWildShape(b, limits))
    .sort((a, b) => a.cr - b.cr || a.name.localeCompare(b.name, "it"));
  return { limits, beasts: eligible };
}

function limitsSummary(limits: WildShapeLimits, level: number): string {
  const parts = [`GS massimo ${limits.maxCrLabel}`];
  if (limits.noSwim && limits.noFly) parts.push("senza velocità di nuoto o volo");
  else if (limits.noFly) parts.push("senza velocità di volo");
  if (limits.moonCircle) {
    parts.push(
      level >= 6
        ? "Circolo della Luna (Forme del circolo)"
        : "Circolo della Luna (ignora GS tabella PHB, rispetta limitazioni movimento)"
    );
  }
  return parts.join("; ");
}

/**
 * Elenco forme bestiali utilizzabili in Forma selvatica (tabelle Xanathar, filtrate per livello).
 */
export async function buildDruidWildShapeManualBody(
  level: number,
  classSubclass: string | null | undefined,
  requestOrigin?: string | null
): Promise<string | null> {
  await preloadManualMarkdownFile("xanathar.md", requestOrigin);
  const all = getXanatharWildShapeBeasts();
  if (!all.length) return null;

  const filtered = filterWildShapeBeastsForDruid(all, level, classSubclass);
  if (!filtered || filtered.beasts.length === 0) return null;

  const { limits, beasts } = filtered;
  const lines: string[] = [
    `Forme bestiali disponibili al livello ${level} (${limitsSummary(limits, level)}).`,
    "Devi aver già visto la bestia (PHB). Elenco da Xanathar — Apprendere forme bestiali.",
    "",
  ];

  let lastCr: string | null = null;
  for (const b of beasts) {
    if (b.crLabel !== lastCr) {
      lastCr = b.crLabel;
      lines.push(`GS ${b.crLabel}`);
    }
    const move =
      b.movementNote && b.movementNote !== "—"
        ? ` (${b.movementNote})`
        : b.hasFly
          ? " (Volare)"
          : b.hasSwim
            ? " (Nuotare)"
            : "";
    lines.push(`• ${b.name}${move}`);
  }

  return lines.join("\n").trim();
}

/** Invalida cache (test). */
export function clearWildShapeBeastsCache(): void {
  cachedBeasts = null;
}
