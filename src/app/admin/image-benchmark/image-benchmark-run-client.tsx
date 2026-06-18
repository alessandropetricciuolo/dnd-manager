"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Play, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { averageScore } from "@/lib/image-benchmark/types";
import type { ModelReportRow } from "./actions";
import {
  getImageBenchmarkReportAction,
  runFullImageBenchmarkAction,
  runImageBenchmarkPromptAction,
  saveImageBenchmarkScoreAction,
} from "./actions";

type ResultRow = {
  id: string;
  prompt_id: string;
  model: string;
  prompt: string;
  aspect_ratio: string;
  image_url: string | null;
  image_base64: string | null;
  status: "pending" | "success" | "error";
  error_message: string | null;
  duration_ms: number | null;
  estimated_cost_usd: number | null;
};

type PromptRow = {
  id: string;
  category: string;
  prompt: string;
  aspect_ratio: string;
};

type ScoreRow = {
  result_id: string;
  aesthetic_score: number | null;
  prompt_adherence_score: number | null;
  text_rendering_score: number | null;
  fantasy_usefulness_score: number | null;
  production_ready_score: number | null;
  notes: string | null;
};

type RunDetailClientProps = {
  runId: string;
  runTitle: string;
  prompts: PromptRow[];
  results: ResultRow[];
  scores: ScoreRow[];
  models: string[];
};

