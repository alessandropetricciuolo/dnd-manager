import type { Json } from "@/types/database.types";

export const RULES_CATALOG_EXTRACTION_VERSION = "rules-catalog-v2";

export const RULES_CATALOG_KINDS = [
  "condition",
  "spell",
  "feature",
  "rule",
  "trait",
  "item",
] as const;

export type RulesCatalogKind = (typeof RULES_CATALOG_KINDS)[number];

export type RulesCatalogFacets = {
  effects?: string[];
  [key: string]: Json | undefined;
};

export type RulesCatalogRecord = {
  kind: RulesCatalogKind;
  slug: string;
  name: string;
  nameAliases: string[];
  sourceBook: string;
  sourceFile: string;
  sourceLabel: string;
  parentSection: string | null;
  headingLevel: number | null;
  headingRaw: string | null;
  bodyMd: string;
  bodyHash: string;
  facets: RulesCatalogFacets;
  extractionVersion: string;
};

export type RulesCatalogDefinition = {
  name: string;
  sourceLabel: string | null;
  bodyMd: string;
  facets: RulesCatalogFacets;
  kind: RulesCatalogKind;
  slug: string;
  sourceBook?: string | null;
};

export type RulesCatalogAlternative = {
  name: string;
  sourceLabel: string | null;
  slug: string;
  kind: RulesCatalogKind;
  sourceBook?: string | null;
};

/** Slug stabile IT: lower, spazi → `-`, collassa non-alfanumerici. */
export function slugifyRulesCatalogName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
