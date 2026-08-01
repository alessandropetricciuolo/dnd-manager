"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookMarked, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ingestRulesCatalogAllAction,
  ingestRulesCatalogConditionsAction,
  ingestRulesCatalogDmgRulesAction,
  ingestRulesCatalogPhbRulesAction,
  ingestRulesCatalogSpellsAction,
  type IngestRulesCatalogResult,
} from "@/lib/actions/rules-catalog-ingest-actions";

type IngestFn = () => Promise<IngestRulesCatalogResult>;

/**
 * Controlli admin per popolare `rules_catalog` (condizioni, spell, regole) senza toccare RAG.
 */
export function RulesCatalogIngestControls() {
  const [running, setRunning] = useState<string | null>(null);
  const [lastReport, setLastReport] = useState<string | null>(null);

  async function runIngest(key: string, label: string, fn: IngestFn) {
    setRunning(key);
    setLastReport(null);
    try {
      const res = await fn();
      if (!res.success) {
        toast.error(res.message);
        setLastReport(res.message);
        return;
      }
      const msg = `${label}: ${res.inserted} nuovi, ${res.updated} aggiornati, ${res.skipped} invariati (totale ${res.total}).`;
      toast.success(msg);
      const sample = res.names.slice(0, 12).join(", ");
      setLastReport(sample ? `${msg} — ${sample}${res.names.length > 12 ? "…" : ""}` : msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore ingest catalogo.";
      toast.error(msg);
      setLastReport(msg);
    } finally {
      setRunning(null);
    }
  }

  const busy = running !== null;

  return (
    <div className="space-y-3 rounded-lg border border-teal-500/25 bg-barber-dark/80 p-4">
      <div className="flex items-start gap-2">
        <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold text-barber-paper">Catalogo regole (parallelo)</h2>
          <p className="text-xs text-barber-paper/65">
            Estrae definizioni ufficiali in <code className="text-barber-paper/80">rules_catalog</code>{" "}
            (condizioni PHB, incantesimi multi-libro, regole PHB/DMG). Non modifica{" "}
            <code className="text-barber-paper/80">manuals_knowledge</code>.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() =>
            void runIngest("conditions", "Condizioni PHB", ingestRulesCatalogConditionsAction)
          }
          className="bg-teal-600 text-zinc-950 hover:bg-teal-500"
        >
          {running === "conditions" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Condizioni…
            </>
          ) : (
            "Condizioni PHB"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          variant="secondary"
          onClick={() =>
            void runIngest("spells", "Incantesimi multi-libro", ingestRulesCatalogSpellsAction)
          }
        >
          {running === "spells" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Spell…
            </>
          ) : (
            "Incantesimi (PHB+XGtE+Tasha+Eberron)"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          variant="secondary"
          onClick={() =>
            void runIngest("phb-rules", "Regole PHB", ingestRulesCatalogPhbRulesAction)
          }
        >
          {running === "phb-rules" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              PHB…
            </>
          ) : (
            "Regole PHB"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          variant="secondary"
          onClick={() =>
            void runIngest("dmg-rules", "Regole DMG", ingestRulesCatalogDmgRulesAction)
          }
        >
          {running === "dmg-rules" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              DMG…
            </>
          ) : (
            "Regole DMG"
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          variant="outline"
          onClick={() => void runIngest("all", "Catalogo completo", ingestRulesCatalogAllAction)}
        >
          {running === "all" ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Tutto…
            </>
          ) : (
            "Estrai tutto"
          )}
        </Button>
      </div>
      {lastReport ? (
        <p className="text-[11px] leading-relaxed text-barber-paper/70">{lastReport}</p>
      ) : null}
    </div>
  );
}
