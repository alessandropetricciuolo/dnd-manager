import {
  cleanCatalogBodyLines,
  findAtxHeadings,
  hashBody,
  normalizeRuleHeading,
  nextSameOrHigherHeading,
  sliceHeadingBody,
  type MdHeadingHit,
} from "@/lib/manuals/rules-catalog/extract-shared";
import {
  getSourceById,
  type RulesCatalogSource,
} from "@/lib/manuals/rules-catalog/sources";
import {
  RULES_CATALOG_EXTRACTION_VERSION,
  slugifyRulesCatalogName,
  type RulesCatalogRecord,
} from "@/lib/manuals/rules-catalog/types";

type AllowEntry = {
  /** Titolo normalizzato (UPPER, senza diacritici). */
  match: string;
  /** Nome display catalogo (opzionale; default = titolo heading). */
  name?: string;
  aliases?: string[];
  /**
   * Se impostato, accetta solo heading dopo un titolo con questo norm
   * e prima di `beforeNorm` (se presente).
   */
  afterNorm?: string;
  beforeNorm?: string;
};

/** Regole PHB da tavolo (allowlist). */
export const PHB_RULE_ALLOWLIST: AllowEntry[] = [
  { match: "RIPOSO BREVE", aliases: ["Short Rest"] },
  { match: "RIPOSO LUNGO", aliases: ["Long Rest"] },
  { match: "AZIONI IN COMBATTIMENTO", aliases: ["Combat Actions", "Azioni"] },
  {
    match: "AIUTO",
    aliases: ["Help"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "ATTACCO",
    aliases: ["Attack"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "CERCARE",
    aliases: ["Search"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "DISIMPEGNO",
    aliases: ["Disengage"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "LANCIARE UN INCANTESIMO",
    aliases: ["Cast a Spell"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "NASCONDERSI",
    aliases: ["Hide"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "PREPARARSI",
    aliases: ["Ready"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "SCATTO",
    aliases: ["Dash"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "SCHIVATA",
    aliases: ["Dodge"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  {
    match: "USARE UN OGGETTO",
    aliases: ["Use an Object"],
    afterNorm: "AZIONI IN COMBATTIMENTO",
    beforeNorm: "COPERTURA",
  },
  { match: "COPERTURA", aliases: ["Cover", "Mezza copertura", "Tre quarti di copertura"] },
];

/** Regole DMG curate (allowlist). */
export const DMG_RULE_ALLOWLIST: AllowEntry[] = [
  { match: "COPERTURA", aliases: ["Cover"] },
  { match: "INSEGUIMENTI", aliases: ["Chases", "Inseguimento"] },
  { match: "INIZIARE UN INSEGUIMENTO" },
  { match: "CONDURRE L INSEGUIMENTO", aliases: ["CONDURRE L'INSEGUIMENTO"] },
  { match: "CONCLUDERE UN INSEGUIMENTO" },
  { match: "MALATTIE", aliases: ["Diseases"] },
  { match: "FOLLIA", aliases: ["Madness"] },
  { match: "FOLLIA TEMPORANEA" },
  { match: "FOLLIA DURATURA" },
  { match: "CURARE LA FOLLIA" },
  { match: "TRAPPOLE", aliases: ["Traps"] },
  { match: "TRAPPOLE NEL GIOCO" },
  { match: "INDIVIDUARE E DISINNESCARE UNA TRAPPOLA" },
  { match: "VISIBILITA", aliases: ["VISIBILITÀ", "Visibility"] },
  { match: "VISIBILITA SOTT ACQUA", aliases: ["VISIBILITÀ SOTT'ACQUA"] },
  { match: "VISIBILITA ALL ESTERNO", aliases: ["VISIBILITÀ ALL'ESTERNO"] },
];

function displayName(heading: MdHeadingHit, entry: AllowEntry): string {
  if (entry.name) return entry.name;
  return heading.title.trim();
}

function findLineIndexByNorm(headings: MdHeadingHit[], norm: string): number {
  const hit = headings.find((h) => normalizeRuleHeading(h.title) === norm);
  return hit?.lineIndex ?? -1;
}

function extractAllowlistedRules(
  markdown: string,
  source: RulesCatalogSource,
  allowlist: AllowEntry[],
  parentSection: string | null
): RulesCatalogRecord[] {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const headings = findAtxHeadings(lines);
  const records: RulesCatalogRecord[] = [];
  const seen = new Set<string>();

  for (const entry of allowlist) {
    const primaryNorm = normalizeRuleHeading(entry.match);
    const afterIdx = entry.afterNorm
      ? findLineIndexByNorm(headings, normalizeRuleHeading(entry.afterNorm))
      : -1;
    const beforeIdx = entry.beforeNorm
      ? findLineIndexByNorm(headings, normalizeRuleHeading(entry.beforeNorm))
      : Number.POSITIVE_INFINITY;

    const heading = headings.find((h) => {
      const n = normalizeRuleHeading(h.title);
      if (n !== primaryNorm) return false;
      if (entry.afterNorm && (afterIdx < 0 || h.lineIndex <= afterIdx)) return false;
      if (entry.beforeNorm && h.lineIndex >= beforeIdx) return false;
      return true;
    });
    if (!heading) continue;

    const slug = slugifyRulesCatalogName(entry.match);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);

    const next = nextSameOrHigherHeading(headings, heading);
    const rawBody = sliceHeadingBody(lines, heading, next);
    const name = displayName(heading, entry);
    const bodyMd = cleanCatalogBodyLines(`${heading.raw}\n${rawBody}`);
    if (bodyMd.trim().length < 20) continue;

    const aliases = Array.from(
      new Set([
        normalizeRuleHeading(name),
        ...(entry.aliases ?? []).map((a) => normalizeRuleHeading(a)),
        name,
      ])
    );

    records.push({
      kind: "rule",
      slug,
      name,
      nameAliases: aliases,
      sourceBook: source.sourceBook,
      sourceFile: source.sourceFile,
      sourceLabel: source.sourceLabel,
      parentSection,
      headingLevel: heading.level,
      headingRaw: heading.raw,
      bodyMd,
      bodyHash: hashBody(bodyMd),
      facets: {},
      extractionVersion: RULES_CATALOG_EXTRACTION_VERSION,
    });
  }

  return records;
}

export function extractPhbCuratedRulesFromMarkdown(markdown: string): RulesCatalogRecord[] {
  return extractAllowlistedRules(
    markdown,
    getSourceById("player_handbook"),
    PHB_RULE_ALLOWLIST,
    "Regole PHB"
  );
}

export function extractDmgCuratedRulesFromMarkdown(markdown: string): RulesCatalogRecord[] {
  return extractAllowlistedRules(
    markdown,
    getSourceById("dungeon_masters_guide"),
    DMG_RULE_ALLOWLIST,
    "Regole DMG"
  );
}
