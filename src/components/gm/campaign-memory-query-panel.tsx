"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Brain, Database, Download, FileText, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  queryCampaignMemoryAction,
  reindexCampaignMemoryAction,
  type CampaignMemoryQuerySource,
} from "@/lib/actions/campaign-memory-query-actions";
import { exportCampaignMemoryMarkdownAction } from "@/lib/actions/campaign-memory-export-actions";

type CampaignMemoryQueryPanelProps = {
  campaignId: string;
};

function sourceBadgeClass(sourceType: CampaignMemoryQuerySource["sourceType"]): string {
  switch (sourceType) {
    case "wiki":
      return "border-emerald-600/40 bg-emerald-950/40 text-emerald-100";
    case "character_background":
      return "border-sky-600/40 bg-sky-950/40 text-sky-100";
    case "session_summary":
    case "session_note":
      return "border-amber-600/40 bg-amber-950/40 text-amber-100";
    case "gm_note":
      return "border-fuchsia-600/40 bg-fuchsia-950/40 text-fuchsia-100";
    case "secret_whisper":
      return "border-rose-600/40 bg-rose-950/40 text-rose-100";
  }
}

export function CampaignMemoryQueryPanel({ campaignId }: CampaignMemoryQueryPanelProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<CampaignMemoryQuerySource[]>([]);
  const [chunkCount, setChunkCount] = useState<number | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [queryPending, startQuery] = useTransition();
  const [reindexPending, startReindex] = useTransition();
  const [exportPending, startExport] = useTransition();
  const [exportMode, setExportMode] = useState<"full" | "compact" | null>(null);

  function downloadMarkdownFile(fileName: string, markdown: string) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleAsk() {
    const q = question.trim();
    if (!q) {
      toast.error("Scrivi una domanda da porre alla memoria.");
      return;
    }
    startQuery(async () => {
      const res = await queryCampaignMemoryAction(campaignId, q);
      if (!res.success) {
        setAnswer(null);
        setSources([]);
        if (typeof res.chunkCount === "number") setChunkCount(res.chunkCount);
        toast.error(res.message);
        return;
      }
      setAnswer(res.answer);
      setSources(res.sources);
      setChunkCount(res.chunkCount);
      setUsedFallback(res.usedFallback);
      toast.success("Memoria interrogata con successo.");
    });
  }

  function handleReindex() {
    startReindex(async () => {
      const res = await reindexCampaignMemoryAction(campaignId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setChunkCount(res.chunkCount);
      toast.success(res.message, { duration: 5000 });
    });
  }

  function handleExport(mode: "full" | "compact") {
    setExportMode(mode);
    startExport(async () => {
      const res = await exportCampaignMemoryMarkdownAction(campaignId, mode);
      setExportMode(null);
      if (!res.success) {
        if (typeof res.chunkCount === "number") setChunkCount(res.chunkCount);
        toast.error(res.message);
        return;
      }
      setChunkCount(res.chunkCount);
      downloadMarkdownFile(res.fileName, res.markdown);
      toast.success(
        mode === "full"
          ? `Export completo scaricato (${res.sourceCount} fonti, ${res.chunkCount} chunk).`
          : `Export compatto scaricato (${Math.round(res.estimatedBytes / 1024)} KB circa).`,
        { duration: 5000 }
      );
    });
  }

  return (
    <Card className="border-violet-600/40 bg-violet-950/20 text-barber-paper">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-violet-100">
          <Brain className="h-5 w-5 text-violet-300" />
          Chiedi alla Memoria Campagna
        </CardTitle>
        <CardDescription className="text-violet-200/70">
          Interroga il canone della campagna lunga con domande in linguaggio naturale. La risposta usa solo
          fonti interne della campagna e ti mostra i riferimenti cliccabili.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-violet-700/35 bg-violet-950/30 p-3">
          <p className="text-xs text-violet-100/85">
            Fonti incluse nel primo rilascio: wiki canonica, background PG, session summary, note private GM e
            secret whispers. Query ed export restano visibili solo nel tab <strong>Solo GM</strong>.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-violet-200/75">
            <Badge variant="outline" className="border-violet-500/35 bg-transparent text-violet-200">
              <Database className="mr-1 h-3 w-3" />
              {chunkCount == null ? "Indice non ancora interrogato" : `${chunkCount} chunk indicizzati`}
            </Badge>
            {usedFallback ? (
              <Badge variant="outline" className="border-amber-500/35 bg-transparent text-amber-100">
                Fallback testuale
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor={`campaign-memory-q-${campaignId}`} className="text-sm font-medium text-violet-200">
            Domanda per la memoria
          </label>
          <Textarea
            id={`campaign-memory-q-${campaignId}`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Es. Cosa è successo recentemente nel continente? Quali PG provengono da questa città?"
            disabled={queryPending || reindexPending || exportPending}
            className="min-h-[120px] resize-y border-violet-500/40 bg-barber-dark/90 text-barber-paper placeholder:text-barber-paper/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleAsk}
            disabled={queryPending || reindexPending || exportPending}
            className="bg-violet-600 text-white hover:bg-violet-500"
          >
            {queryPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Interrogazione…
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Interroga
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReindex}
            disabled={queryPending || reindexPending || exportPending}
            className="border-violet-500/45 text-violet-100 hover:bg-violet-900/30"
          >
            {reindexPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reindicizzazione…
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Reindicizza memoria
              </>
            )}
          </Button>
        </div>

        <div className="rounded-lg border border-violet-700/35 bg-violet-950/25 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 text-violet-300" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-violet-100">Esporta memoria in Markdown</p>
              <p className="mt-1 text-xs leading-relaxed text-violet-200/75">
                Genera un file `.md` aggiornato da dare in pasto a un&apos;altra IA. Il dump completo conserva
                tutta la memoria indicizzata; il compatto è più sintetico ma mantiene i marker sensibili
                <strong> GM-only</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleExport("full")}
              disabled={queryPending || reindexPending || exportPending}
              className="border-violet-500/45 text-violet-100 hover:bg-violet-900/30"
            >
              {exportPending && exportMode === "full" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Export completo…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Esporta .md completo
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleExport("compact")}
              disabled={queryPending || reindexPending || exportPending}
              className="border-violet-500/45 text-violet-100 hover:bg-violet-900/30"
            >
              {exportPending && exportMode === "compact" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Export compatto…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Esporta .md compatto
                </>
              )}
            </Button>
          </div>
        </div>

        {answer ? (
          <div className="space-y-3 rounded-lg border border-violet-600/35 bg-barber-dark/70 p-4">
            <div>
              <h3 className="text-sm font-semibold text-violet-100">Risposta</h3>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/95">{answer}</div>
            </div>

            {sources.length ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-violet-200/80">Fonti</h4>
                <div className="space-y-2">
                  {sources.map((source) => (
                    <Link
                      key={source.id}
                      href={source.href}
                      className="block rounded-md border border-violet-700/25 bg-violet-950/20 p-3 transition-colors hover:bg-violet-900/25"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={sourceBadgeClass(source.sourceType)}>
                          {source.sourceLabel}
                        </Badge>
                        {typeof source.similarity === "number" ? (
                          <span className="text-[11px] text-barber-paper/45">
                            sim. {Math.round(source.similarity * 100)}%
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm font-medium text-barber-paper">{source.title}</p>
                      {source.summary ? (
                        <p className="mt-1 text-xs leading-relaxed text-barber-paper/70">{source.summary}</p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