function imageSrc(result: ResultRow): string | null {
  return result.image_url ?? result.image_base64;
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-8 w-8 rounded border text-sm ${
              value === n
                ? "border-barber-gold bg-barber-gold/20 text-barber-gold"
                : "border-barber-gold/20 text-barber-paper/70"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultCard({
  result,
  category,
  score,
  blindMode,
  onSaved,
}: {
  result: ResultRow;
  category: string;
  score?: ScoreRow;
  blindMode: boolean;
  onSaved: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState({
    aesthetic: score?.aesthetic_score ?? 3,
    adherence: score?.prompt_adherence_score ?? 3,
    text: score?.text_rendering_score ?? 3,
    fantasy: score?.fantasy_usefulness_score ?? 3,
    production: score?.production_ready_score ?? 3,
    notes: score?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const showModel = !blindMode || revealed || Boolean(score);
  const src = imageSrc(result);
  const overall = score ? averageScore(score) : null;

  async function saveScore() {
    setSaving(true);
    try {
      const res = await saveImageBenchmarkScoreAction({
        resultId: result.id,
        aestheticScore: draft.aesthetic,
        promptAdherenceScore: draft.adherence,
        textRenderingScore: draft.text,
        fantasyUsefulnessScore: draft.fantasy,
        productionReadyScore: draft.production,
        notes: draft.notes,
      });
      if (!res.success) toast.error(res.message);
      else {
        toast.success("Valutazione salvata.");
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-barber-gold/20 bg-barber-dark/70">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm text-barber-gold">{category}</CardTitle>
            <p className="mt-1 line-clamp-2 text-xs text-barber-paper/60">{result.prompt}</p>
          </div>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-xs ${
              result.status === "success"
                ? "bg-emerald-900/40 text-emerald-300"
                : result.status === "error"
                  ? "bg-red-900/40 text-red-300"
                  : "bg-amber-900/40 text-amber-300"
            }`}
          >
            {result.status}
          </span>
        </div>
        {showModel ? (
          <p className="font-mono text-[10px] text-barber-paper/50">{result.model}</p>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setRevealed(true)}>
            <Eye className="mr-1 h-3 w-3" />
            Mostra modello
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {result.status === "success" && src ? (
          <button type="button" onClick={() => setExpanded(true)} className="block w-full overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="aspect-square w-full object-cover" />
          </button>
        ) : result.status === "error" ? (
          <p className="text-xs text-red-300">{result.error_message ?? "Errore"}</p>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg bg-barber-dark/80">
            <Loader2 className="h-6 w-6 animate-spin text-barber-gold" />
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-barber-paper/50">
          {result.duration_ms != null ? <span>{result.duration_ms} ms</span> : null}
          {result.estimated_cost_usd != null ? <span>${result.estimated_cost_usd.toFixed(4)}</span> : null}
          <span>{result.aspect_ratio}</span>
        </div>

        {result.status === "success" ? (
          <div className="space-y-2 border-t border-barber-gold/10 pt-2">
            <ScoreInput label="Qualità estetica" value={draft.aesthetic} onChange={(v) => setDraft((d) => ({ ...d, aesthetic: v }))} />
            <ScoreInput label="Aderenza al prompt" value={draft.adherence} onChange={(v) => setDraft((d) => ({ ...d, adherence: v }))} />
            <ScoreInput label="Resa del testo" value={draft.text} onChange={(v) => setDraft((d) => ({ ...d, text: v }))} />
            <ScoreInput label="Utilità fantasy / GDR" value={draft.fantasy} onChange={(v) => setDraft((d) => ({ ...d, fantasy: v }))} />
            <ScoreInput label="Pronto per produzione" value={draft.production} onChange={(v) => setDraft((d) => ({ ...d, production: v }))} />
            <Textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              placeholder="Note…"
              className="text-xs"
            />
            {overall != null ? (
              <p className="text-xs text-barber-gold">Media: {overall.toFixed(2)} / 5</p>
            ) : null}
            <Button type="button" size="sm" disabled={saving} onClick={saveScore}>
              Salva valutazione
            </Button>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-4xl border-barber-gold/30 bg-barber-dark">
          <DialogHeader>
            <DialogTitle className="text-barber-gold">{category}</DialogTitle>
          </DialogHeader>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" className="max-h-[80vh] w-full object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function ImageBenchmarkRunClient({
  runId,
  runTitle,
  prompts,
  results,
  scores,
  models,
}: RunDetailClientProps) {
  const router = useRouter();
  const [selectedModels, setSelectedModels] = useState<string[]>(models);
  const [running, setRunning] = useState(false);
  const [blindMode, setBlindMode] = useState(true);
  const [report, setReport] = useState<ModelReportRow[] | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const scoreByResult = useMemo(
    () => new Map(scores.map((s) => [s.result_id, s])),
    [scores]
  );
  const categoryByPrompt = useMemo(
    () => new Map(prompts.map((p) => [p.id, p.category])),
    [prompts]
  );

  function toggleModel(model: string) {
    setSelectedModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  }

  async function runAll() {
    setRunning(true);
    try {
      const res = await runFullImageBenchmarkAction({ runId, models: selectedModels });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Benchmark completato.");
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  async function runPrompt(promptId: string) {
    setRunning(true);
    try {
      const res = await runImageBenchmarkPromptAction({ runId, promptId, models: selectedModels });
      if (!res.success) toast.error(res.message);
      else {
        toast.success("Prompt eseguito.");
        router.refresh();
      }
    } finally {
      setRunning(false);
    }
  }

  async function loadReport() {
    setLoadingReport(true);
    try {
      const res = await getImageBenchmarkReportAction(runId);
      if (!res.success) toast.error(res.message);
      else setReport(res.ranking);
    } finally {
      setLoadingReport(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-barber-paper">{runTitle}</h1>
        <p className="text-sm text-barber-paper/60">Valutazione cieca attiva di default — il modello resta nascosto finché non voti o clicchi «Mostra modello».</p>
      </header>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Risultati</TabsTrigger>
          <TabsTrigger value="run">Esecuzione</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="run" className="space-y-4 pt-4">
          <Card className="border-barber-gold/25 bg-barber-dark/80">
            <CardHeader>
              <CardTitle className="text-barber-gold">Modelli selezionati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-2">
                {models.map((model) => (
                  <label key={model} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedModels.includes(model)}
                      onChange={() => toggleModel(model)}
                      className="h-4 w-4 accent-barber-gold"
                    />
                    <span className="font-mono text-xs">{model}</span>
                  </label>
                ))}
              </div>
              <Button type="button" disabled={running || selectedModels.length === 0} onClick={runAll}>
                {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                Avvia benchmark (tutti i prompt)
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {prompts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-barber-gold/20 p-3">
                <div>
                  <p className="text-sm font-medium text-barber-gold">{p.category}</p>
                  <p className="line-clamp-1 text-xs text-barber-paper/60">{p.prompt}</p>
                </div>
                <Button type="button" size="sm" variant="outline" disabled={running} onClick={() => runPrompt(p.id)}>
                  Esegui prompt
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={blindMode ? "default" : "outline"}
              onClick={() => setBlindMode((v) => !v)}
            >
              {blindMode ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              Valutazione cieca {blindMode ? "ON" : "OFF"}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((result) => (
              <ResultCard
                key={result.id}
                result={result}
                category={categoryByPrompt.get(result.prompt_id) ?? "—"}
                score={scoreByResult.get(result.id)}
                blindMode={blindMode}
                onSaved={() => router.refresh()}
              />
            ))}
          </div>
          {results.length === 0 ? (
            <p className="text-sm text-barber-paper/60">Nessun risultato. Avvia il benchmark dalla tab Esecuzione.</p>
          ) : null}
        </TabsContent>

        <TabsContent value="report" className="space-y-4 pt-4">
          <Button type="button" variant="outline" disabled={loadingReport} onClick={loadReport}>
            {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
            Calcola report
          </Button>
          {report ? (
            <div className="overflow-x-auto rounded-lg border border-barber-gold/20">
              <table className="min-w-full text-sm">
                <thead className="bg-barber-dark/80 text-left text-barber-paper/70">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Modello</th>
                    <th className="p-3">OK</th>
                    <th className="p-3">Errori</th>
                    <th className="p-3">Pending</th>
                    <th className="p-3">Durata media</th>
                    <th className="p-3">Costo tot.</th>
                    <th className="p-3">Media voti</th>
                    <th className="p-3">Voti</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((row, index) => (
                    <tr key={row.model} className="border-t border-barber-gold/10">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3 font-mono text-xs">{row.model}</td>
                      <td className="p-3">{row.successCount}</td>
                      <td className="p-3">{row.errorCount}</td>
                      <td className="p-3">{row.pendingCount}</td>
                      <td className="p-3">{row.avgDurationMs != null ? `${Math.round(row.avgDurationMs)} ms` : "—"}</td>
                      <td className="p-3">{row.totalCostUsd != null ? `$${row.totalCostUsd.toFixed(4)}` : "—"}</td>
                      <td className="p-3">{row.avgOverallScore != null ? row.avgOverallScore.toFixed(2) : "—"}</td>
                      <td className="p-3">{row.scoredCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
