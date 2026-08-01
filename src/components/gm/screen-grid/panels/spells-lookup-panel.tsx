"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  searchSpellDefinitionAction,
  suggestSpellNamesAction,
} from "@/lib/actions/spells-lookup-actions";
import { parseDenseRulesDoc } from "@/lib/manuals/dense-rules-parser";
import { FiveeRulesView } from "@/components/gm/screen-grid/renderers/fivee-rules-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SpellsLookupPanelProps = {
  initialQuery?: string;
};

export function SpellsLookupPanel({ initialQuery = "" }: SpellsLookupPanelProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [bodyMd, setBodyMd] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setError("Inserisci almeno 2 caratteri.");
      return;
    }
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const res = await searchSpellDefinitionAction(trimmed);
      if (!res.success) {
        setError(res.message);
        setTitle(null);
        setBodyMd(null);
        setSourceLabel(null);
        return;
      }
      setTitle(res.name);
      setBodyMd(res.bodyMd);
      setSourceLabel(res.sourceLabel);
      setQuery(res.name);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      void runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || loading) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void suggestSpellNamesAction(trimmed).then((res) => {
        if (cancelled) return;
        if (res.success) setSuggestions(res.names);
        else setSuggestions([]);
      });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, loading]);

  const doc = useMemo(() => {
    if (!bodyMd?.trim()) return null;
    return parseDenseRulesDoc(bodyMd, {
      sourceLabel,
      fallbackTitle: title ?? (query.trim() || "Incantesimo"),
    });
  }, [bodyMd, sourceLabel, title, query]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <form
        className="relative flex shrink-0 gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="Cerca incantesimo…"
            className="h-6 border-violet-600/30 bg-zinc-900 px-2 text-[10px] text-zinc-100"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 ? (
            <ul
              className={cn(
                "absolute left-0 right-0 top-full z-20 mt-0.5 max-h-40 overflow-auto rounded border",
                "border-violet-600/40 bg-zinc-950 py-0.5 shadow-lg"
              )}
            >
              {suggestions.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    className="w-full px-2 py-1 text-left text-[10px] text-zinc-200 hover:bg-violet-600/20 hover:text-violet-100"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setQuery(name);
                      setShowSuggestions(false);
                      void runSearch(name);
                    }}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button
          type="submit"
          size="sm"
          className="h-6 shrink-0 bg-violet-600 px-2 text-zinc-50 hover:bg-violet-500"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </Button>
      </form>

      {error ? <p className="text-[10px] text-red-300">{error}</p> : null}

      <div className="min-h-0 flex-1 overflow-auto rounded border border-zinc-800/80 bg-zinc-950/60 px-1.5 py-1">
        {loading && !doc ? (
          <div className="flex items-center gap-1 text-[10px] text-zinc-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Caricamento…
          </div>
        ) : doc ? (
          <FiveeRulesView doc={doc} />
        ) : (
          <p className="text-[10px] text-zinc-500">
            Cerca un incantesimo per nome (PHB). Es. «Palla di fuoco», «Cure ferite».
          </p>
        )}
      </div>
    </div>
  );
}
