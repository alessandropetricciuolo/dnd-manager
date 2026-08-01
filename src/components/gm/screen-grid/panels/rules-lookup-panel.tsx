"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";
import type { ManualSearchHit } from "@/lib/manual-search-types";
import { parseDenseRulesDoc } from "@/lib/manuals/dense-rules-parser";
import {
  PHB_CONDITIONS,
  conditionSearchQuery,
  type PhbCondition,
} from "@/lib/manuals/phb-conditions";
import { FiveeRulesView } from "@/components/gm/screen-grid/renderers/fivee-rules-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [activeCondition, setActiveCondition] = useState<PhbCondition | "all" | null>(null);

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

  const openCondition = useCallback(
    async (condition: PhbCondition | "all") => {
      const q = conditionSearchQuery(condition);
      setActiveCondition(condition);
      setQuery(condition === "all" ? "Condizioni" : condition);
      await runSearch(q);
    },
    [runSearch]
  );

  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      void runSearch(initialQuery);
    }
  }, [initialQuery, runSearch]);

  const activeHit = hits[selectedIdx] ?? null;
  const displayText =
    selectedIdx === 0 && primaryText
      ? primaryText
      : activeHit?.content ?? primaryText ?? "";

  const doc = useMemo(() => {
    if (!displayText.trim()) return null;
    return parseDenseRulesDoc(displayText, {
      sourceLabel: activeHit?.sourceLabel ?? null,
      fallbackTitle: activeHit?.sectionTitle ?? (query.trim() || "Regola"),
    });
  }, [displayText, activeHit, query]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <form
        className="flex shrink-0 gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          setActiveCondition(null);
          void runSearch(query);
        }}
      >
        <Input
          value={query}
          onChange={(e) => {
            setActiveCondition(null);
            setQuery(e.target.value);
          }}
          placeholder="Cerca regole…"
          className="h-6 border-amber-600/30 bg-zinc-900 px-2 text-[10px] text-zinc-100"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "h-6 shrink-0 border-amber-600/40 px-1.5 text-[10px] text-amber-100 hover:bg-amber-600/15",
                activeCondition ? "border-amber-500/60 bg-amber-600/20" : null
              )}
              title="Condizioni (PHB)"
            >
              Condizioni
              <ChevronDown className="ml-0.5 h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[70vh] w-44 overflow-auto border-amber-600/30 bg-zinc-900 text-zinc-100"
          >
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-amber-400/80">
              Appendice A
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="text-[11px] focus:bg-amber-600/20 focus:text-zinc-100"
              onSelect={() => void openCondition("all")}
            >
              Tutte le condizioni
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-zinc-800" />
            {PHB_CONDITIONS.map((condition) => (
              <DropdownMenuItem
                key={condition}
                className={cn(
                  "text-[11px] focus:bg-amber-600/20 focus:text-zinc-100",
                  activeCondition === condition ? "bg-amber-600/15 text-amber-100" : null
                )}
                onSelect={() => void openCondition(condition)}
              >
                {condition}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          type="submit"
          size="sm"
          className="h-6 shrink-0 bg-amber-600 px-2 text-zinc-950 hover:bg-amber-500"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
        </Button>
      </form>

      {error ? <p className="text-[10px] text-red-300">{error}</p> : null}

      {hits.length > 0 ? (
        <div className="flex shrink-0 flex-wrap gap-0.5">
          {hits.slice(0, 8).map((hit, idx) => (
            <button
              key={`${hit.fileName ?? "hit"}-${hit.chunkIndex ?? idx}`}
              type="button"
              className={cn(
                "rounded border px-1 py-px text-[9px]",
                selectedIdx === idx
                  ? "border-amber-500/50 bg-amber-600/20 text-amber-100"
                  : "border-zinc-700 text-zinc-500 hover:border-amber-600/30"
              )}
              onClick={() => setSelectedIdx(idx)}
              title={hit.sectionTitle ?? hit.sourceLabel ?? "Risultato"}
            >
              {(hit.sectionTitle ?? hit.sourceLabel ?? `Hit ${idx + 1}`).slice(0, 22)}
            </button>
          ))}
        </div>
      ) : null}

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
            Cerca una regola, oppure apri il menu Condizioni (PHB Appendice A).
          </p>
        )}
      </div>
    </div>
  );
}
