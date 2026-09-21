"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Loader2,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";
import {
  getRulesCatalogConditionAction,
  getRulesCatalogDefinitionAction,
} from "@/lib/actions/rules-catalog-lookup-actions";
import type { ManualSearchHit } from "@/lib/manual-search-types";
import { parseDenseRulesDoc } from "@/lib/manuals/dense-rules-parser";
import { PHB_CONDITIONS, type PhbCondition } from "@/lib/manuals/phb-conditions";
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

type CatalogView = {
  title: string;
  bodyMd: string;
  sourceLabel: string | null;
  alternatives: { name: string; sourceLabel: string | null; sourceBook?: string | null }[];
};

const POPULAR_RULES = [
  { label: "Lotta (Grapple)", query: "Lotta" },
  { label: "Copertura", query: "Copertura" },
  { label: "Attacco d'Opportunità", query: "Attacchi di Opportunità" },
  { label: "Concentrazione", query: "Concentrazione" },
  { label: "Tiri Salvezza Morte", query: "Tiri Salvezza contro la Morte" },
  { label: "Schivare", query: "Schivare" },
];

export function TacticalRulesLookup() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogView, setCatalogView] = useState<CatalogView | null>(null);
  const [primaryText, setPrimaryText] = useState<string | null>(null);
  const [hits, setHits] = useState<ManualSearchHit[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [activeCondition, setActiveCondition] = useState<PhbCondition | "all" | null>(null);

  const showCatalogDefinition = useCallback(
    (
      title: string,
      bodyMd: string,
      sourceLabel: string | null,
      alternatives: { name: string; sourceLabel: string | null; sourceBook?: string | null }[] = []
    ) => {
      setCatalogView({ title, bodyMd, sourceLabel, alternatives });
      setPrimaryText(null);
      setHits([]);
      setSelectedIdx(0);
      setError(null);
    },
    []
  );

  const runRagSearch = useCallback(async (q: string) => {
    const res = await searchManualsSemanticAction(q);
    if (!res.success) {
      setError(res.message);
      setCatalogView(null);
      setPrimaryText(null);
      setHits([]);
      return;
    }
    setCatalogView(null);
    setPrimaryText(res.primaryText);
    setHits(res.hits);
    setSelectedIdx(0);
    setError(null);
  }, []);

  const runSearch = useCallback(
    async (q: string, preferSourceBook?: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) {
        setError("Inserisci almeno 2 caratteri per la ricerca.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const catalog = await getRulesCatalogDefinitionAction({
          nameOrSlug: trimmed,
          kind: ["condition", "rule", "feature", "trait"],
          preferSourceBook,
        });
        if (catalog.success) {
          showCatalogDefinition(
            catalog.definition.name,
            catalog.definition.bodyMd,
            catalog.definition.sourceLabel,
            catalog.alternatives.map((a) => ({
              name: a.name,
              sourceLabel: a.sourceLabel,
              sourceBook: a.sourceBook,
            }))
          );
          return;
        }
        if (!catalog.notFound) {
          setError(catalog.message);
          setCatalogView(null);
          setPrimaryText(null);
          setHits([]);
          return;
        }
        await runRagSearch(trimmed);
      } finally {
        setLoading(false);
      }
    },
    [runRagSearch, showCatalogDefinition]
  );

  const openCondition = useCallback(
    async (condition: PhbCondition | "all") => {
      setActiveCondition(condition);
      setQuery(condition === "all" ? "Tutte le Condizioni" : condition);
      setLoading(true);
      setError(null);
      try {
        const res = await getRulesCatalogConditionAction(
          condition === "all" ? "tutte le condizioni" : condition
        );
        if (!res.success) {
          setError(res.message);
          setCatalogView(null);
          setPrimaryText(null);
          setHits([]);
          return;
        }
        showCatalogDefinition(
          res.definition.name,
          res.definition.bodyMd,
          res.definition.sourceLabel,
          res.alternatives.map((a) => ({
            name: a.name,
            sourceLabel: a.sourceLabel,
            sourceBook: a.sourceBook,
          }))
        );
      } finally {
        setLoading(false);
      }
    },
    [showCatalogDefinition]
  );

  function handleReset() {
    setQuery("");
    setCatalogView(null);
    setPrimaryText(null);
    setHits([]);
    setError(null);
    setActiveCondition(null);
  }

  const activeHit = hits[selectedIdx] ?? null;
  const displayText = catalogView
    ? catalogView.bodyMd
    : selectedIdx === 0 && primaryText
      ? primaryText
      : activeHit?.content ?? primaryText ?? "";

  const doc = useMemo(() => {
    if (!displayText.trim()) return null;
    return parseDenseRulesDoc(displayText, {
      sourceLabel: catalogView?.sourceLabel ?? activeHit?.sourceLabel ?? null,
      fallbackTitle:
        catalogView?.title ?? activeHit?.sectionTitle ?? (query.trim() || "Regola"),
    });
  }, [displayText, activeHit, query, catalogView]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-brass-base/30 bg-[#120d09]/95 text-parchment-100 shadow-lg">
      {/* Testata Ricerca Regole */}
      <div className="shrink-0 flex items-center justify-between border-b border-brass-base/20 bg-[#19110b] px-3 py-2">
        <div className="flex items-center gap-1.5 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
          <BookOpen className="h-3.5 w-3.5 text-brass-base" />
          <span>Ricerca Regole & Manuale</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Menu rapido Condizioni PHB */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "h-6 border-brass-base/30 bg-guild-stone/50 px-2 text-[10px] text-brass-light hover:bg-brass-base/20 font-serif",
                  activeCondition ? "border-amber-500 bg-amber-950/60 text-amber-200" : null
                )}
                title="Consulta Condizioni (PHB Appendice A)"
              >
                Condizioni
                <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-[70vh] w-48 overflow-auto border-brass-base/30 bg-[#140e0a] text-parchment-100 shadow-2xl font-serif"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">
                Appendice A — Condizioni
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="text-xs cursor-pointer focus:bg-amber-950/60 focus:text-amber-200"
                onSelect={() => void openCondition("all")}
              >
                ✦ Tutte le condizioni
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-brass-base/20" />
              {PHB_CONDITIONS.map((cond) => (
                <DropdownMenuItem
                  key={cond}
                  className={cn(
                    "text-xs cursor-pointer focus:bg-amber-950/60 focus:text-amber-200",
                    activeCondition === cond ? "bg-amber-950/50 text-amber-300 font-bold" : null
                  )}
                  onSelect={() => void openCondition(cond)}
                >
                  {cond}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {(query || doc || error) && (
            <button
              type="button"
              onClick={handleReset}
              className="text-[10px] text-zinc-400 hover:text-amber-300 flex items-center gap-0.5"
              title="Azzera ricerca"
            >
              <RotateCcw className="h-2.5 w-2.5" /> reset
            </button>
          )}
        </div>
      </div>

      {/* Form di ricerca + Scorciatoie veloci */}
      <div className="shrink-0 border-b border-brass-base/15 bg-[#140e0a]/80 p-2 space-y-1.5">
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            setActiveCondition(null);
            void runSearch(query);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-brass-base/60" />
            <Input
              value={query}
              onChange={(e) => {
                setActiveCondition(null);
                setQuery(e.target.value);
              }}
              placeholder="Cerca regola, azione, copertura..."
              className="h-7 border-brass-base/30 bg-[#0c0805] pl-7 pr-6 text-xs text-parchment-100 placeholder:text-zinc-600 focus:border-amber-600 focus:ring-0"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            className="h-7 shrink-0 bg-amber-600 px-2.5 text-xs text-zinc-950 hover:bg-amber-500 font-serif font-bold shadow-md"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </Button>
        </form>

        {/* Scorciatoie veloci per regole frequenti di combattimento */}
        <div className="flex flex-wrap gap-1 items-center">
          <span className="text-[9px] uppercase tracking-wider text-brass-light/70 font-cinzel font-semibold">
            Rapide:
          </span>
          {POPULAR_RULES.map((rule) => (
            <button
              key={rule.query}
              type="button"
              onClick={() => {
                setQuery(rule.query);
                setActiveCondition(null);
                void runSearch(rule.query);
              }}
              className="rounded border border-brass-base/20 bg-[#1d140d]/80 px-1.5 py-0.5 text-[9px] text-parchment-300 hover:border-amber-500 hover:bg-amber-950/50 hover:text-amber-200 transition-colors"
            >
              {rule.label}
            </button>
          ))}
        </div>
      </div>

      {/* Area Contenuto / Risultato Regola */}
      <div className="scrollbar-barber-y flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
        {error && (
          <div className="rounded border border-red-500/40 bg-red-950/30 p-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Alternative da catalogo */}
        {catalogView?.alternatives && catalogView.alternatives.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center pb-1 border-b border-brass-base/15">
            <span className="text-[10px] text-zinc-400 font-cinzel">Vedi anche:</span>
            {catalogView.alternatives.map((alt) => (
              <button
                key={`${alt.name}|${alt.sourceLabel ?? ""}`}
                type="button"
                className="rounded border border-amber-600/30 bg-amber-950/40 px-1.5 py-0.5 text-[10px] text-amber-200 hover:bg-amber-900/50"
                onClick={() => {
                  setQuery(alt.name);
                  void runSearch(alt.name, alt.sourceBook ?? undefined);
                }}
              >
                {alt.name}
              </button>
            ))}
          </div>
        )}

        {/* RAG Hits chips */}
        {!catalogView && hits.length > 0 && (
          <div className="flex flex-wrap gap-1 items-center pb-1 border-b border-brass-base/15">
            <span className="text-[10px] text-zinc-400 font-cinzel">Sezioni:</span>
            {hits.slice(0, 6).map((hit, idx) => (
              <button
                key={`${hit.fileName ?? "hit"}-${hit.chunkIndex ?? idx}`}
                type="button"
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] transition-colors",
                  selectedIdx === idx
                    ? "border-amber-400 bg-amber-950/80 text-amber-200 font-bold"
                    : "border-brass-base/20 bg-zinc-900/60 text-parchment-400 hover:border-brass-base/40 hover:text-parchment-200"
                )}
                onClick={() => setSelectedIdx(idx)}
              >
                {(hit.sectionTitle ?? hit.sourceLabel ?? `Risultato ${idx + 1}`).slice(0, 20)}
              </button>
            ))}
          </div>
        )}

        {/* Visualizzatore Regola Formattata */}
        {loading && !doc ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-xs text-parchment-400">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
            <span>Consultazione dei tomi in corso...</span>
          </div>
        ) : doc ? (
          <div className="rounded border border-brass-base/20 bg-[#0c0805]/90 p-2.5 shadow-inner">
            <FiveeRulesView doc={doc} />
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center text-center p-3 text-zinc-500">
            <BookOpen className="h-7 w-7 text-brass-base/40 mb-1.5" />
            <p className="font-serif text-xs text-parchment-300">
              Digita un termine o seleziona una condizione dal menu in alto.
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">
              Es: <em>Lotta, Copertura, Opportunità, Invisibile, Concentrazione...</em>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
