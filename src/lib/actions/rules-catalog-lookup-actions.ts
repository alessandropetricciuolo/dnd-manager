"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { PHB_CONDITIONS } from "@/lib/manuals/phb-conditions";
import { SOURCE_BOOK_PRIORITY } from "@/lib/manuals/rules-catalog/sources";
import {
  slugifyRulesCatalogName,
  type RulesCatalogAlternative,
  type RulesCatalogDefinition,
  type RulesCatalogFacets,
  type RulesCatalogKind,
  RULES_CATALOG_KINDS,
} from "@/lib/manuals/rules-catalog/types";

export type GetRulesCatalogDefinitionResult =
  | {
      success: true;
      definition: RulesCatalogDefinition;
      alternatives: RulesCatalogAlternative[];
    }
  | { success: false; message: string; notFound?: boolean };

type CatalogRow = {
  kind: RulesCatalogKind;
  slug: string;
  name: string;
  name_aliases: string[] | null;
  source_label: string | null;
  source_book: string | null;
  body_md: string;
  facets: RulesCatalogFacets | null;
};

const SELECT_COLS =
  "kind, slug, name, name_aliases, source_label, source_book, body_md, facets";

function isRulesCatalogKind(value: string): value is RulesCatalogKind {
  return (RULES_CATALOG_KINDS as readonly string[]).includes(value);
}

function sourcePriority(book: string | null | undefined): number {
  if (!book) return 99;
  return SOURCE_BOOK_PRIORITY[book] ?? 50;
}

function sortRowsByPriority(rows: CatalogRow[]): CatalogRow[] {
  return [...rows].sort(
    (a, b) =>
      sourcePriority(a.source_book) - sourcePriority(b.source_book) ||
      a.name.localeCompare(b.name, "it")
  );
}

function rowToDefinition(row: CatalogRow): RulesCatalogDefinition {
  return {
    kind: row.kind,
    slug: row.slug,
    name: row.name,
    sourceLabel: row.source_label,
    sourceBook: row.source_book,
    bodyMd: row.body_md,
    facets: row.facets ?? {},
  };
}

function rowToAlternative(row: CatalogRow): RulesCatalogAlternative {
  return {
    kind: row.kind,
    slug: row.slug,
    name: row.name,
    sourceLabel: row.source_label,
    sourceBook: row.source_book,
  };
}

async function assertGmOrAdmin(): Promise<
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
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "gm") {
    return { ok: false, message: "Solo GM e amministratori possono consultare il catalogo regole." };
  }
  return { ok: true };
}

function normalizeQuery(q: string): string {
  return q.trim().replace(/\s+/g, " ");
}

function withKindsFilter<T extends { eq: (c: string, v: string) => T; in: (c: string, v: string[]) => T }>(
  q: T,
  kinds: RulesCatalogKind[] | null
): T {
  if (!kinds || kinds.length === 0) return q;
  if (kinds.length === 1) return q.eq("kind", kinds[0]!);
  return q.in("kind", kinds);
}

