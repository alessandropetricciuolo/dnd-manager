import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { readExcludedManualBookKeysFromAiContextJson } from "@/lib/campaign-ai-context";
import type { Json } from "@/types/database.types";
import {
  PHB_BOOK_KEY,
  PHB_MD_FILE,
  backgroundBySlug,
  classByLabel,
  maxSpellLevelOnSheet,
  raceBySlug,
} from "@/lib/character-build-catalog";

export type CharacterRulesSnapshotV1 = {
  version: 1;
  computedAt: string;
  level: number;
  raceSlug: string | null;
  subclassSlug: string | null;
  classLabel: string | null;
  backgroundSlug: string | null;
  raceTraitsMd: string;
  subraceTraitsMd: string | null;
  classPrivilegesMd: string;
  spellcastingMd: string | null;
  spellsListMd: string | null;
  backgroundRulesMd: string | null;
  warnings: string[];
};

type MkRow = { content: string | null; metadata: Record<string, unknown> | null };

function metaStr(m: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!m || !(key in m)) return null;
  const v = m[key];
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

function metaInt(m: Record<string, unknown> | null | undefined, key: string): number | null {
  const s = metaStr(m, key);
  if (s == null) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function mergeMdChunks(rows: MkRow[]): string {
  const sorted = [...rows].sort((a, b) => {
    const ia = metaInt(a.metadata, "chunk_index");
    const ib = metaInt(b.metadata, "chunk_index");
    if (ia != null && ib != null) return ia - ib;
    if (ia != null) return -1;
    if (ib != null) return 1;
    return 0;
  });
  return sorted
    .map((r) => (typeof r.content === "string" ? r.content.trim() : ""))
    .filter(Boolean)
    .join("\n\n");
}

/** Estrae blocchi ###/## TRUCCHETTI e N° LIVELLO fino al livello massimo (liste cap. 11). */
export function extractSpellListByMaxLevel(raw: string, maxSpellLevel: number): string {
  if (maxSpellLevel < 0 || !raw.trim()) return "";
  const lines = raw.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let take = false;
  for (const line of lines) {
    const trimmed = line.trim();
    const m =
      trimmed.match(/^(#{2,3})\s+(TRUCCHETTI(?:\s*\(LIVELLO\s*0\))?)\s*$/i) ||
      trimmed.match(/^(#{2,3})\s+(\d+)°\s*LIVELLO\s*$/i);
    if (m) {
      if (/TRUCCHETTI/i.test(m[2] ?? "")) {
        take = maxSpellLevel >= 0;
      } else {
        const lvl = Number.parseInt(m[2] ?? "0", 10);
        take = Number.isFinite(lvl) && lvl >= 1 && lvl <= maxSpellLevel;
      }
      if (take) out.push(line);
      continue;
    }
    if (take) out.push(line);
  }
  const text = out.join("\n").trim();
  const MAX = 14_000;
  if (text.length > MAX) {
    return `${text.slice(0, MAX).trim()}\n\n_(Lista troncata per dimensione.)_`;
  }
  return text;
}

function filterExcluded(rows: MkRow[], excluded: string[]): MkRow[] {
  if (!excluded.length) return rows;
  const ex = new Set(excluded);
  return rows.filter((r) => {
    const k = metaStr(r.metadata, "manual_book_key");
    if (k && ex.has(k)) return false;
    return true;
  });
}

async function fetchRowsContentIlike(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  ilike: string,
  excluded: string[]
): Promise<MkRow[]> {
  const { data, error } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>file_name", PHB_MD_FILE)
    .eq("metadata->>manual_book_key", PHB_BOOK_KEY)
    .ilike("content", ilike)
    .limit(36);
  if (error) {
    console.error("[character-rules-snapshot] fetchRowsContentIlike", error);
    return [];
  }
  return filterExcluded((data ?? []) as MkRow[], excluded);
}

async function fetchRowsSectionHeading(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  sectionHeading: string,
  excluded: string[]
): Promise<MkRow[]> {
  const { data, error } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>file_name", PHB_MD_FILE)
    .eq("metadata->>manual_book_key", PHB_BOOK_KEY)
    .eq("metadata->>section_heading", sectionHeading)
    .limit(36);
  if (error) {
    console.error("[character-rules-snapshot] fetchRowsSectionHeading", error);
    return [];
  }
  return filterExcluded((data ?? []) as MkRow[], excluded);
}

async function fetchRowsChapter(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  chapter: string,
  excluded: string[]
): Promise<MkRow[]> {
  const { data, error } = await admin
    .from("manuals_knowledge" as "campaign_characters")
    .select("content, metadata")
    .eq("metadata->>file_name", PHB_MD_FILE)
    .eq("metadata->>manual_book_key", PHB_BOOK_KEY)
    .eq("metadata->>chapter", chapter)
    .limit(80);
  if (error) {
    console.error("[character-rules-snapshot] fetchRowsChapter", error);
    return [];
  }
  return filterExcluded((data ?? []) as MkRow[], excluded);
}

function clipBackgroundRules(md: string): string {
  const MAX = 6_000;
  if (md.length <= MAX) return md;
  return `${md.slice(0, MAX).trim()}\n\n_(Background PHB: testo troncato.)_`;
}

export function parseRulesSnapshot(raw: Json | null): CharacterRulesSnapshotV1 | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  return raw as unknown as CharacterRulesSnapshotV1;
}

export async function recomputeCharacterRulesSnapshot(input: {
  campaignId: string;
  level: number;
  characterClass: string | null;
  raceSlug: string | null;
  subclassSlug: string | null;
  backgroundSlug: string | null;
}): Promise<CharacterRulesSnapshotV1> {
  const warnings: string[] = [];
  const level = Math.max(1, Math.min(20, Math.floor(input.level || 1)));
  const admin = createSupabaseAdminClient();
  const { data: camp } = await admin.from("campaigns").select("ai_context").eq("id", input.campaignId).single();
  const excluded = readExcludedManualBookKeysFromAiContextJson(
    (camp as { ai_context?: Json | null } | null)?.ai_context ?? null
  );
  if (excluded.includes(PHB_BOOK_KEY)) {
    warnings.push("Manuale del Giocatore escluso nei paletti campagna: snapshot regole vuoto.");
    return {
      version: 1,
      computedAt: new Date().toISOString(),
      level,
      raceSlug: input.raceSlug,
      subclassSlug: input.subclassSlug,
      classLabel: input.characterClass,
      backgroundSlug: input.backgroundSlug,
      raceTraitsMd: "",
      subraceTraitsMd: null,
      classPrivilegesMd: "",
      spellcastingMd: null,
      spellsListMd: null,
      backgroundRulesMd: null,
      warnings,
    };
  }

  const classDef = classByLabel(input.characterClass);
  const raceDef = raceBySlug(input.raceSlug);
  const bgDef = backgroundBySlug(input.backgroundSlug);

  let raceTraitsMd = "";
  if (raceDef) {
    if (raceDef.traitsContentAnchor) {
      const rows = await fetchRowsContentIlike(admin, `%${raceDef.traitsContentAnchor}%`, excluded);
      raceTraitsMd = mergeMdChunks(rows);
    } else {
      const rows = await fetchRowsSectionHeading(admin, raceDef.traitsSectionHeading, excluded);
      raceTraitsMd = mergeMdChunks(rows);
    }
    if (!raceTraitsMd.trim()) warnings.push(`Tratti razza non trovati in manuals_knowledge per «${raceDef.label}».`);
  }

  let subraceTraitsMd: string | null = null;
  if (raceDef?.subraces?.length && input.subclassSlug?.trim()) {
    const sr = raceDef.subraces.find((s) => s.slug === input.subclassSlug);
    if (sr) {
      const rows = await fetchRowsSectionHeading(admin, sr.sectionHeading, excluded);
      subraceTraitsMd = mergeMdChunks(rows) || null;
      if (!subraceTraitsMd?.trim())
        warnings.push(`Sottorazza «${sr.label}»: nessun estratto trovato (ingest PHB?).`);
    }
  }

  let classPrivilegesMd = "";
  if (classDef) {
    const rows = await fetchRowsContentIlike(admin, `%${classDef.privilegesAnchor}%`, excluded);
    classPrivilegesMd = mergeMdChunks(rows);
    if (!classPrivilegesMd.trim())
      warnings.push(`Privilegi di classe non trovati per «${classDef.label}». Verifica ingest ${PHB_MD_FILE}.`);
  }

  let spellcastingMd: string | null = null;
  if (classDef?.spellcastingAnchor) {
    const rows = await fetchRowsContentIlike(admin, `%${classDef.spellcastingAnchor}%`, excluded);
    spellcastingMd = mergeMdChunks(rows) || null;
    if (!spellcastingMd?.trim()) warnings.push(`Regole incantesimi di classe non trovate per «${classDef.label}».`);
  }

  let spellsListMd: string | null = null;
  const maxSpl = maxSpellLevelOnSheet(classDef, level);
  if (classDef?.spellList && maxSpl >= 0) {
    let listRows: MkRow[] = [];
    if (classDef.spellList.style === "h1") {
      listRows = await fetchRowsChapter(admin, classDef.spellList.chapter, excluded);
    } else {
      listRows = await fetchRowsSectionHeading(admin, classDef.spellList.sectionHeading, excluded);
    }
    const mergedList = mergeMdChunks(listRows);
    spellsListMd = extractSpellListByMaxLevel(mergedList, maxSpl) || null;
    if (!spellsListMd?.trim())
      warnings.push(`Lista incantesimi non trovata o vuota per «${classDef.label}» (capitolo PHB).`);
  }

  let backgroundRulesMd: string | null = null;
  if (bgDef) {
    const rows = await fetchRowsContentIlike(admin, `%${bgDef.opener}%`, excluded);
    const merged = mergeMdChunks(rows);
    backgroundRulesMd = merged.trim() ? clipBackgroundRules(merged) : null;
    if (!backgroundRulesMd?.trim()) warnings.push(`Background PHB «${bgDef.label}»: estratto non trovato.`);
  }

  return {
    version: 1,
    computedAt: new Date().toISOString(),
    level,
    raceSlug: input.raceSlug,
    subclassSlug: input.subclassSlug,
    classLabel: input.characterClass,
    backgroundSlug: input.backgroundSlug,
    raceTraitsMd,
    subraceTraitsMd,
    classPrivilegesMd,
    spellcastingMd,
    spellsListMd,
    backgroundRulesMd,
    warnings,
  };
}
