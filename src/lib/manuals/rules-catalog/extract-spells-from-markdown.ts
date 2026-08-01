import {
  hasMarkdownSpellStatBlock,
  normalizeHeadingForExactMatch,
} from "@/lib/manual-search-spell-helpers";
import {
  cleanCatalogBodyLines,
  findAtxHeadings,
  hashBody,
  nextSameOrHigherHeading,
  sliceHeadingBody,
} from "@/lib/manuals/rules-catalog/extract-shared";
import {
  getSourceById,
  SPELL_CATALOG_SOURCE_IDS,
  type RulesCatalogSource,
  type RulesCatalogSourceId,
} from "@/lib/manuals/rules-catalog/sources";
import {
  RULES_CATALOG_EXTRACTION_VERSION,
  slugifyRulesCatalogName,
  type RulesCatalogFacets,
  type RulesCatalogRecord,
} from "@/lib/manuals/rules-catalog/types";

/** Heading di sezione, non schede singole. */
const SPELL_TITLE_SKIP_RE =
  /^(DESCRIZIONI|LISTA|INCANTESIMI|TRUCCHETTI|PREPARARE E LANCIARE|LIBRO|LIBRI)\b/i;

const LEVEL_SCHOOL_RE =
  /^\*?\*?(Trucchetto|[A-Za-zÀ-ÿ]+(?:\s+di\s+\d+°\s+livello)?|[A-Za-zÀ-ÿ]+\s+di\s+\d+°\s+livello)\*?\*?/i;

function parseSpellFacets(bodyLines: string[]): RulesCatalogFacets {
  const facets: RulesCatalogFacets = {};
  for (const line of bodyLines.slice(0, 8)) {
    const t = line.trim();
    if (!t || t.startsWith("**Tempo") || t.startsWith("**Gittata")) continue;
    const schoolLevel = t.replace(/^\*+|\*+$/g, "").trim();
    if (/trucchetto/i.test(schoolLevel)) {
      facets.level = 0;
      facets.school = schoolLevel;
      break;
    }
    const m = schoolLevel.match(/(\d+)\s*°\s*livello/i);
    if (m) {
      facets.level = Number(m[1]);
      facets.school = schoolLevel;
      break;
    }
    if (LEVEL_SCHOOL_RE.test(schoolLevel) && schoolLevel.length < 80) {
      facets.school = schoolLevel;
      break;
    }
  }
  return facets;
}

function isPlausibleSpellTitle(title: string): boolean {
  const t = title.trim();
  if (t.length < 2 || t.length > 80) return false;
  if (SPELL_TITLE_SKIP_RE.test(t)) return false;
  if (/^CAPITOLO\b/i.test(t)) return false;
  return true;
}

/**
 * Estrae schede incantesimo da un markdown (heading + Tempo di Lancio / Gittata).
 */
export function extractSpellsFromMarkdown(
  markdown: string,
  source: RulesCatalogSource
): RulesCatalogRecord[] {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const headings = findAtxHeadings(lines);
  const records: RulesCatalogRecord[] = [];
  const seen = new Set<string>();

  for (const h of headings) {
    if (!isPlausibleSpellTitle(h.title)) continue;
    const next = nextSameOrHigherHeading(headings, h);
    // Finestra breve per validare scheda; body completo fino a next same-or-higher
    const peekEnd = Math.min(lines.length, h.lineIndex + 1 + 16);
    const peek = lines.slice(h.lineIndex + 1, peekEnd).join("\n");
    if (!hasMarkdownSpellStatBlock(peek)) continue;

    const rawBody = sliceHeadingBody(lines, h, next);
    if (!hasMarkdownSpellStatBlock(rawBody)) continue;

    const name = h.title.trim();
    const slug = slugifyRulesCatalogName(name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const bodyMd = cleanCatalogBodyLines(`${h.raw}\n${rawBody}`);
    if (!hasMarkdownSpellStatBlock(bodyMd)) continue;

    const facets = parseSpellFacets(rawBody.split("\n"));
    records.push({
      kind: "spell",
      slug,
      name,
      nameAliases: [normalizeHeadingForExactMatch(name)],
      sourceBook: source.sourceBook,
      sourceFile: source.sourceFile,
      sourceLabel: source.sourceLabel,
      parentSection: null,
      headingLevel: h.level,
      headingRaw: h.raw,
      bodyMd,
      bodyHash: hashBody(bodyMd),
      facets,
      extractionVersion: RULES_CATALOG_EXTRACTION_VERSION,
    });
  }

  return records;
}

/** Estrae spell da tutti i manuali in scope (PHB, XGtE, Tasha, Eberron). */
export function extractAllSpellsFromSources(
  loadMarkdown: (sourceId: RulesCatalogSourceId) => string
): RulesCatalogRecord[] {
  const out: RulesCatalogRecord[] = [];
  for (const id of SPELL_CATALOG_SOURCE_IDS) {
    const source = getSourceById(id);
    const md = loadMarkdown(id);
    out.push(...extractSpellsFromMarkdown(md, source));
  }
  return out;
}
