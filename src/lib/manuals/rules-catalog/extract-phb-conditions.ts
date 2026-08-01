import { createHash } from "crypto";
import { PHB_CONDITIONS } from "@/lib/manuals/phb-conditions";
import {
  RULES_CATALOG_EXTRACTION_VERSION,
  slugifyRulesCatalogName,
  type RulesCatalogRecord,
} from "@/lib/manuals/rules-catalog/types";

const SOURCE_BOOK = "player_handbook";
const SOURCE_FILE = "manuale_giocatore.md";
const SOURCE_LABEL = "PHB Appendice A";
const PARENT_SECTION = "APPENDICE A: CONDIZIONI";
const OVERVIEW_SLUG = "condizioni-overview";
const OVERVIEW_NAME = "Condizioni";

const APPENDIX_A_START = /^#\s+APPENDICE\s+A:\s*CONDIZIONI\s*$/im;
const APPENDIX_B_START = /^#\s+APPENDICE\s+B\b/im;
const HEADING_RE = /^(#{1,3})\s+(.+?)\s*$/;
const IMAGE_RE = /^\s*!\[.*?\]\(.*?\)\s*$/;
const CHROME_RE = /^\s*APPENDICE\s+A\s*\|\s*CONDIZIONI(?:\s+\d+)?\s*$/i;
const ORPHAN_PIETRIFICATO_BULLET =
  /^\*\s*La creatura è immune ai veleni e alle malattie/i;
const SPAM_RE = /paypal\.me|offrimi un caff/i;
const BARE_PAGE_RE = /^\s*\d{2,4}\s*$/;
const CONDITION_NAME_ONLY = new Set(
  PHB_CONDITIONS.map((n) => n.toUpperCase()).concat(PHB_CONDITIONS.map((n) => n.toUpperCase().replace(/\s+/g, " ")))
);

type ConditionHeadingMatch = {
  name: (typeof PHB_CONDITIONS)[number];
  level: number;
  raw: string;
  index: number;
  endOfHeadingLine: number;
};

function hashBody(bodyMd: string): string {
  return createHash("sha256").update(bodyMd).digest("hex");
}

function titleCaseCondition(raw: string): (typeof PHB_CONDITIONS)[number] | null {
  const normalized = raw
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  for (const name of PHB_CONDITIONS) {
    if (name.toLowerCase() === normalized) return name;
  }
  return null;
}

function isConditionNameOnlyLine(line: string): boolean {
  const t = line.trim().replace(/\s+/g, " ").toUpperCase();
  return CONDITION_NAME_ONLY.has(t);
}

function cleanBodyLines(raw: string, opts?: { dropOrphanExhaustionBullets?: boolean }): string {
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  let sawNonBulletContent = false;

  for (const line of lines) {
    if (IMAGE_RE.test(line)) continue;
    if (CHROME_RE.test(line)) continue;
    if (ORPHAN_PIETRIFICATO_BULLET.test(line)) continue;
    if (SPAM_RE.test(line)) continue;
    if (BARE_PAGE_RE.test(line)) continue;
    if (isConditionNameOnlyLine(line)) continue;
    const trimmed = line.trimEnd();
    if (!trimmed.trim()) {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      continue;
    }
    const isBullet = /^\*\s+/.test(trimmed);
    if (opts?.dropOrphanExhaustionBullets && isBullet && sawNonBulletContent) {
      continue;
    }
    if (!isBullet) sawNonBulletContent = true;
    out.push(trimmed);
  }

  while (out.length > 0 && out[0] === "") out.shift();
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}

function extractEffects(bodyMd: string): string[] {
  const effects: string[] = [];
  for (const line of bodyMd.split("\n")) {
    const m = line.match(/^\*\s+(.+?)\s*$/);
    if (m?.[1]) effects.push(m[1].trim());
  }
  return effects;
}

function findConditionHeadings(appendix: string, baseOffset: number): ConditionHeadingMatch[] {
  const matches: ConditionHeadingMatch[] = [];
  const lines = appendix.split(/\r?\n/);
  let offset = 0;
  for (const line of lines) {
    const hm = line.match(HEADING_RE);
    if (hm) {
      const level = hm[1]!.length;
      const rawTitle = hm[2]!.trim();
      const name = titleCaseCondition(rawTitle);
      if (name) {
        matches.push({
          name,
          level,
          raw: line,
          index: baseOffset + offset,
          endOfHeadingLine: baseOffset + offset + line.length,
        });
      }
    }
    offset += line.length + 1;
  }
  return matches;
}

/**
 * Estrae le condizioni PHB (Appendice A) da `manuale_giocatore.md`.
 * Scope: da `# APPENDICE A: CONDIZIONI` fino a `# APPENDICE B`.
 */
export function extractPhbConditionsFromMarkdown(markdown: string): RulesCatalogRecord[] {
  const startMatch = APPENDIX_A_START.exec(markdown);
  if (!startMatch || startMatch.index == null) {
    throw new Error("Appendice A: CONDIZIONI non trovata in manuale_giocatore.md");
  }
  const startIdx = startMatch.index;
  const afterStart = markdown.slice(startIdx);
  const endRel = afterStart.search(APPENDIX_B_START);
  if (endRel < 0) {
    throw new Error("Appendice B non trovata dopo Appendice A condizioni");
  }
  const appendix = afterStart.slice(0, endRel);
  const headings = findConditionHeadings(appendix, startIdx);
  if (headings.length === 0) {
    throw new Error("Nessun heading condizione trovato in Appendice A");
  }

  const records: RulesCatalogRecord[] = [];

  // Overview: testo tra titolo appendice e prima condizione
  const firstHeadingRel = headings[0]!.index - startIdx;
  const overviewRaw = appendix.slice(startMatch[0].length, firstHeadingRel);
  const overviewBody = cleanBodyLines(overviewRaw);
  if (overviewBody) {
    records.push({
      kind: "rule",
      slug: OVERVIEW_SLUG,
      name: OVERVIEW_NAME,
      nameAliases: ["Tutte le condizioni", "APPENDICE A: CONDIZIONI", "Condizioni PHB"],
      sourceBook: SOURCE_BOOK,
      sourceFile: SOURCE_FILE,
      sourceLabel: SOURCE_LABEL,
      parentSection: PARENT_SECTION,
      headingLevel: 1,
      headingRaw: startMatch[0],
      bodyMd: overviewBody,
      bodyHash: hashBody(overviewBody),
      facets: {},
      extractionVersion: RULES_CATALOG_EXTRACTION_VERSION,
    });
  }

  const seen = new Set<string>();
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i]!;
    if (seen.has(h.name)) continue;
    seen.add(h.name);

    const bodyStartRel = h.endOfHeadingLine - startIdx;
    // Skip newline after heading
    let sliceStart = bodyStartRel;
    if (appendix[sliceStart] === "\n") sliceStart += 1;
    else if (appendix[sliceStart] === "\r") sliceStart += 2;

    const next = headings[i + 1];
    const bodyEndRel = next ? next.index - startIdx : appendix.length;
    const rawBody = appendix.slice(sliceStart, bodyEndRel);
    const isExhaustion = h.name === "Indebolimento";
    let bodyMd = cleanBodyLines(rawBody, { dropOrphanExhaustionBullets: isExhaustion });

    // Pietrificato: OCR misplaced the poison-immunity bullet after Indebolimento chrome
    if (h.name === "Pietrificato" && !/immune ai veleni/i.test(bodyMd)) {
      bodyMd = `${bodyMd}\n* La creatura è immune ai veleni e alle malattie, ma gli eventuali veleni o malattie già presenti nel suo sistema vengono solo sospesi, non neutralizzati.`;
    }

    const effects = extractEffects(bodyMd);
    records.push({
      kind: "condition",
      slug: slugifyRulesCatalogName(h.name),
      name: h.name,
      nameAliases: [h.name.toUpperCase()],
      sourceBook: SOURCE_BOOK,
      sourceFile: SOURCE_FILE,
      sourceLabel: SOURCE_LABEL,
      parentSection: PARENT_SECTION,
      headingLevel: h.level,
      headingRaw: h.raw,
      bodyMd,
      bodyHash: hashBody(bodyMd),
      facets: effects.length > 0 ? { effects } : {},
      extractionVersion: RULES_CATALOG_EXTRACTION_VERSION,
    });
  }

  return records;
}

export function expectedPhbConditionSlugs(): string[] {
  return PHB_CONDITIONS.map((n) => slugifyRulesCatalogName(n));
}
