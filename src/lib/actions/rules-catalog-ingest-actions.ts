"use server";

import fs from "fs";
import path from "path";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { extractPhbConditionsFromMarkdown } from "@/lib/manuals/rules-catalog/extract-phb-conditions";
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

function resolvePlayerHandbookPath(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "manuals", "manuale_giocatore.md"),
    path.join(cwd, "dnd-manager", "public", "manuals", "manuale_giocatore.md"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

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

/**
 * Estrae le condizioni PHB Appendice A e le upserta in `rules_catalog`.
 * Non tocca `manuals_knowledge`.
 */
export async function ingestRulesCatalogConditionsAction(): Promise<IngestRulesCatalogResult> {
  const gate = await assertAdminForRulesCatalog();
  if (!gate.ok) return { success: false, message: gate.message };

  const filePath = resolvePlayerHandbookPath();
  if (!filePath) {
    return { success: false, message: "File non trovato: public/manuals/manuale_giocatore.md" };
  }

  let records: RulesCatalogRecord[];
  try {
    const markdown = fs.readFileSync(filePath, "utf8");
    records = extractPhbConditionsFromMarkdown(markdown);
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Estrazione condizioni fallita.",
    };
  }

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
