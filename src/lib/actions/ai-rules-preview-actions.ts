"use server";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { checkAiMemoryPreviewAccess } from "@/lib/ai-core/access";
import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";
import type { AiPreviewTestResult, AiPreviewTestSource } from "@/lib/ai-core/contracts";
import { toPreviewTestSourceRefs } from "@/lib/ai-core/preview-test-audit";
import { persistPreviewTestRun } from "@/lib/ai-core/preview-test-action-helpers";
import { AI_PREVIEW_TEST_MESSAGES, clampPreviewOutput, validatePreviewTestRequest } from "@/lib/ai-core/preview-test-policy";

type RulesCatalogRow = {
  id: string;
  kind: string;
  name: string;
  source_book: string;
  source_label: string | null;
  body_md: string;
};

export type RunAiRulesPreviewActionResult =
  | { success: true; data: AiPreviewTestResult }
  | { success: false; message: string };

function ruleTerms(input: string): string[] {
  const stop = new Set(["come", "cosa", "quale", "quali", "della", "delle", "degli", "regola", "regole", "scheda", "verifica"]);
  return Array.from(new Set(input.toLocaleLowerCase("it-IT").normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((term) => term.length >= 4 && !stop.has(term)))).slice(0, 6);
}

async function findRulesCatalogRows(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: string
): Promise<RulesCatalogRow[]> {
  const rows: RulesCatalogRow[] = [];
  const seen = new Set<string>();
  for (const term of ruleTerms(input)) {
    const { data, error } = await admin
      .from("rules_catalog")
      .select("id, kind, name, source_book, source_label, body_md")
      .ilike("name", `%${term.replace(/[%_\\]/g, " ")}%`)
      .limit(8);
    if (error) throw new Error(error.message);
    for (const row of (data ?? []) as RulesCatalogRow[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }
  return rows.slice(0, 8);
}

function buildRulesOutput(rows: RulesCatalogRow[], manual: Awaited<ReturnType<typeof searchManualsSemanticAction>>): string {
  const sections: string[] = [];
  if (rows.length) {
    sections.push("## Regole ufficiali codificate\n\n" + rows.map((row) => `### ${row.name} — ${row.source_label ?? row.source_book}\n${row.body_md}`).join("\n\n"));
  }
  if (manual.success && (manual.primaryText.trim() || manual.hits.length)) {
    const manualText = manual.primaryText.trim() || manual.hits.slice(0, 5).map((hit) => hit.content).join("\n\n");
    sections.push("## Manuali ufficiali indicizzati\n\n" + manualText);
  }
  if (!sections.length) return `${AI_PREVIEW_TEST_MESSAGES.officialRuleNotFound}\nHouse rule: non consultate in questa preview.`;
  return clampPreviewOutput(`${sections.join("\n\n") }\n\nHouse rule: non consultate in questa preview; se esistono, vanno verificate separatamente dal GM.`);
}

export async function runAiRulesPreviewAction(
  campaignId: string,
  question: string
): Promise<RunAiRulesPreviewActionResult> {
  const startedAt = Date.now();
  const validated = validatePreviewTestRequest(campaignId, question);
  if (!validated.ok) return { success: false, message: validated.message };
  const access = await checkAiMemoryPreviewAccess(validated.campaignId);
  if (!access.ok) return { success: false, message: access.message };
  const admin = createSupabaseAdminClient();
  const lookupStartedAt = Date.now();

  try {
    const [catalogRows, manual] = await Promise.all([
      findRulesCatalogRows(admin, validated.input),
      searchManualsSemanticAction(validated.input),
    ]);
    const outputText = catalogRows.length === 0 && !manual.success
      ? "Le fonti ufficiali non sono disponibili per questa preview. Non è stata inventata alcuna meccanica. House rule: non consultate."
      : buildRulesOutput(catalogRows, manual);
    const manualFound = manual.success && (manual.primaryText.trim().length > 0 || manual.hits.length > 0);
    const found = catalogRows.length > 0 || manualFound;
    const sources: AiPreviewTestSource[] = [];
    let sourceIndex = 1;
    for (const row of catalogRows) {
      sources.push({ evidenceId: `E${sourceIndex++}`, sourceType: "rules_catalog", sourceId: row.id, title: row.name, href: "/admin/knowledge", sourceBook: row.source_label ?? row.source_book });
    }
    if (manual.success) {
      for (const hit of manual.hits.slice(0, 8)) {
        sources.push({ evidenceId: `E${sourceIndex++}`, sourceType: "manual", sourceId: hit.fileName ?? `manual-${sourceIndex}`, title: hit.sectionTitle ?? hit.fileName ?? "Manuale ufficiale", href: "/admin/knowledge", sourceBook: hit.sourceLabel });
      }
      if (!manual.hits.length && manual.primaryText.trim()) {
        sources.push({ evidenceId: `E${sourceIndex++}`, sourceType: "manual", sourceId: "primary-result", title: "Risultato manuali ufficiali", href: "/admin/knowledge" });
      }
    }
    const lookupMs = Date.now() - lookupStartedAt;
    const timingsMs = { retrieval: lookupMs, generation: null, total: Date.now() - startedAt } as const;
    const status = found ? "completed" : manual.success ? "insufficient_evidence" : "failed";
    const classification = found ? "official_rule_found" : manual.success ? "official_rule_not_found" : "provider_unavailable";
    const persisted = await persistPreviewTestRun(admin, {
      campaignId: validated.campaignId,
      requestedBy: access.userId,
      kind: "official_rules",
      mode: "official_manuals_and_rules_catalog",
      inputNormalized: validated.input,
      status,
      classification,
      outputText,
      outputRef: null,
      sources: toPreviewTestSourceRefs(sources),
      metadata: {
        catalogCount: catalogRows.length,
        manualHitCount: manual.success ? manual.hits.length : 0,
        manualLookupSucceeded: manual.success,
        houseRulesConsulted: false,
      },
      timingsMs,
    });
    return {
      success: true,
      data: {
        runId: persisted.runId,
        kind: "official_rules",
        mode: "official_manuals_and_rules_catalog",
        status,
        classification,
        outputText,
        sources,
        timingsMs,
        auditPersisted: persisted.auditPersisted,
      },
    };
  } catch (error) {
    console.error("[runAiRulesPreviewAction] lookup failed", { reason: "rules_lookup_error" });
    const timingsMs = { retrieval: Date.now() - lookupStartedAt, generation: null, total: Date.now() - startedAt } as const;
    const outputText = "Le fonti ufficiali non sono disponibili per questa preview. Non è stata inventata alcuna meccanica. House rule: non consultate.";
    const persisted = await persistPreviewTestRun(admin, {
      campaignId: validated.campaignId,
      requestedBy: access.userId,
      kind: "official_rules",
      mode: "official_lookup_error",
      inputNormalized: validated.input,
      status: "failed",
      classification: "provider_unavailable",
      outputText,
      outputRef: null,
      sources: [],
      metadata: { catalogCount: 0, manualLookupSucceeded: false, houseRulesConsulted: false },
      timingsMs,
    });
    return { success: true, data: { runId: persisted.runId, kind: "official_rules", mode: "official_lookup_error", status: "failed", classification: "provider_unavailable", outputText, sources: [], timingsMs, auditPersisted: persisted.auditPersisted } };
  }
}
