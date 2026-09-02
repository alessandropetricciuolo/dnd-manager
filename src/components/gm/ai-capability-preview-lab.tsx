"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BookOpenCheck, Clock3, Image as ImageIcon, Loader2, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { runAiImagePreviewAction } from "@/lib/actions/ai-image-preview-actions";
import { runAiNarrativePreviewAction } from "@/lib/actions/ai-narrative-preview-actions";
import { runAiRulesPreviewAction } from "@/lib/actions/ai-rules-preview-actions";
import { submitAiPreviewTestFeedbackAction } from "@/lib/actions/ai-preview-test-feedback-actions";
import type { AiPreviewTestResult } from "@/lib/ai-core/contracts";

type LabProps = { campaignId: string };

const panelClass = "border-slate-700/70 bg-slate-950/55 text-barber-paper";
const fieldClass = "border-slate-600/70 bg-barber-dark/80 text-barber-paper placeholder:text-barber-paper/35";

function statusLabel(result: AiPreviewTestResult): string {
  if (result.status === "insufficient_evidence") return "Fonti insufficienti";
  if (result.status === "failed") return "Fallback / errore";
  if (result.classification === "official_rule_found") return "Regola ufficiale trovata";
  return result.classification === "grounded_proposal" ? "Grounded, non canonico" : "Nessuna regola ufficiale";
}

function statusClass(result: AiPreviewTestResult): string {
  if (result.status === "failed") return "border-rose-500/40 bg-rose-950/30 text-rose-100";
  if (result.status === "insufficient_evidence") return "border-amber-500/40 bg-amber-950/30 text-amber-100";
  return "border-emerald-500/40 bg-emerald-950/30 text-emerald-100";
}

function Sources({ result }: { result: AiPreviewTestResult }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-barber-paper/55">
        Fonti recuperate ({result.sources.length})
      </h4>
      {result.sources.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {result.sources.map((source) => (
            <Link
              key={`${source.evidenceId}-${source.sourceId}`}
              href={source.href ?? "#"}
              className="rounded-md border border-slate-700/70 bg-slate-900/60 p-3 transition-colors hover:border-amber-500/50 hover:bg-slate-900"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-slate-600 text-[10px] text-slate-200">
                  [{source.evidenceId}] {source.sourceType}
                </Badge>
                {source.sourceBook ? <span className="text-[10px] text-barber-paper/45">{source.sourceBook}</span> : null}
              </div>
              <p className="mt-1 text-sm font-medium text-barber-paper">{source.title}</p>
              <p className="mt-1 text-[11px] text-barber-paper/45">{source.sourceId}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-xs text-barber-paper/55">Nessuna fonte ha superato il contratto di retrieval.</p>
      )}
    </div>
  );
}

function Feedback({ result }: { result: AiPreviewTestResult }) {
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function submit(rating: "approved" | "needs_review" | "incorrect") {
    start(async () => {
      const response = await submitAiPreviewTestFeedbackAction(result.runId, rating, note.trim() || null);
      if (!response.success) {
        toast.error(response.message);
        return;
      }
      setSent(true);
      toast.success(response.message);
    });
  }

  return (
    <div className="space-y-2 border-t border-slate-700/70 pt-3">
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-barber-paper/55">Feedback Admin</h4>
      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        disabled={pending || sent}
        maxLength={2000}
        placeholder="Nota facoltativa (max 2000)"
        className={`min-h-[64px] resize-y text-sm ${fieldClass}`}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => submit("approved")} disabled={pending || sent} className="border-emerald-600/50 text-emerald-100 hover:bg-emerald-950/40">
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Approvato
        </Button>
        <Button type="button" variant="outline" onClick={() => submit("needs_review")} disabled={pending || sent} className="border-amber-600/50 text-amber-100 hover:bg-amber-950/40">Da rivedere</Button>
        <Button type="button" variant="outline" onClick={() => submit("incorrect")} disabled={pending || sent} className="border-rose-600/50 text-rose-100 hover:bg-rose-950/40">Errato</Button>
      </div>
      {sent ? <p className="text-xs text-emerald-300">Feedback registrato senza rieseguire il test.</p> : null}
    </div>
  );
}

