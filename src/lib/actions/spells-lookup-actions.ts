"use server";

import fs from "fs";
import path from "path";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { PHB_MD_FILE } from "@/lib/character-build-catalog";
import {
  buildSpellNameIndexFromMarkdown,
  extractSpellEntryFromMarkdown,
  hasMarkdownSpellStatBlock,
  normalizeHeadingForExactMatch,
  resolveSpellNameFromIndex,
  suggestSpellNamesFromIndex,
} from "@/lib/manual-search-spell-helpers";
import {
  extractPhbSpellMarkdown,
  getPhbMarkdownText,
  getManualMarkdownByFileName,
  preloadPhbMarkdown,
  preloadManualMarkdownFile,
} from "@/lib/server/phb-spell-excerpt";
import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";
import {
  getRulesCatalogSpellAction,
  suggestRulesCatalogNamesAction,
} from "@/lib/actions/rules-catalog-lookup-actions";
import {
  SPELL_CATALOG_SOURCE_IDS,
  getSourceById,
} from "@/lib/manuals/rules-catalog/sources";

export type SpellAlternative = { name: string; sourceLabel?: string | null };

export type SpellDefinitionResult =
  | {
      success: true;
      name: string;
      bodyMd: string;
      sourceLabel: string;
      alternatives: SpellAlternative[];
    }
  | { success: false; message: string; notFound?: boolean };

export type SpellSuggestResult =
  | { success: true; names: string[] }
  | { success: false; message: string };

async function assertGmOrAdmin(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return { ok: false, message: "Devi essere autenticato." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "gm") {
    return { ok: false, message: "Solo GM e amministratori possono consultare gli incantesimi." };
  }
  return { ok: true };
}

function readPhbMarkdownFromDisk(): string {
  const candidates = [
    path.join(process.cwd(), "public", "manuals", PHB_MD_FILE),
    path.join(process.cwd(), "dnd-manager", "public", "manuals", PHB_MD_FILE),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const t = fs.readFileSync(p, "utf-8");
        if (t.length > 5000) return t;
      }
    } catch {
      /* next */
    }
  }
  return "";
}

async function loadPhbMarkdown(): Promise<string> {
  const fromDisk = readPhbMarkdownFromDisk();
  if (fromDisk.length > 5000) return fromDisk;

  let origin: string | null = null;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) origin = `${proto}://${host}`;
  } catch {
    /* no request context */
  }

  try {
    await preloadPhbMarkdown(origin);
  } catch {
    /* ignore */
  }
  const cached = getPhbMarkdownText();
  if (cached.length > 5000) return cached;
  return fromDisk || cached;
}

async function loadAllSpellManuals(): Promise<{ file: string; label: string; md: string }[]> {
  let origin: string | null = null;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) origin = `${proto}://${host}`;
  } catch {
    /* */
  }

  const out: { file: string; label: string; md: string }[] = [];
  for (const id of SPELL_CATALOG_SOURCE_IDS) {
    const source = getSourceById(id);
    try {
      await preloadManualMarkdownFile(source.sourceFile, origin);
    } catch {
      /* */
    }
    const md = getManualMarkdownByFileName(source.sourceFile);
    if (md.length > 1000) {
      out.push({ file: source.sourceFile, label: source.sourceLabel, md });
    }
  }
  if (out.length === 0) {
    const phb = await loadPhbMarkdown();
    if (phb.length > 1000) {
      out.push({
        file: PHB_MD_FILE,
        label: "Manuale del Giocatore",
        md: phb,
      });
    }
  }
  return out;
}

function findRelatedSpellNames(queryNorm: string, index: Map<string, string>): string[] {
  const related: string[] = [];
  for (const [key, title] of index) {
    if (key === queryNorm) continue;
    if (key.startsWith(queryNorm + " ") || key.includes(" " + queryNorm + " ")) {
      related.push(title);
    } else if (key.startsWith(queryNorm) && key.length > queryNorm.length) {
      related.push(title);
    }
  }
  related.sort((a, b) => a.length - b.length || a.localeCompare(b, "it"));
  return related.slice(0, 6);
}

function extractSpellBody(md: string, spellName: string): string {
  if (!md.trim() || !spellName.trim()) return "";
  const fromHelper = extractSpellEntryFromMarkdown(md, spellName);
  if (fromHelper.trim() && hasMarkdownSpellStatBlock(fromHelper)) return fromHelper.trim();
  const fromExcerpt = extractPhbSpellMarkdown(spellName);
  if (fromExcerpt.trim() && hasMarkdownSpellStatBlock(fromExcerpt)) return fromExcerpt.trim();
  if (fromHelper.trim()) return fromHelper.trim();
  return fromExcerpt.trim();
}

function mergeNameIndexes(
  manuals: { md: string }[]
): Map<string, string> {
  const index = new Map<string, string>();
  for (const m of manuals) {
    const part = buildSpellNameIndexFromMarkdown(m.md);
    for (const [k, v] of part) {
      if (!index.has(k)) index.set(k, v);
    }
  }
  return index;
}

/**
 * Lookup definizione ufficiale di un incantesimo.
 * 1) rules_catalog kind=spell (priorità PHB)
 * 2) fallback MD multi-manuale
 * 3) RAG solo con scheda Tempo di Lancio / Gittata
 */
