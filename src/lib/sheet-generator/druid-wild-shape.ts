import { preloadPhbMarkdown } from "@/lib/server/phb-spell-excerpt";
import {
  formatAppendixDStatBlockForManual,
  getPhbAppendixDBeasts,
  type PhbAppendixDBeast,
} from "@/lib/sheet-generator/phb-appendix-d-statblocks";

export type WildShapeBeast = {
  name: string;
  cr: number;
  crLabel: string;
  movementNote: string;
  hasSwim: boolean;
  hasFly: boolean;
  environments: string[];
  statBlock?: string;
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

function movementNoteFromBeast(beast: PhbAppendixDBeast): string {
  if (beast.hasFly && beast.hasSwim) return "Nuotare, Volare";
  if (beast.hasFly) return "Volare";
  if (beast.hasSwim) return "Nuotare";
  return "";
}

function toWildShapeBeast(beast: PhbAppendixDBeast): WildShapeBeast {
  const note = movementNoteFromBeast(beast);
  return {
    name: beast.name,
    cr: beast.cr,
    crLabel: beast.crLabel,
    movementNote: note,
    hasSwim: beast.hasSwim,
    hasFly: beast.hasFly,
    environments: [],
    statBlock: beast.statBlock,
  };
}

/** Bestie dall'Appendice D del manuale base (solo tipo Bestia). */
export function getPhbWildShapeBeasts(): WildShapeBeast[] {
  return getPhbAppendixDBeasts().map(toWildShapeBeast);
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

function buildWildShapeIntro(level: number, limits: WildShapeLimits): string[] {
  return [
    `Forme bestiali disponibili al livello ${level} (${limitsSummary(limits, level)}).`,
    "Devi aver già visto la bestia (PHB). Elenco e statistiche dall'Appendice D del manuale base.",
    "",
  ];
}

/**
 * Stat block Appendice D PHB per le forme bestiali ammissibili (solo manuale base).
 */
export async function buildDruidWildShapeStatBlocksManualBody(
  level: number,
  classSubclass: string | null | undefined,
  requestOrigin?: string | null
): Promise<string | null> {
  await preloadPhbMarkdown(requestOrigin);
  const all = getPhbWildShapeBeasts();
  if (!all.length) return null;

  const filtered = filterWildShapeBeastsForDruid(all, level, classSubclass);
  if (!filtered?.beasts.length) return null;

  const parts: string[] = buildWildShapeIntro(level, filtered.limits);

  for (const beast of filtered.beasts) {
    if (!beast.statBlock) continue;
    parts.push("—".repeat(40));
    parts.push(`${beast.name.toUpperCase()} (GS ${beast.crLabel})`);
    parts.push("");
    parts.push(formatAppendixDStatBlockForManual(beast.statBlock));
    parts.push("");
  }

  return parts.join("\n").trim();
}

/** @deprecated Usa buildDruidWildShapeStatBlocksManualBody (solo Appendice D PHB). */
export async function buildDruidWildShapeManualBody(
  level: number,
  classSubclass: string | null | undefined,
  requestOrigin?: string | null
): Promise<string | null> {
  return buildDruidWildShapeStatBlocksManualBody(level, classSubclass, requestOrigin);
}

/** Invalida cache (test). */
export function clearWildShapeBeastsCache(): void {
  // Le bestie sono in cache condivisa con phb-appendix-d-statblocks.
}
