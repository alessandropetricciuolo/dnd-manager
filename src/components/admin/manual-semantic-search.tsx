"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchCompendioMdAction } from "@/lib/actions/compendio-md-search-actions";
import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";
import type { CompendioMdSearchResult } from "@/lib/manual-compendio-types";
import type {
  ManualSearchCompareSide,
  ManualSearchHit,
  ManualSearchMode,
  ManualSourceFilter,
} from "@/lib/manual-search-types";
import { cn } from "@/lib/utils";

export function ManualSemanticSearch() {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<ManualSourceFilter>("all");
  const [primaryText, setPrimaryText] = useState<string | null>(null);
  const [hits, setHits] = useState<ManualSearchHit[]>([]);
  const [mode, setMode] = useState<ManualSearchMode | null>(null);
  const [compare, setCompare] = useState<{
    markdown: ManualSearchCompareSide | null;
    txt: ManualSearchCompareSide | null;
  } | null>(null);
  const [compendioResult, setCompendioResult] = useState<CompendioMdSearchResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCompendioPending, startCompendioTransition] = useTransition();

  function runSearch() {
    const q = query.trim();
    if (q.length < 2) {
      toast.error("Inserisci almeno 2 caratteri.");
      return;
    }
    startTransition(async () => {
      const res = await searchManualsSemanticAction(q, { sourceFilter });
      if (!res.success) {
        toast.error(res.message);
        setPrimaryText(null);
        setHits([]);
        setMode(null);
        setCompare(null);
        setCompendioResult(null);
        return;
      }
      setPrimaryText(res.primaryText);
      setHits(res.hits);
      setMode(res.mode);
      setCompare(res.compare ?? null);
      toast.success(
        res.mode === "phrase-focus"
          ? "Risultato dalla frase esatta nel manuale (blocco regola estratto)."
          : res.mode === "semantic"
            ? "Risultato da ricerca semantica (chunk più pertinente)."
            : "Risultato da ricerca testuale (fallback o embedding non disponibile)."
      );
    });
  }

  function runCompendioSearch() {
    const q = query.trim();
    if (q.length < 2) {
      toast.error("Inserisci almeno 2 caratteri.");
      return;
    }
    startCompendioTransition(async () => {
      const res = await searchCompendioMdAction(q);
      setCompendioResult(res);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(
        res.mode === "heading"
          ? `Compendio: voce «${res.sectionTitle ?? "—"}» (intera sezione ##).`
          : "Compendio: estratto testuale intorno alla frase (file MD, non Supabase)."
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
            Cerca per significato (es. <em>palla di fuoco</em>, <em>ispirazione bardica</em>).             Con{" "}
            <strong className="text-barber-paper/80">Tutte le sorgenti</strong> il riquadro in basso confronta il miglior
            estratto <strong className="text-emerald-200/90">Markdown</strong> vs <strong className="text-amber-200/85">.txt</strong>{" "}
            (stessa query). Il blocco «Risultato» segue il filtro che scegli sopra. Puoi anche cercare solo nel file{" "}
            <code className="text-barber-gold/90">dungeonedraghi_compendio.md</code> (nessun chunk DB).
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="manual-search-q" className="text-barber-paper/80">
            Query
          </Label>
          <Input
            id="manual-search-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            placeholder="Es. palla di fuoco, ispirazione bardica…"
            className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            disabled={isPending || isCompendioPending}
          />
        </div>
        <div className="min-w-0 space-y-1.5 sm:w-[min(100%,14rem)]">
          <Label htmlFor="manual-search-source" className="text-barber-paper/80">
            Sorgente risultato principale
          </Label>
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as ManualSourceFilter)}
            disabled={isPending || isCompendioPending}
          >
            <SelectTrigger
              id="manual-search-source"
              className="border-barber-gold/35 bg-barber-dark text-barber-paper"
            >
              <SelectValue placeholder="Tutte" />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
              <SelectItem value="all">Tutte le sorgenti</SelectItem>
              <SelectItem value="markdown">Solo Markdown (.md)</SelectItem>
              <SelectItem value="txt">Solo .txt (ingest PDF/testo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border-2 border-cyan-500/35 bg-cyan-950/25 p-3 sm:p-4">
        <p className="mb-2 text-xs font-medium tracking-wide text-cyan-100/90">Ricerca</p>
        <p className="mb-3 text-[11px] leading-snug text-barber-paper/60">
          <strong className="text-cyan-200/90">Compendio MD</strong> legge il file{" "}
          <code className="text-barber-gold/85">public/manuals/dungeonedraghi_compendio.md</code>.{" "}
          <strong className="text-barber-gold/90">Supabase</strong> usa i chunk indicizzati (stessa query).
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full shrink-0 border-2 border-cyan-400/55 bg-barber-dark/80 text-cyan-50 hover:bg-cyan-950/50 sm:min-w-[12rem] sm:flex-1"
            disabled={isPending || isCompendioPending}
            onClick={runCompendioSearch}
          >
            {isCompendioPending ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <BookOpen className="mr-2 h-4 w-4 shrink-0" />
            )}
            Compendio MD (file locale)
          </Button>
          <Button
            type="button"
            className="h-11 w-full shrink-0 bg-barber-gold text-barber-dark hover:bg-barber-gold/90 sm:min-w-[12rem] sm:flex-1"
            disabled={isPending || isCompendioPending}
            onClick={runSearch}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4 shrink-0" />
            )}
            Cerca (Supabase)
          </Button>
        </div>
      </div>

      {mode && (
        <p className="text-[11px] uppercase tracking-wide text-barber-paper/45">
          Filtro:{" "}
          {sourceFilter === "all"
            ? "tutte"
            : sourceFilter === "markdown"
              ? "solo markdown"
              : "solo .txt"}
          {" · "}
          Modalità:{" "}
          {mode === "phrase-focus"
            ? "frase esatta (estrattore regola + intestazione)"
            : mode === "semantic"
              ? "semantica (miglior chunk unico)"
              : "testuale (fallback)"}
        </p>
      )}

      {compendioResult?.success && (
        <div className="space-y-2 rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-4">
          <Label className="text-cyan-100/90">Compendio — file locale</Label>
          <p className="text-[11px] text-barber-paper/55">
            {compendioResult.fileName} · modalità:{" "}
            {compendioResult.mode === "heading" ? "voce ## (sezione intera)" : "frase nel testo (estratto)"}
            {compendioResult.sectionTitle ? ` · «${compendioResult.sectionTitle}»` : ""}
          </p>
          <div
            className={cn(
              "max-h-[min(65vh,28rem)] overflow-y-auto rounded-md border border-cyan-500/20",
              "bg-barber-dark/90 p-3 text-xs leading-relaxed text-barber-paper/95 whitespace-pre-wrap break-words"
            )}
          >
            {compendioResult.excerpt}
          </div>
        </div>
      )}

      {primaryText &&
        (primaryText.includes("Origine — **Eberron**") || primaryText.includes("Tag — Eberron")) && (
          <p className="rounded-md border border-emerald-500/35 bg-emerald-950/25 px-3 py-2 text-[11px] text-emerald-100/90">
            Questo risultato include regole dall’<strong className="font-medium">espansione Eberron</strong>{" "}
            (<em>Rinascita dopo l&apos;Ultima Guerra</em>): integrano o sostituiscono il Manuale del Giocatore solo
            ove indicato nel testo.
          </p>
        )}

      {primaryText &&
        (primaryText.includes("Origine — **Tasha**") || primaryText.includes("Tag — Tasha")) && (
          <p className="rounded-md border border-rose-500/35 bg-rose-950/20 px-3 py-2 text-[11px] text-rose-100/90">
            Questo risultato proviene dal <strong className="font-medium">Calderone omnicomprensivo di Tasha</strong>:{" "}
            regole <em>opzionali</em> e aggiunte; verificare con il gruppo e con il Manuale del Giocatore di base.
          </p>
        )}

      {primaryText &&
        (primaryText.includes("Origine — **Xanathar**") || primaryText.includes("Tag — Xanathar")) && (
          <p className="rounded-md border border-sky-500/35 bg-sky-950/20 px-3 py-2 text-[11px] text-sky-100/90">
            Questo risultato proviene dalla <strong className="font-medium">Guida omnicomprensiva di Xanathar</strong>:{" "}
            regole <em>facoltative</em> per giocatori e DM; verificare con il gruppo e con il Manuale del Giocatore di base.
          </p>
        )}

      {primaryText && (
        <div className="space-y-2">
          <Label className="text-barber-paper/80">Risultato principale</Label>
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

      {sourceFilter === "all" && compare && (compare.markdown || compare.txt) && (
        <div className="space-y-2 border-t border-barber-gold/15 pt-4">
          <Label className="text-barber-paper/80">Confronto test (stessa query)</Label>
          <p className="text-[11px] text-barber-paper/55">
            Miglior chunk per tipo di sorgente usando il match sulla frase (e la semantica nei candidati RPC quando
            presenti). Utile per decidere tra pipeline .txt e .md.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="flex min-h-0 flex-col rounded-lg border border-emerald-600/35 bg-emerald-950/20">
              <div className="border-b border-emerald-600/25 px-3 py-2 text-xs font-medium text-emerald-200/95">
                Markdown (.md)
              </div>
              <div className="min-h-[8rem] flex-1 overflow-y-auto p-3">
                {compare.markdown ? (
                  <div className="space-y-2">
                    {compare.markdown.fileHint && (
                      <p className="text-[11px] text-emerald-100/70">{compare.markdown.fileHint}</p>
                    )}
                    <div
                      className={cn(
                        "max-h-[min(55vh,24rem)] overflow-y-auto text-xs leading-relaxed text-barber-paper/90",
                        "whitespace-pre-wrap break-words"
                      )}
                    >
                      {compare.markdown.primaryText}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs italic text-barber-paper/45">Nessun chunk Markdown con questa frase.</p>
                )}
              </div>
            </div>
            <div className="flex min-h-0 flex-col rounded-lg border border-amber-600/35 bg-amber-950/15">
              <div className="border-b border-amber-600/25 px-3 py-2 text-xs font-medium text-amber-100/95">
                .txt (estrazione PDF / testo)
              </div>
              <div className="min-h-[8rem] flex-1 overflow-y-auto p-3">
                {compare.txt ? (
                  <div className="space-y-2">
                    {compare.txt.fileHint && (
                      <p className="text-[11px] text-amber-100/75">{compare.txt.fileHint}</p>
                    )}
                    <div
                      className={cn(
                        "max-h-[min(55vh,24rem)] overflow-y-auto text-xs leading-relaxed text-barber-paper/90",
                        "whitespace-pre-wrap break-words"
                      )}
                    >
                      {compare.txt.primaryText}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs italic text-barber-paper/45">Nessun chunk .txt con questa frase.</p>
                )}
              </div>
            </div>
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
                  {h.originTag === "eberron" && (
                    <span className="mr-1.5 inline-block rounded bg-emerald-600/30 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-emerald-100/95">
                      Eberron
                    </span>
                  )}
                  {h.originTag === "tasha" && (
                    <span className="mr-1.5 inline-block rounded bg-rose-600/30 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-rose-100/95">
                      Tasha
                    </span>
                  )}
                  {h.originTag === "xanathar" && (
                    <span className="mr-1.5 inline-block rounded bg-sky-600/30 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-sky-100/95">
                      Xanathar
                    </span>
                  )}
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
