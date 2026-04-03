"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  searchManualsSemanticAction,
  type ManualSearchHit,
  type ManualSearchMode,
} from "@/lib/actions/manual-search-actions";
import { cn } from "@/lib/utils";

export function ManualSemanticSearch() {
  const [query, setQuery] = useState("");
  const [primaryText, setPrimaryText] = useState<string | null>(null);
  const [hits, setHits] = useState<ManualSearchHit[]>([]);
  const [mode, setMode] = useState<ManualSearchMode | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSearch() {
    const q = query.trim();
    if (q.length < 2) {
      toast.error("Inserisci almeno 2 caratteri.");
      return;
    }
    startTransition(async () => {
      const res = await searchManualsSemanticAction(q);
      if (!res.success) {
        toast.error(res.message);
        setPrimaryText(null);
        setHits([]);
        setMode(null);
        return;
      }
      setPrimaryText(res.primaryText);
      setHits(res.hits);
      setMode(res.mode);
      toast.success(
        res.mode === "phrase-focus"
          ? "Risultato dalla frase esatta nel manuale (blocco regola estratto)."
          : res.mode === "semantic"
            ? "Risultato da ricerca semantica (chunk più pertinente)."
            : "Risultato da ricerca testuale (fallback o embedding non disponibile)."
      );
    });
  }

  return (
    <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4 space-y-4">
      <div className="flex items-start gap-3">
        <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-barber-gold" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold text-barber-paper">Ricerca semantica manuali</h2>
          <p className="text-xs text-barber-paper/65">
            Cerca per significato (es. <em>palla di fuoco</em>, <em>attacco opportunità</em>). I manuali indicizzati sono
            tutti in <strong className="font-medium text-barber-paper/80">italiano</strong>: usa termini IT per risultati
            migliori. Il risultato principale è un <strong className="font-medium text-barber-paper/80">singolo chunk</strong> con
            intestazione (manuale, capitolo, sezione) se indicizzato con ingest v3.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="manual-search-q" className="text-barber-paper/80">
            Query
          </Label>
          <Input
            id="manual-search-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Es. palla di fuoco, attacco di opportunità, tratti degli elfi…"
            className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            disabled={isPending}
          />
        </div>
        <Button
          type="button"
          className="shrink-0 bg-barber-gold text-barber-dark hover:bg-barber-gold/90 sm:mb-0"
          disabled={isPending}
          onClick={runSearch}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Cerca
        </Button>
      </div>

      {mode && (
        <p className="text-[11px] uppercase tracking-wide text-barber-paper/45">
          Modalità:{" "}
          {mode === "phrase-focus"
            ? "frase esatta (estrattore regola + intestazione)"
            : mode === "semantic"
              ? "semantica (miglior chunk unico)"
              : "testuale (fallback)"}
        </p>
      )}

      {primaryText && (
        <div className="space-y-2">
          <Label className="text-barber-paper/80">Risultato</Label>
          <div
            className={cn(
              "max-h-[min(70vh,32rem)] overflow-y-auto rounded-lg border border-barber-gold/20",
              "bg-barber-dark/90 p-4 text-sm leading-relaxed text-barber-paper/95 whitespace-pre-wrap break-words"
            )}
          >
            {primaryText}
          </div>
        </div>
      )}

      {hits.length > 1 && (
        <details className="rounded-lg border border-barber-gold/15 bg-barber-dark/50 text-sm">
          <summary className="cursor-pointer px-3 py-2 text-barber-paper/70 hover:text-barber-paper">
            Altri estratti ({hits.length} hit)
          </summary>
          <ul className="max-h-48 space-y-2 overflow-y-auto border-t border-barber-gold/10 p-3">
            {hits.slice(0, 8).map((h, i) => (
              <li key={i} className="text-xs text-barber-paper/75">
                <span className="text-barber-gold/80">
                  {h.chapter ? `${h.chapter} › ` : ""}
                  {h.sectionTitle ?? "—"}
                  {h.similarity != null ? ` · score ${h.similarity.toFixed(3)}` : ""}
                </span>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap">{h.content}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