function Result({ result }: { result: AiPreviewTestResult }) {
  const imageSource = result.imageBase64 ?? result.imageUrl;
  return (
    <div className="space-y-4 rounded-lg border border-slate-700/80 bg-barber-dark/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={statusClass(result)}>{statusLabel(result)}</Badge>
        <span className="inline-flex items-center gap-1 text-[11px] text-barber-paper/50">
          <Clock3 className="h-3 w-3" /> {result.timingsMs.total} ms · retrieval {result.timingsMs.retrieval} ms
          {result.timingsMs.generation !== null ? ` · generazione ${result.timingsMs.generation} ms` : ""}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-barber-paper">Risultato</h3>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/95">{result.outputText}</div>
      </div>
      {imageSource ? (
        <div className="overflow-hidden rounded-md border border-slate-700 bg-black/30">
          <Image src={imageSource} alt="Preview immagine AI non canonica" width={1200} height={800} unoptimized className="mx-auto max-h-[520px] w-full object-contain" />
        </div>
      ) : null}
      {result.promptSent ? (
        <details className="rounded-md border border-slate-700/60 bg-slate-900/50 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-barber-paper/70">Brief/prompt effettivamente inviato</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-barber-paper/60">{result.promptSent}</pre>
        </details>
      ) : null}
      <Sources result={result} />
      <div className="rounded-md border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-[11px] text-barber-paper/55">
        <div>Run ID: <span className="font-mono">{result.runId}</span></div>
        {result.provider ? <div className="mt-1">Provider/modello: {result.provider} · {result.model}</div> : null}
        {!result.auditPersisted ? <div className="mt-1 text-amber-300">Audit non persistito: applicare la migration prima del test live.</div> : null}
      </div>
      <Feedback result={result} />
    </div>
  );
}

function LabPanel({
  icon,
  title,
  description,
  label,
  placeholder,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  action: (input: string) => Promise<{ success: true; data: AiPreviewTestResult } | { success: false; message: string }>;
}) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<AiPreviewTestResult | null>(null);
  const [pending, start] = useTransition();

  function run() {
    if (!input.trim()) {
      toast.error("Inserisci un testo prima di avviare la preview.");
      return;
    }
    start(async () => {
      const response = await action(input.trim());
      if (!response.success) {
        toast.error(response.message);
        return;
      }
      setResult(response.data);
      toast.success("Test completato.");
    });
  }

  return (
    <Card className={panelClass}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-slate-100">{icon}{title}</CardTitle>
        <CardDescription className="max-w-3xl text-slate-300/65">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-200" htmlFor={`ai-lab-${title}`}>{label}</label>
          <Textarea id={`ai-lab-${title}`} value={input} onChange={(event) => setInput(event.target.value)} disabled={pending} maxLength={2000} placeholder={placeholder} className={`min-h-[94px] resize-y ${fieldClass}`} />
        </div>
        <Button type="button" onClick={run} disabled={pending} className="bg-amber-600 text-white hover:bg-amber-500">
          {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Test in corso…</> : <>Avvia preview</>}
        </Button>
        {result ? <Result result={result} /> : null}
      </CardContent>
    </Card>
  );
}

export function AiCapabilityPreviewLab({ campaignId }: LabProps) {
  return (
    <section className="space-y-4" aria-labelledby="ai-capability-lab-title">
      <div className="flex items-start gap-3 rounded-lg border border-slate-700/70 bg-slate-950/40 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
        <div>
          <h2 id="ai-capability-lab-title" className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">Laboratorio capacità aggiuntive</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-300/65">Tre prove indipendenti, Admin-only. Ogni risultato è una preview non canonica: nessuna action scrive wiki, memoria, missioni, personaggi, manuali o media.</p>
        </div>
      </div>

      <LabPanel
        icon={<MessageSquareText className="h-5 w-5 text-cyan-300" aria-hidden />}
        title="Generazione testo narrativa"
        description="Usa la memoria campagna in sola lettura come contesto visibile. Le citazioni sono obbligatorie e il risultato resta una proposta creativa non canonica."
        label="Istruzione narrativa"
        placeholder="Es. Scrivi una scena d'arrivo a Portico collegata agli eventi già noti."
        action={(input) => runAiNarrativePreviewAction(campaignId, input)}
      />
      <LabPanel
        icon={<BookOpenCheck className="h-5 w-5 text-violet-300" aria-hidden />}
        title="Interrogazione regole ufficiali"
        description="Cerca solo nel catalogo regole codificato e nei manuali ufficiali indicizzati. Le house rule non vengono usate e sono dichiarate separatamente."
        label="Domanda regola / verifica scheda"
        placeholder="Es. Come funziona la condizione accecato? Verifica il bonus di competenza al livello 5."
        action={(input) => runAiRulesPreviewAction(campaignId, input)}
      />
      <LabPanel
        icon={<ImageIcon className="h-5 w-5 text-rose-300" aria-hidden />}
        title="Generazione immagine grounded"
        description="Costruisce un brief con contesto memoria read-only e usa il provider immagine già configurato. L'output resta temporaneo e non viene caricato come asset."
        label="Brief immagine"
        placeholder="Es. Una veduta notturna di Portico con il Concilio dei Mercanti sullo sfondo."
        action={(input) => runAiImagePreviewAction(campaignId, input)}
      />
      <p className="flex items-center gap-2 px-1 text-xs text-barber-paper/45"><Sparkles className="h-3.5 w-3.5" aria-hidden /> La memoria campagna esistente resta nel pannello separato sopra e continua a usare il suo contratto.</p>
    </section>
  );
}
