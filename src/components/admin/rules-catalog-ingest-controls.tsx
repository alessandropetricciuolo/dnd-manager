"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookMarked, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ingestRulesCatalogConditionsAction } from "@/lib/actions/rules-catalog-ingest-actions";

/**
 * Bottone admin per popolare `rules_catalog` (condizioni PHB) senza toccare RAG.
 */
export function RulesCatalogIngestControls() {
  const [running, setRunning] = useState(false);
  const [lastReport, setLastReport] = useState<string | null>(null);

  async function runIngest() {
    setRunning(true);
    setLastReport(null);
    try {
      const res = await ingestRulesCatalogConditionsAction();
      if (!res.success) {
        toast.error(res.message);
        setLastReport(res.message);
        return;
      }
      const msg = `Catalogo condizioni: ${res.inserted} nuovi, ${res.updated} aggiornati, ${res.skipped} invariati (totale ${res.total}).`;
      toast.success(msg);
      setLastReport(`${msg} — ${res.names.join(", ")}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore ingest catalogo.";
      toast.error(msg);
      setLastReport(msg);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-teal-500/25 bg-barber-dark/80 p-4">
      <div className="flex items-start gap-2">
        <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold text-barber-paper">Catalogo regole (parallelo)</h2>
          <p className="text-xs text-barber-paper/65">
            Estrae le definizioni ufficiali delle condizioni PHB (Appendice A) in{" "}
            <code className="text-barber-paper/80">rules_catalog</code>. Non modifica{" "}
            <code className="text-barber-paper/80">manuals_knowledge</code>.
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={running}
        onClick={() => void runIngest()}
        className="bg-teal-600 text-zinc-950 hover:bg-teal-500"
      >
        {running ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Estrazione…
          </>
        ) : (
          "Estrai catalogo condizioni PHB"
        )}
      </Button>
      {lastReport ? (
        <p className="text-[11px] leading-relaxed text-barber-paper/70">{lastReport}</p>
      ) : null}
    </div>
  );
}