export async function searchSpellDefinitionAction(query: string): Promise<SpellDefinitionResult> {
  const gate = await assertGmOrAdmin();
  if (!gate.ok) return { success: false, message: gate.message };

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { success: false, message: "Inserisci almeno 2 caratteri." };
  }

  const queryNorm = normalizeHeadingForExactMatch(trimmed);

  // 1) Catalogo DB
  const catalog = await getRulesCatalogSpellAction(trimmed);
  if (catalog.success && hasMarkdownSpellStatBlock(catalog.definition.bodyMd)) {
    const alts: SpellAlternative[] = catalog.alternatives.map((a) => ({
      name: a.name,
      sourceLabel: a.sourceLabel,
    }));
    // Correlati per nome (es. ritardata) via suggest
    const relatedSuggest = await suggestRulesCatalogNamesAction({
      prefix: catalog.definition.name.split(/\s+/).slice(0, 3).join(" "),
      kind: "spell",
      limit: 8,
    });
    if (relatedSuggest.success) {
      for (const n of relatedSuggest.names) {
        if (n.toLowerCase() === catalog.definition.name.toLowerCase()) continue;
        if (alts.some((a) => a.name.toLowerCase() === n.toLowerCase())) continue;
        const normN = normalizeHeadingForExactMatch(n);
        const normP = normalizeHeadingForExactMatch(catalog.definition.name);
        if (normN.startsWith(normP) || normP.startsWith(normN.split(" ")[0] ?? "")) {
          alts.push({ name: n });
        }
      }
    }
    return {
      success: true,
      name: catalog.definition.name,
      bodyMd: catalog.definition.bodyMd,
      sourceLabel: catalog.definition.sourceLabel ?? "Catalogo incantesimi",
      alternatives: alts.slice(0, 8),
    };
  }

  // 2) Fallback MD multi-manuale
  const manuals = await loadAllSpellManuals();
  const index = mergeNameIndexes(manuals);
  const canonical = resolveSpellNameFromIndex(trimmed, index) ?? trimmed;

  for (const manual of manuals) {
    const body = extractSpellBody(manual.md, canonical);
    if (body && hasMarkdownSpellStatBlock(body)) {
      const related = findRelatedSpellNames(normalizeHeadingForExactMatch(canonical), index);
      return {
        success: true,
        name: canonical,
        bodyMd: body,
        sourceLabel: manual.label,
        alternatives: related.map((name) => ({ name })),
      };
    }
  }

  if (canonical !== trimmed) {
    for (const manual of manuals) {
      const body2 = extractSpellBody(manual.md, trimmed);
      if (body2 && hasMarkdownSpellStatBlock(body2)) {
        return {
          success: true,
          name: trimmed,
          bodyMd: body2,
          sourceLabel: manual.label,
          alternatives: findRelatedSpellNames(queryNorm, index).map((name) => ({ name })),
        };
      }
    }
  }

  // 3) RAG
  const rag = await searchManualsSemanticAction(trimmed);
  if (!rag.success) {
    return { success: false, message: rag.message };
  }

  const candidates = [
    rag.primaryText,
    ...rag.hits.map((h) => h.content),
  ].filter((t): t is string => typeof t === "string" && t.trim().length > 0);

  for (const text of candidates) {
    if (!hasMarkdownSpellStatBlock(text)) continue;
    const heading = text.match(/^#{1,6}\s+(.+)$/m)?.[1]?.trim();
    const headingNorm = heading ? normalizeHeadingForExactMatch(heading) : "";
    if (
      headingNorm &&
      queryNorm &&
      headingNorm !== queryNorm &&
      !headingNorm.startsWith(queryNorm) &&
      !queryNorm.startsWith(headingNorm)
    ) {
      continue;
    }
    return {
      success: true,
      name: heading || canonical,
      bodyMd: text.trim(),
      sourceLabel: rag.hits[0]?.sourceLabel ?? "Manuali",
      alternatives: findRelatedSpellNames(queryNorm, index).map((name) => ({ name })),
    };
  }

  const relatedOnly = findRelatedSpellNames(queryNorm, index);
  if (relatedOnly.length > 0) {
    return {
      success: false,
      message: `Scheda «${trimmed}» non trovata. Prova: ${relatedOnly.join(", ")}.`,
      notFound: true,
    };
  }

  if (catalog.success === false && catalog.notFound) {
    return {
      success: false,
      message: `Nessun incantesimo ufficiale trovato per «${trimmed}». Se il catalogo è vuoto, in Admin → Knowledge esegui «Incantesimi».`,
      notFound: true,
    };
  }

  return {
    success: false,
    message: `Nessun incantesimo ufficiale trovato per «${trimmed}».`,
    notFound: true,
  };
}

/**
 * Suggerimenti nomi: catalogo spell prima, poi indice MD.
 */
export async function suggestSpellNamesAction(prefix: string): Promise<SpellSuggestResult> {
  const gate = await assertGmOrAdmin();
  if (!gate.ok) return { success: false, message: gate.message };

  const trimmed = prefix.trim();
  if (trimmed.length < 2) return { success: true, names: [] };

  const fromCatalog = await suggestRulesCatalogNamesAction({
    prefix: trimmed,
    kind: "spell",
    limit: 12,
  });
  if (fromCatalog.success && fromCatalog.names.length > 0) {
    return { success: true, names: fromCatalog.names };
  }

  const manuals = await loadAllSpellManuals();
  if (manuals.length === 0) return { success: true, names: [] };
  const index = mergeNameIndexes(manuals);
  return { success: true, names: suggestSpellNamesFromIndex(trimmed, index, 12) };
}