async function findCandidates(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  slug: string,
  nameLower: string,
  kinds: RulesCatalogKind[] | null
): Promise<CatalogRow[]> {
  const collected: CatalogRow[] = [];
  const seen = new Set<string>();

  const push = (rows: CatalogRow[]) => {
    for (const r of rows) {
      const key = `${r.kind}|${r.source_book}|${r.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(r);
    }
  };

  {
    const { data, error } = await withKindsFilter(
      admin.from("rules_catalog").select(SELECT_COLS).eq("slug", slug),
      kinds
    ).limit(20);
    if (error) throw new Error(error.message);
    push((data ?? []) as CatalogRow[]);
  }

  {
    const { data, error } = await withKindsFilter(
      admin.from("rules_catalog").select(SELECT_COLS).ilike("name", nameLower),
      kinds
    ).limit(20);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CatalogRow[];
    push(rows.filter((r) => r.name.toLowerCase() === nameLower));
  }

  const aliasCandidates = Array.from(new Set([nameLower, nameLower.toUpperCase(), slug]));
  for (const alias of aliasCandidates) {
    const { data, error } = await withKindsFilter(
      admin.from("rules_catalog").select(SELECT_COLS).contains("name_aliases", [alias]),
      kinds
    ).limit(20);
    if (error) throw new Error(error.message);
    push((data ?? []) as CatalogRow[]);
  }

  // Prefisso nome (es. "copertur")
  if (collected.length === 0 && nameLower.length >= 3) {
    const { data, error } = await withKindsFilter(
      admin.from("rules_catalog").select(SELECT_COLS).ilike("name", `${nameLower}%`),
      kinds
    ).limit(20);
    if (error) throw new Error(error.message);
    push((data ?? []) as CatalogRow[]);
  }

  return sortRowsByPriority(collected);
}

async function fetchConditionsOverview(
  admin: ReturnType<typeof createSupabaseAdminClient>
): Promise<GetRulesCatalogDefinitionResult> {
  const { data: overview, error: ovErr } = await admin
    .from("rules_catalog")
    .select(SELECT_COLS)
    .eq("kind", "rule")
    .eq("slug", "condizioni-overview")
    .eq("source_book", "player_handbook")
    .maybeSingle();

  if (ovErr) {
    return { success: false, message: `Catalogo overview: ${ovErr.message}` };
  }

  const { data: conditions, error: cErr } = await admin
    .from("rules_catalog")
    .select("name, slug")
    .eq("kind", "condition")
    .eq("source_book", "player_handbook")
    .order("name", { ascending: true });

  if (cErr) {
    return { success: false, message: `Catalogo condizioni: ${cErr.message}` };
  }

  const namesFromDb =
    (conditions as { name: string; slug: string }[] | null)?.map((c) => c.name) ?? [];

  if (!overview && namesFromDb.length === 0) {
    return {
      success: false,
      message:
        "Catalogo condizioni vuoto. In Admin → Knowledge esegui «Condizioni PHB» o «Estrai tutto».",
      notFound: true,
    };
  }

  const names = namesFromDb.length > 0 ? namesFromDb : [...PHB_CONDITIONS];
  const listMd = names.map((n) => `* ${n}`).join("\n");
  const overviewBody = (overview as CatalogRow | null)?.body_md?.trim() ?? "";
  const bodyMd = overviewBody
    ? `${overviewBody}\n\n## Elenco condizioni\n\n${listMd}`
    : `## Condizioni (PHB Appendice A)\n\n${listMd}`;

  return {
    success: true,
    definition: {
      kind: "rule",
      slug: "condizioni-overview",
      name: "Condizioni",
      sourceLabel: (overview as CatalogRow | null)?.source_label ?? "PHB Appendice A",
      sourceBook: "player_handbook",
      bodyMd,
      facets: {},
    },
    alternatives: [],
  };
}

/**
 * Ritorna una definizione ufficiale da `rules_catalog`.
 * Se esistono omonimi in più libri, preferisce PHB e espone le alternative.
 */
export async function getRulesCatalogDefinitionAction(input: {
  kind?: RulesCatalogKind | RulesCatalogKind[];
  nameOrSlug: string;
  /** Preferisci un source_book specifico (es. dungeon_masters_guide). */
  preferSourceBook?: string;
}): Promise<GetRulesCatalogDefinitionResult> {
  const gate = await assertGmOrAdmin();
  if (!gate.ok) return { success: false, message: gate.message };

  const raw = normalizeQuery(input.nameOrSlug ?? "");
  if (raw.length < 2) {
    return { success: false, message: "Inserisci almeno 2 caratteri." };
  }

  const kinds: RulesCatalogKind[] | null = input.kind
    ? Array.isArray(input.kind)
      ? input.kind.filter(isRulesCatalogKind)
      : isRulesCatalogKind(input.kind)
        ? [input.kind]
        : null
    : null;

  if (input.kind && (!kinds || kinds.length === 0)) {
    return { success: false, message: "Kind catalogo non valido." };
  }

  const lower = raw.toLowerCase();
  const wantsAllConditions =
    lower === "tutte le condizioni" ||
    lower === "condizioni" ||
    lower === "appendice a: condizioni" ||
    lower === "condizioni-overview";

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Client admin Supabase non disponibile.",
    };
  }

  if (wantsAllConditions) {
    return fetchConditionsOverview(admin);
  }

  try {
    let candidates = await findCandidates(admin, slugifyRulesCatalogName(raw), lower, kinds);
    if (candidates.length === 0) {
      return {
        success: false,
        message: `Nessuna definizione ufficiale per «${raw}».`,
        notFound: true,
      };
    }

    if (input.preferSourceBook) {
      const preferred = candidates.find((c) => c.source_book === input.preferSourceBook);
      if (preferred) {
        candidates = [preferred, ...candidates.filter((c) => c !== preferred)];
      }
    }

    const primary = candidates[0]!;
    const alternatives = candidates
      .slice(1)
      .filter(
        (c) =>
          c.slug === primary.slug ||
          c.name.toLowerCase() === primary.name.toLowerCase() ||
          normalizeLoose(c.name) === normalizeLoose(primary.name)
      )
      .map(rowToAlternative);

    // Anche nomi correlati stesso kind (es. Copertura vs …) se slug diverso ma query matchata
    const relatedExtra = candidates
      .slice(1)
      .filter((c) => !alternatives.some((a) => a.slug === c.slug && a.sourceBook === c.source_book))
      .slice(0, 4)
      .map(rowToAlternative);

    return {
      success: true,
      definition: rowToDefinition(primary),
      alternatives: [...alternatives, ...relatedExtra].slice(0, 8),
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Errore lookup catalogo regole.",
    };
  }
}

