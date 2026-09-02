"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Clock, Database, FileSearch, FlaskConical, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  runAiMemoryPreviewAction,
  submitAiMemoryPreviewFeedbackAction,
} from "@/lib/actions/ai-memory-preview-actions";
import type { AiMemoryPreviewResult } from "@/lib/ai-core/contracts";

type AiMemoryPreviewPanelProps = {
  campaignId: string;
};

function classificationLabel(c: AiMemoryPreviewResult["classification"]): string {
  switch (c) {
    case "fatto_canonico": return "Fatto canonico";
    case "informazione_assente": return "Informazione assente";
    case "conflitto": return "Conflitto";
  }
}
function classificationVariant(c: AiMemoryPreviewResult["classification"]): string {
  switch (c) {
    case "fatto_canonico": return "border-emerald-500/40 bg-emerald-950/30 text-emerald-100";
    case "informazione_assente": return "border-amber-500/40 bg-amber-950/30 text-amber-100";
    case "conflitto": return "border-rose-500/40 bg-rose-950/30 text-rose-100";
  }
}
function statusLabel(s: AiMemoryPreviewResult["status"]): string {
  switch (s) {
    case "answered": return "Risposto";
    case "insufficient_evidence": return "Evidenza insufficiente";
    case "failed": return "Fallback";
  }
}
function retrievalLabel(mode: AiMemoryPreviewResult["retrieval"]["mode"]): string {
  switch (mode) {
    case "semantic": return "Semantic";
    case "lexical_fallback": return "Lexical fallback";
    case "none": return "Nessun recupero";
  }
}

