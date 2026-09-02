import type { ManualSearchResult } from "../manual-search-types";
import { AI_PREVIEW_TEST_MESSAGES, clampPreviewOutput } from "./preview-test-policy";

export type RulesCatalogPreviewRow = {
  id: string;
  kind: string;
  name: string;
  source_book: string;
  source_label: string | null;
  body_md: string;
};

const RULE_COMPARISON_STOP_WORDS = new Set([
  "alla", "alle", "allo", "agli", "anche", "come", "con", "dalla", "dalle", "degli", "del", "della", "delle",
  "dello", "dei", "di", "e", "il", "in", "la", "le", "lo", "ma", "nel", "nella", "nelle", "non", "per",
  "piu", "questa", "questo", "regola", "regole", "una", "uno", "un", "va",
]);

function normalizedRuleTokens(value: string): Set<string> {
  return new Set(
    value
      .toLocaleLowerCase("it-IT")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length >= 3 && !RULE_COMPARISON_STOP_WORDS.has(token)) ?? []
  );
}

function numericRuleTokens(value: string): Set<string> {
  return new Set(value.match(/\d+(?:[.,]\d+)?/g) ?? []);
}

function setsEqual(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && Array.from(left).every((value) => right.has(value));
}

function likelyConsistentWithManual(row: RulesCatalogPreviewRow, manualText: string): boolean {
  const catalogText = `${row.name}\n${row.body_md}`;
  const catalogTokens = normalizedRuleTokens(catalogText);
  const manualTokens = normalizedRuleTokens(manualText);
  if (!catalogTokens.size || !manualTokens.size) return false;

  const sharedTokens = Array.from(catalogTokens).filter((token) => manualTokens.has(token));
  const overlap = sharedTokens.length / Math.min(catalogTokens.size, manualTokens.size);
  const catalogNumbers = numericRuleTokens(catalogText);
  const manualNumbers = numericRuleTokens(manualText);

  // Numeric differences are a reliable conflict signal when the rule text is related.
  if (sharedTokens.length >= 2 && !setsEqual(catalogNumbers, manualNumbers)) return false;
  return overlap >= 0.28 && setsEqual(catalogNumbers, manualNumbers);
}

export function getManualPreviewText(manual: ManualSearchResult): string {
  if (!manual.success) return "";
  return (manual.primaryText.trim() || manual.hits.slice(0, 5).map((hit) => hit.content.trim()).filter(Boolean).join("\n\n")).trim();
}

export function detectRulesCatalogConflict(rows: RulesCatalogPreviewRow[], manual: ManualSearchResult): boolean {
  const manualText = getManualPreviewText(manual);
  return Boolean(manualText && rows.some((row) => !likelyConsistentWithManual(row, manualText)));
}

export function buildRulesOutput(rows: RulesCatalogPreviewRow[], manual: ManualSearchResult): string {
  const manualText = getManualPreviewText(manual);
  const sections: string[] = [];

  if (manualText) {
    sections.push(
      "## Manuali ufficiali — fonte primaria\n\n" +
        "La fonte manuale ufficiale prevale su tutto ciò che è codificato nel catalogo.\n\n" +
        manualText
    );
    if (rows.length) {
      const conflict = detectRulesCatalogConflict(rows, manual);
      const catalogNotice = conflict
        ? "È stata rilevata una divergenza con il manuale. Il manuale ufficiale prevale; la voce codificata è riportata soltanto per verifica o aggiornamento e non è un'alternativa equivalente."
        : "Queste voci sono informazioni codificate di supporto. Il manuale ufficiale resta la fonte prevalente.";
      sections.push(
        `## Catalogo codificato — ${conflict ? "divergenza da verificare" : "supporto coerente"}\n\n${catalogNotice}\n\n` +
          rows.map((row) => `### ${row.name} — ${row.source_label ?? row.source_book}\n${row.body_md}`).join("\n\n")
      );
    }
  } else if (rows.length) {
    const manualAvailability = manual.success
      ? "Non è stato trovato un passaggio pertinente nei manuali ufficiali indicizzati."
      : "Non è disponibile un passaggio manuale ufficiale verificabile per questa interrogazione.";
    sections.push(
      "## Catalogo codificato — fonte di supporto non verificata\n\n" +
        `${manualAvailability} Le voci seguenti sono informazioni codificate da verificare o aggiornare e non sono presentate come regole ufficiali verificate.\n\n` +
        rows.map((row) => `### ${row.name} — ${row.source_label ?? row.source_book}\n${row.body_md}`).join("\n\n")
    );
  }

  if (!sections.length) return `${AI_PREVIEW_TEST_MESSAGES.officialRuleNotFound}\nHouse rule: non consultate in questa preview.`;
  return clampPreviewOutput(`${sections.join("\n\n")}\n\nHouse rule: non consultate in questa preview; se esistono, vanno verificate separatamente dal GM.`);
}
