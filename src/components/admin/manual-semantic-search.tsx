"use client";

import { useMemo, useState, useTransition } from "react";
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
import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";
import type {
  ManualSearchCompareSide,
  ManualSearchHit,
  ManualSearchMode,
  ManualSearchPipeline,
  ManualSourceFilter,
} from "@/lib/manual-search-types";
import { cn } from "@/lib/utils";

function renderRichManualText(text: string) {
  const cleanInline = (s: string): string =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/^[-*]\s+/, "")
      .trimEnd();
  const stripTags = (s: string): string =>
    cleanInline(
      s
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );
  const lines = text.replace(/\r/g, "").split("\n");
  const nodes: JSX.Element[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]?.trimEnd() ?? "";
    if (/^\s*<table[\s>]/i.test(line)) {
      const tableLines: string[] = [line];
      i += 1;
      while (i < lines.length) {
        tableLines.push(lines[i] ?? "");
        if (/<\/table>\s*$/i.test(lines[i] ?? "")) {
          i += 1;
          break;
        }
        i += 1;
      }
      const tableHtml = tableLines.join("\n");
      const rowMatches = Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
      const rows = rowMatches.map((m) => {
        const cells = Array.from(m[1].matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi));
        return cells.map((c) => stripTags(c[2] ?? ""));
      });
      const header = rows.find((r) => r.length > 0) ?? [];
      const body = rows.slice(header.length ? 1 : 0).filter((r) => r.length > 0);
      if (header.length || body.length) {
        nodes.push(
          <div key={`tbl-${i}`} className="overflow-x-auto rounded border border-barber-gold/20">
            <table className="min-w-full border-collapse text-[11px]">
              {header.length ? (
                <thead className="bg-barber-gold/10 text-barber-gold">
                  <tr>
                    {header.map((h, hIdx) => (
                      <th key={`h-${hIdx}`} className="border-b border-barber-gold/20 px-2 py-1 text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              {body.length ? (
                <tbody>
                  {body.map((row, rIdx) => (
                    <tr key={`r-${rIdx}`} className="border-t border-barber-gold/10">
                      {row.map((cell, cIdx) => (
                        <td key={`c-${rIdx}-${cIdx}`} className="px-2 py-1 text-barber-paper/95">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ) : null}
            </table>
          </div>
        );
      }
      continue;
    }
    const heading = line.match(/^\s*#+\s*(.+)$/);
    if (heading) {
      nodes.push(
        <p key={`ln-${i}`} className="font-semibold text-barber-gold">
          {cleanInline(heading[1] ?? "")}
        </p>
      );
      i += 1;
      continue;
    }
    const listItem = line.match(/^\s*\*\s+(\S.*)$/);
    if (listItem) {
      nodes.push(
        <p key={`ln-${i}`} className="flex gap-2 text-barber-paper">
          <span className="shrink-0 text-barber-gold/85" aria-hidden>
            •
          </span>
          <span className="min-w-0">{cleanInline(listItem[1] ?? "")}</span>
        </p>
      );
      i += 1;
      continue;
    }
    const leadBold = line.match(/^\s*\*\*([^*]+)\*\*\s*(.*)$/);
    if (leadBold) {
      const rest = [leadBold[1], leadBold[2]].filter(Boolean).join(" ").trim();
      nodes.push(
        <p key={`ln-${i}`} className="font-semibold text-barber-paper">
          {cleanInline(rest)}
        </p>
      );
      i += 1;
      continue;
    }
    nodes.push(
      <p key={`ln-${i}`} className="text-barber-paper">
        {cleanInline(line)}
      </p>
    );
    i += 1;
  }
  return <div className="space-y-1">{nodes}</div>;
}

export function ManualSemanticSearch() {
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<ManualSourceFilter>("all");
  const [primaryText, setPrimaryText] = useState<string | null>(null);
  const [hits, setHits] = useState<ManualSearchHit[]>([]);
  const [mode, setMode] = useState<ManualSearchMode | null>(null);
  const [pipeline, setPipeline] = useState<ManualSearchPipeline | null>(null);
  const [compare, setCompare] = useState<{
    markdown: ManualSearchCompareSide | null;
    txt: ManualSearchCompareSide | null;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const renderedPrimaryText = useMemo(
    () => (primaryText ? renderRichManualText(primaryText) : null),
    [primaryText]
  );

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
        setPipeline(null);
        setCompare(null);
        return;
      }
      setPrimaryText(res.primaryText);
      setHits(res.hits);
      setMode(res.mode);
      setPipeline(res.pipeline);
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
            disabled={isPending}
          />
        </div>
        <div className="min-w-0 space-y-1.5 sm:w-[min(100%,14rem)]">
          <Label htmlFor="manual-search-source" className="text-barber-paper/80">
            Sorgente risultato principale
          </Label>
          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as ManualSourceFilter)}
            disabled={isPending}
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
          Un solo flusso: ranking semantico + matching frase, con fast-path per incantesimi (allineato al tooltip
          giocatore) e fallback robusto su chunk indicizzati.
        </p>
        <Button
          type="button"
          className="h-11 w-full shrink-0 bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
          disabled={isPending}
          onClick={runSearch}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4 shrink-0" />
          )}
          Cerca
        </Button>
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
          {pipeline ? ` · pipeline: ${pipeline}` : ""}
        </p>
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

      {primaryText &&
        (primaryText.includes("Origine — **Van Richten**") || primaryText.includes("Tag — Van Richten")) && (
          <p className="rounded-md border border-fuchsia-500/35 bg-fuchsia-950/20 px-3 py-2 text-[11px] text-fuchsia-100/90">
            Questo risultato proviene dalla <strong className="font-medium">Guida di Van Richten a Ravenloft</strong>:{" "}
            supplemento opzionale di ambientazione/horror; applicare solo se la campagna usa questo modulo.
          </p>
        )}

      {primaryText && (
        <div className="space-y-2">
          <Label className="text-barber-paper/80">Risultato principale</Label>
          <div
            className={cn(
              "max-h-[min(70vh,32rem)] overflow-y-auto rounded-lg border border-barber-gold/20",
              "bg-barber-dark/90 p-4 text-sm leading-relaxed text-barber-paper/95 break-words"
            )}
          >
            {renderedPrimaryText}
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
                  {h.originTag === "van_richten_ravenloft" && (
                    <span className="mr-1.5 inline-block rounded bg-fuchsia-600/30 px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-fuchsia-100/95">
                      Van Richten
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
