"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { extractPhbConditionsFromMarkdown } from "@/lib/manuals/rules-catalog/extract-phb-conditions";
import {
  extractDmgCuratedRulesFromMarkdown,
  extractPhbCuratedRulesFromMarkdown,
} from "@/lib/manuals/rules-catalog/extract-curated-rules";
import { extractSpellsFromMarkdown } from "@/lib/manuals/rules-catalog/extract-spells-from-markdown";
import {
  getSourceById,
  readManualMarkdown,
  SPELL_CATALOG_SOURCE_IDS,
  type RulesCatalogSourceId,
} from "@/lib/manuals/rules-catalog/sources";
import type { RulesCatalogRecord } from "@/lib/manuals/rules-catalog/types";
import type { Database } from "@/types/database.types";

export type IngestRulesCatalogResult =
  | {
      success: true;
      inserted: number;
      updated: number;
      skipped: number;
      total: number;
      names: string[];
    }
  | { success: false; message: string };

async function assertAdminForRulesCatalog(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, message: "Devi essere autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "admin") {
    return { ok: false, message: "Solo gli amministratori possono eseguire l’ingest del catalogo regole." };
  }
  return { ok: true };
}

function toDbRow(record: RulesCatalogRecord): Database["public"]["Tables"]["rules_catalog"]["Insert"] {
  return {
    kind: record.kind,
    slug: record.slug,
    name: record.name,
    name_aliases: record.nameAliases,
    source_book: record.sourceBook,
    source_file: record.sourceFile,
    source_label: record.sourceLabel,
    parent_section: record.parentSection,
    heading_level: record.headingLevel,
    heading_raw: record.headingRaw,
    body_md: record.bodyMd,
    body_hash: record.bodyHash,
    facets: record.facets as Database["public"]["Tables"]["rules_catalog"]["Insert"]["facets"],
    extraction_version: record.extractionVersion,
  };
}

async function upsertRecords(records: RulesCatalogRecord[]): Promise<IngestRulesCatalogResult> {
  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Client admin Supabase non disponibile.",
    };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const { data: existing, error: selErr } = await admin
      .from("rules_catalog")
      .select("id, body_hash")
      .eq("kind", record.kind)
      .eq("source_book", record.sourceBook)
      .eq("slug", record.slug)
      .maybeSingle();

    if (selErr) {
      return { success: false, message: `Lookup catalogo: ${selErr.message}` };
    }

    if (existing && (existing as { body_hash: string }).body_hash === record.bodyHash) {
      skipped += 1;
      continue;
    }

    const row = toDbRow(record);
    if (existing) {
      const { error } = await admin
        .from("rules_catalog")
        .update(row as never)
        .eq("id", (existing as { id: string }).id);
      if (error) return { success: false, message: `Update ${record.slug}: ${error.message}` };
      updated += 1;
    } else {
      const { error } = await admin.from("rules_catalog").insert(row as never);
      if (error) return { success: false, message: `Insert ${record.slug}: ${error.message}` };
      inserted += 1;
    }
  }

  return {
    success: true,
    inserted,
    updated,
    skipped,
    total: records.length,
    names: records.map((r) => r.name),
  };
}

function mergeResults(parts: IngestRulesCatalogResult[]): IngestRulesCatalogResult {
  const ok = parts.filter((p): p is Extract<IngestRulesCatalogResult, { success: true }> => p.success);
  const fail = parts.find((p) => !p.success);
  if (fail && !fail.success) return fail;
  return {
    success: true,
    inserted: ok.reduce((s, p) => s + p.inserted, 0),
    updated: ok.reduce((s, p) => s + p.updated, 0),
    skipped: ok.reduce((s, p) => s + p.skipped, 0),
    total: ok.reduce((s, p) => s + p.total, 0),
    names: ok.flatMap((p) => p.names).slice(0, 80),
  };
}

/**
 * Estrae le condizioni PHB Appendice A e le upserta in `rules_catalog`.
 * Non tocca `manuals_knowledge`.
 */
export async function ingestRulesCatalogConditionsAction(): Promise<IngestRulesCatalogResult> {
  const gate = await assertAdminForRulesCatalog();
  if (!gate.ok) return { success: false, message: gate.message };

  let records: RulesCatalogRecord[];
  try {
    const markdown = readManualMarkdown(getSourceById("player_handbook").sourceFile);
    records = extractPhbConditionsFromMarkdown(markdown);
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Estrazione condizioni fallita.",
    };
  }

  return upsertRecords(records);
}

/**
 * Estrae schede incantesimo da PHB + XGtE + Tasha + Eberron.
 */
export async function ingestRulesCatalogSpellsAction(): Promise<IngestRulesCatalogResult> {
  const gate = await assertAdminForRulesCatalog();
  if (!gate.ok) return { success: false, message: gate.message };

  const records: RulesCatalogRecord[] = [];
  try {
    for (const id of SPELL_CATALOG_SOURCE_IDS) {
      const source = getSourceById(id);
      const md = readManualMarkdown(source.sourceFile);
      records.push(...extractSpellsFromMarkdown(md, source));
    }
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Estrazione incantesimi fallita.",
    };
  }

  if (records.length < 50) {
    return {
      success: false,
      message: `Troppi pochi spell estratti (${records.length}). Controlla i file markdown.`,
    };
  }

  return upsertRecords(records);
}

/** Regole curate PHB (copertura, riposo, azioni…). */
export async function ingestRulesCatalogPhbRulesAction(): Promise<IngestRulesCatalogResult> {
  const gate = await assertAdminForRulesCatalog();
  if (!gate.ok) return { success: false, message: gate.message };

  let records: RulesCatalogRecord[];
  try {
    const md = readManualMarkdown(getSourceById("player_handbook").sourceFile);
    records = extractPhbCuratedRulesFromMarkdown(md);
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Estrazione regole PHB fallita.",
    };
  }

  return upsertRecords(records);
}

/** Regole curate DMG (inseguimenti, follia, trappole…). */
export async function ingestRulesCatalogDmgRulesAction(): Promise<IngestRulesCatalogResult> {
  const gate = await assertAdminForRulesCatalog();
  if (!gate.ok) return { success: false, message: gate.message };

  let records: RulesCatalogRecord[];
  try {
    const md = readManualMarkdown(getSourceById("dungeon_masters_guide").sourceFile);
    records = extractDmgCuratedRulesFromMarkdown(md);
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Estrazione regole DMG fallita.",
    };
  }

  return upsertRecords(records);
}

/** Orchestra condizioni + spell + regole PHB/DMG. */
export async function ingestRulesCatalogAllAction(): Promise<IngestRulesCatalogResult> {
  const gate = await assertAdminForRulesCatalog();
  if (!gate.ok) return { success: false, message: gate.message };

  const parts: IngestRulesCatalogResult[] = [];
  parts.push(await ingestRulesCatalogConditionsAction());
  if (!parts[parts.length - 1]!.success) return parts[parts.length - 1]!;
  parts.push(await ingestRulesCatalogSpellsAction());
  if (!parts[parts.length - 1]!.success) return parts[parts.length - 1]!;
  parts.push(await ingestRulesCatalogPhbRulesAction());
  if (!parts[parts.length - 1]!.success) return parts[parts.length - 1]!;
  parts.push(await ingestRulesCatalogDmgRulesAction());
  if (!parts[parts.length - 1]!.success) return parts[parts.length - 1]!;
  return mergeResults(parts);
}

/** Helper test / tooling: carica markdown per source id. */
export function loadRulesCatalogSourceMarkdown(id: RulesCatalogSourceId): string {
  return readManualMarkdown(getSourceById(id).sourceFile);
}