export function AiMemoryPreviewPanel({ campaignId }: AiMemoryPreviewPanelProps) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AiMemoryPreviewResult | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [pending, start] = useTransition();
  const [feedbackPending, startFeedback] = useTransition();
  const [feedbackSent, setFeedbackSent] = useState(false);

  function handleRun() {
    const q = question.trim();
    if (!q) {
      toast.error("Scrivi una domanda per la preview.");
      return;
    }
    setFeedbackSent(false);
    setFeedbackNote("");
    start(async () => {
      const res = await runAiMemoryPreviewAction(campaignId, q);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setResult(res.data);
      toast.success("Preview interrogata.");
    });
  }

  function handleFeedback(rating: "approved" | "needs_review" | "incorrect") {
    if (!result) return;
    startFeedback(async () => {
      const res = await submitAiMemoryPreviewFeedbackAction(result.runId, rating, feedbackNote.trim() || null);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setFeedbackSent(true);
      toast.success(res.message);
    });
  }

  return (
    <Card className="border-amber-500/40 bg-amber-950/15 text-barber-paper">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base text-amber-100">
          <FlaskConical className="h-5 w-5 text-amber-300" />
          Memoria Campagna — Preview
          <Badge variant="outline" className="border-amber-500/40 bg-amber-950/40 text-amber-100 text-[10px] tracking-wide">
            Preview — nessuna modifica al canone
          </Badge>
        </CardTitle>
        <CardDescription className="text-amber-200/70">
          Chat sperimentale riservata agli Admin per campagne lunghe. Recupera solo da <code className="rounded bg-amber-950/40 px-1 py-0.5">campaign_memory_chunks</code> della campagna selezionata,
          risponde grounded oppure dichiara evidenza insufficiente. Non salva proposte e non reindicizza.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor={`ai-preview-q-${campaignId}`} className="text-sm font-medium text-amber-200">
            Domanda (solo Admin, campagna lunga)
          </label>
          <Textarea
            id={`ai-preview-q-${campaignId}`}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Es. Chi governa Portico e chi è il sindaco? Cosa sappiamo di Folki?"
            disabled={pending || feedbackPending}
            className="min-h-[110px] resize-y border-amber-500/40 bg-barber-dark/90 text-barber-paper placeholder:text-barber-paper/40"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleRun}
            disabled={pending || feedbackPending}
            className="bg-amber-600 text-white hover:bg-amber-500"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Interrogazione preview…
              </>
            ) : (
              <>
                <FileSearch className="mr-2 h-4 w-4" /> Interroga Preview
              </>
            )}
          </Button>
        </div>

        {result ? (
          <div className="space-y-4 rounded-lg border border-amber-600/35 bg-barber-dark/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={classificationVariant(result.classification)}>
                <Sparkles className="mr-1 h-3 w-3" /> {classificationLabel(result.classification)}
              </Badge>
              <Badge variant="outline" className="border-zinc-600/40 bg-zinc-900/40 text-zinc-100">
                {statusLabel(result.status)}
              </Badge>
              <Badge variant="outline" className="border-sky-600/40 bg-sky-950/30 text-sky-100">
                <Database className="mr-1 h-3 w-3" /> {retrievalLabel(result.retrieval.mode)}
              </Badge>
              <span className="inline-flex items-center gap-1 text-[11px] text-barber-paper/50">
                <Clock className="h-3 w-3" /> {result.timingsMs.total} ms
                <span className="text-barber-paper/30">·</span> retr {result.timingsMs.retrieval} ms
                {typeof result.timingsMs.generation === "number" ? (
                  <><span className="text-barber-paper/30">·</span> gen {result.timingsMs.generation} ms</>
                ) : null}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-amber-100">Risposta</h3>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/95">{result.answer}</div>
            </div>

            {result.claims.length ? (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">Claims (grounded)</h4>
                <ul className="list-disc pl-5 text-xs leading-relaxed text-barber-paper/80">
                  {result.claims.map((c, i) => (
                    <li key={i}>
                      {c.text} <span className="text-barber-paper/40">[{c.evidenceIds.join(", ")}]</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">
                Fonti effettivamente usate nel contesto ({result.sources.length}) — retrieval {result.retrieval.contextChunkCount}/{result.retrieval.retrievedChunkCount} · chunk totali {result.retrieval.chunkCount}
              </h4>
              {result.sources.length ? (
                <div className="space-y-2">
                  {result.sources.map((s) => (
                    <Link
                      key={`${s.evidenceId}-${s.sourceId}`}
                      href={s.href}
                      className="block rounded-md border border-amber-700/25 bg-amber-950/20 p-3 transition-colors hover:bg-amber-900/25"
                    >
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-amber-500/30 bg-transparent text-amber-100 text-[11px]">
                          [{s.evidenceId}] {s.sourceType}
                        </Badge>
                        {typeof s.similarity === "number" ? (
                          <span className="text-[11px] text-barber-paper/45">sim. {Math.round(s.similarity * 100)}%</span>
                        ) : (
                          <span className="text-[11px] text-barber-paper/35">lexical</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-barber-paper">{s.title}</p>
                      <p className="mt-1 text-xs text-barber-paper/60">ID sorgente: {s.sourceId}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-barber-paper/60">Nessuna fonte ha superato il contratto di retrieval per questa domanda.</p>
              )}
            </div>

            <div className="rounded-md border border-zinc-700/40 bg-zinc-900/50 px-3 py-2">
              <p className="text-[11px] font-mono text-barber-paper/60">Run ID: {result.runId}</p>
              <p className="mt-1 text-[11px] text-barber-paper/45">Usa questo ID per confronti, debug e per collegare il feedback alla run.</p>
            </div>

            <div className="space-y-2 border-t border-amber-700/25 pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">Feedback Admin (senza rieseguire)</h4>
              <Textarea
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Nota facoltativa (max 2000) — cosa ha funzionato o no?"
                disabled={feedbackPending || feedbackSent}
                className="min-h-[70px] resize-y border-zinc-600/40 bg-zinc-900/60 text-barber-paper placeholder:text-barber-paper/40 text-sm"
                maxLength={2000}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => handleFeedback("approved")} disabled={feedbackPending || feedbackSent} className="border-emerald-600/40 text-emerald-100 hover:bg-emerald-900/30">
                  {feedbackPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Approvato
                </Button>
                <Button type="button" variant="outline" onClick={() => handleFeedback("needs_review")} disabled={feedbackPending || feedbackSent} className="border-amber-600/40 text-amber-100 hover:bg-amber-900/30">
                  Da rivedere
                </Button>
                <Button type="button" variant="outline" onClick={() => handleFeedback("incorrect")} disabled={feedbackPending || feedbackSent} className="border-rose-600/40 text-rose-100 hover:bg-rose-900/30">
                  Errato
                </Button>
              </div>
              {feedbackSent ? <p className="text-xs text-emerald-300">Feedback registrato per questa run.</p> : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
