"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { Loader2, Search } from "lucide-react";
import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";
import type { ManualSearchHit } from "@/lib/manual-search-types";
import { preserveMarkdownBlankLines } from "@/lib/wiki/content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type RulesLookupPanelProps = {
  initialQuery?: string;
};

export function RulesLookupPanel({ initialQuery = "" }: RulesLookupPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primaryText, setPrimaryText] = useState<string | null>(null);
  const [hits, setHits] = useState<ManualSearchHit[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setError("Inserisci almeno 2 caratteri.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchManualsSemanticAction(trimmed);
      if (!res.success) {
        setError(res.message);
        setPrimaryText(null);
        setHits([]);
        return;
      }
      setPrimaryText(res.primaryText);
      setHits(res.hits);
      setSelectedIdx(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      void runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  const displayText =
    selectedIdx === 0 && primaryText
      ? primaryText
      : hits[selectedIdx]?.content ?? primaryText ?? "";

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <form
        className="flex shrink-0 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca regole nei manuali…"
          className="h-8 border-amber-600/30 bg-zinc-900 text-sm text-zinc-100"
        />
        <Button
          type="submit"
          size="sm"
          className="h-8 shrink-0 bg-amber-600 text-zinc-950 hover:bg-amber-500"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </Button>
      </form>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {hits.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-1">
          {hits.slice(0, 8).map((hit, idx) => (
            <button
              key={`${hit.fileName ?? "hit"}-${hit.chunkIndex ?? idx}`}
              type="button"
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px]",
                selectedIdx === idx
                  ? "border-amber-500/50 bg-amber-600/20 text-amber-100"
                  : "border-zinc-700 text-zinc-400 hover:border-amber-600/30"
              )}
              onClick={() => setSelectedIdx(idx)}
              title={hit.sectionTitle ?? hit.sourceLabel ?? "Risultato"}
            >
              {(hit.sectionTitle ?? hit.sourceLabel ?? `Hit ${idx + 1}`).slice(0, 28)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-200">
        {displayText ? (
          <div className="prose-invert max-w-none space-y-2 text-sm [&_h1]:text-amber-200 [&_h2]:text-amber-200 [&_h3]:text-amber-200 [&_strong]:text-zinc-100">
            <ReactMarkdown remarkPlugins={[remarkBreaks]}>
              {preserveMarkdownBlankLines(displayText)}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Cerca una regola, incantesimo o keyword del Manuale del Giocatore.</p>
        )}
      </div>
    </div>
  );
}
