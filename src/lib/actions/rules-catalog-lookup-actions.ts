"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { PHB_CONDITIONS } from "@/lib/manuals/phb-conditions";
import {
  slugifyRulesCatalogName,
  type RulesCatalogDefinition,
  type RulesCatalogFacets,
  type RulesCatalogKind,
  RULES_CATALOG_KINDS,
} from "@/lib/manuals/rules-catalog/types";

export type GetRulesCatalogDefinitionResult =
  | { success: true; definition: RulesCatalogDefinition }
  | { success: false; message: string; notFound?: boolean };

type CatalogRow = {
  kind: RulesCatalogKind;
  slug: string;
  name: string;
  name_aliases: string[] | null;
  source_label: string | null;
  body_md: string;
  facets: RulesCatalogFacets | null;
};

const SELECT_COLS = "kind, slug, name, name_aliases, source_label, body_md, facets";

function isRulesCatalogKind(value: string): value is RulesCatalogKind {
  return (RULES_CATALOG_KINDS as readonly string[]).includes(value);
}

function rowToDefinition(row: CatalogRow): RulesCatalogDefinition {
  return {
    kind: row.kind,
    slug: row.slug,
    name: row.name,
    sourceLabel: row.source_label,
    bodyMd: row.body_md,
    facets: row.facets ?? {},
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

async function findBySlugOrName(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  slug: string,
  nameLower: string,
  kinds: RulesCatalogKind[] | null
): Promise<CatalogRow | null> {
  const withKinds = <T extends { eq: (c: string, v: string) => T; in: (c: string, v: string[]) => T }>(
    q: T
  ): T => {
    if (!kinds || kinds.length === 0) return q;
    if (kinds.length === 1) return q.eq("kind", kinds[0]!);
    return q.in("kind", kinds);
  };

  // 1) slug esatto
  {
    const { data, error } = await withKinds(
      admin.from("rules_catalog").select(SELECT_COLS).eq("slug", slug)
    ).limit(5);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CatalogRow[];
    if (rows[0]) return rows[0];
  }

  // 2) name case-insensitive
  {
    const { data, error } = await withKinds(
      admin.from("rules_catalog").select(SELECT_COLS).ilike("name", nameLower)
    ).limit(5);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CatalogRow[];
    const exact = rows.find((r) => r.name.toLowerCase() === nameLower);
    if (exact) return exact;
  }

  // 3) alias (contains array)
  const aliasCandidates = Array.from(new Set([nameLower, nameLower.toUpperCase(), slug]));
  for (const alias of aliasCandidates) {
    const { data, error } = await withKinds(
      admin.from("rules_catalog").select(SELECT_COLS).contains("name_aliases", [alias])
    ).limit(5);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as CatalogRow[];
    if (rows[0]) return rows[0];
  }

  return null;
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
        "Catalogo condizioni vuoto. In Admin → Knowledge esegui «Estrai catalogo condizioni PHB».",
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
      bodyMd,
      facets: {},
    },
  };
}

/**
 * Ritorna una sola definizione ufficiale da `rules_catalog`.
 * Match: slug esatto, lower(name), oppure alias.
 */
export async function getRulesCatalogDefinitionAction(input: {
  kind?: RulesCatalogKind | RulesCatalogKind[];
  nameOrSlug: string;
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
    const hit = await findBySlugOrName(admin, slugifyRulesCatalogName(raw), lower, kinds);
    if (!hit) {
      return {
        success: false,
        message: `Nessuna definizione ufficiale per «${raw}».`,
        notFound: true,
      };
    }
    return { success: true, definition: rowToDefinition(hit) };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Errore lookup catalogo regole.",
    };
  }
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
