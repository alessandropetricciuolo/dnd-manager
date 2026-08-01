"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { PHB_MD_FILE } from "@/lib/character-build-catalog";
import {
  buildSpellNameIndexFromMarkdown,
  extractSpellEntryFromMarkdown,
  normalizeHeadingForExactMatch,
} from "@/lib/manual-search-spell-helpers";
import { extractPhbSpellMarkdown, preloadPhbMarkdown, getPhbMarkdownText } from "@/lib/server/phb-spell-excerpt";
import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";

export type SpellDefinitionResult =
  | {
      success: true;
      name: string;
      bodyMd: string;
      sourceLabel: string;
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

function getSpellIndex(): Map<string, string> {
  const md = getPhbMarkdownText();
  if (!md || md.length < 1000) return new Map();
  return buildSpellNameIndexFromMarkdown(md);
}

function resolveCanonicalSpellName(query: string, index: Map<string, string>): string | null {
  const norm = normalizeHeadingForExactMatch(query);
  if (!norm) return null;
  const exact = index.get(norm);
  if (exact) return exact;

  // Prefisso / contiene (solo se un match univoco o il migliore)
  const hits: string[] = [];
  for (const [key, title] of index) {
    if (key.startsWith(norm) || key.includes(norm)) hits.push(title);
  }
  if (hits.length === 1) return hits[0]!;
  if (hits.length > 1) {
    const starts = hits.filter((t) => normalizeHeadingForExactMatch(t).startsWith(norm));
    if (starts.length === 1) return starts[0]!;
    // Preferisci match più corto (nome più specifico)
    starts.sort((a, b) => a.length - b.length);
    if (starts[0]) return starts[0];
    hits.sort((a, b) => a.length - b.length);
    return hits[0] ?? null;
  }
  return null;
}

/**
 * Lookup definizione ufficiale di un incantesimo (PHB MD, poi fallback ricerca manuali).
 */
export async function searchSpellDefinitionAction(query: string): Promise<SpellDefinitionResult> {
  const gate = await assertGmOrAdmin();
  if (!gate.ok) return { success: false, message: gate.message };

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { success: false, message: "Inserisci almeno 2 caratteri." };
  }

  try {
    await preloadPhbMarkdown();
  } catch {
    /* continua con fallback RAG */
  }

  const index = getSpellIndex();
  const canonical = resolveCanonicalSpellName(trimmed, index) ?? trimmed;

  let body =
    extractPhbSpellMarkdown(canonical) ||
    extractSpellEntryFromMarkdown(getPhbMarkdownText(), canonical);

  if (body.trim()) {
    return {
      success: true,
      name: canonical,
      bodyMd: body.trim(),
      sourceLabel: "Manuale del Giocatore",
    };
  }

  // Fallback: pipeline ricerca manuali (spell-first se riconosciuto)
  const rag = await searchManualsSemanticAction(trimmed);
  if (!rag.success) {
    return { success: false, message: rag.message };
  }
  if (!rag.primaryText?.trim()) {
    return {
      success: false,
      message: `Nessun incantesimo trovato per «${trimmed}».`,
      notFound: true,
    };
  }

  const hitTitle = rag.hits[0]?.sectionTitle?.trim();
  return {
    success: true,
    name: hitTitle || canonical,
    bodyMd: rag.primaryText,
    sourceLabel: rag.hits[0]?.sourceLabel ?? "Manuali",
  };
}

/**
 * Suggerimenti nomi incantesimo PHB per autocompletamento.
 */
export async function suggestSpellNamesAction(prefix: string): Promise<SpellSuggestResult> {
  const gate = await assertGmOrAdmin();
  if (!gate.ok) return { success: false, message: gate.message };

  const trimmed = prefix.trim();
  if (trimmed.length < 2) return { success: true, names: [] };

  try {
    await preloadPhbMarkdown();
  } catch {
    return { success: true, names: [] };
  }

  const index = getSpellIndex();
  const norm = normalizeHeadingForExactMatch(trimmed);
  if (!norm) return { success: true, names: [] };

  const starts: string[] = [];
  const contains: string[] = [];
  for (const [key, title] of index) {
    if (key.startsWith(norm)) starts.push(title);
    else if (key.includes(norm)) contains.push(title);
  }
  starts.sort((a, b) => a.localeCompare(b, "it"));
  contains.sort((a, b) => a.localeCompare(b, "it"));
  const names = [...starts, ...contains].slice(0, 12);
  return { success: true, names };
}

/** Esporta il file PHB usato (debug / UI). */
export async function getSpellSourceFileHint(): Promise<string> {
  return PHB_MD_FILE;
}