function normalizeLoose(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lookup dedicato per una condizione PHB (menu Condizioni GM Screen 2.0).
 */
export async function getRulesCatalogConditionAction(
  nameOrSlug: string
): Promise<GetRulesCatalogDefinitionResult> {
  const lower = normalizeQuery(nameOrSlug).toLowerCase();
  if (
    lower === "all" ||
    lower === "tutte" ||
    lower === "tutte le condizioni" ||
    lower === "condizioni"
  ) {
    return getRulesCatalogDefinitionAction({ nameOrSlug: "tutte le condizioni", kind: "rule" });
  }
  return getRulesCatalogDefinitionAction({
    kind: "condition",
    nameOrSlug,
  });
}

/**
 * Lookup spell da catalogo (`kind: spell`) con priorità PHB.
 */
export async function getRulesCatalogSpellAction(
  nameOrSlug: string
): Promise<GetRulesCatalogDefinitionResult> {
  return getRulesCatalogDefinitionAction({
    kind: "spell",
    nameOrSlug,
  });
}

/**
 * Suggerimenti nomi da catalogo (spell o regole).
 */
export async function suggestRulesCatalogNamesAction(input: {
  prefix: string;
  kind?: RulesCatalogKind | RulesCatalogKind[];
  limit?: number;
}): Promise<{ success: true; names: string[] } | { success: false; message: string }> {
  const gate = await assertGmOrAdmin();
  if (!gate.ok) return { success: false, message: gate.message };

  const prefix = normalizeQuery(input.prefix);
  if (prefix.length < 2) return { success: true, names: [] };

  const kinds: RulesCatalogKind[] | null = input.kind
    ? Array.isArray(input.kind)
      ? input.kind.filter(isRulesCatalogKind)
      : isRulesCatalogKind(input.kind)
        ? [input.kind]
        : null
    : null;

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Client admin Supabase non disponibile.",
    };
  }

  const limit = Math.min(input.limit ?? 12, 24);
  const { data, error } = await withKindsFilter(
    admin.from("rules_catalog").select("name, source_book").ilike("name", `%${prefix}%`),
    kinds
  ).limit(40);

  if (error) return { success: false, message: error.message };

  const rows = [...((data ?? []) as { name: string; source_book: string | null }[])].sort(
    (a, b) =>
      sourcePriority(a.source_book) - sourcePriority(b.source_book) ||
      a.name.localeCompare(b.name, "it")
  );
  const names: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const key = r.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(r.name);
    if (names.length >= limit) break;
  }
  return { success: true, names };
}
