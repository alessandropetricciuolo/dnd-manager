"use client";

import { useMemo, useState, useTransition } from "react";
import { ImageIcon, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { OPENROUTER_IMAGE_ASPECT_RATIOS } from "@/lib/ai/openrouter-image-preview";
import type { WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import {
  generateTestImageFromPromptAction,
  previewContextualImagePromptAction,
  type AdminCampaignOption,
  type PreviewImagePromptResult,
} from "./actions";

const DEFAULT_PROMPT =
  "Creami un locandiere che lavora nella locanda del gallo della città di Blodstone";

type Props = {
  campaigns: AdminCampaignOption[];
  models: string[];
  defaultModel: string;
};

function StatBadge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-barber-gold/25 bg-barber-dark/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-barber-paper/50">{label}</p>
      <p className="font-mono text-sm text-barber-gold">{value}</p>
    </div>
  );
}

function PromptBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-barber-gold">{title}</h3>
      <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-lg border border-barber-gold/20 bg-black/40 p-4 font-mono text-xs leading-relaxed text-barber-paper/90">
        {text}
      </pre>
    </div>
  );
}

export function ImagePromptDebugClient({ campaigns, models, defaultModel }: Props) {
  const longCampaigns = useMemo(
    () => campaigns.filter((c) => c.type === "long"),
    [campaigns]
  );
  const initialCampaignId = longCampaigns[0]?.id ?? campaigns[0]?.id ?? "";
  const modelOptions = models.length > 0 ? models : [defaultModel];

  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const [userPrompt, setUserPrompt] = useState(DEFAULT_PROMPT);
  const [entityType, setEntityType] = useState<WikiImageEntityKind>("npc");
  const [entityTitle, setEntityTitle] = useState("");
  const [model, setModel] = useState(defaultModel);
  const [aspectRatio, setAspectRatio] = useState<string>("1:1");
  const [preview, setPreview] = useState<PreviewImagePromptResult | null>(null);
  const [testImageSrc, setTestImageSrc] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [generating, startGenerate] = useTransition();

  const selectedCampaign = campaigns.find((c) => c.id === campaignId);

  function buildInput() {
    return {
      campaignId,
      userPrompt,
      entityType,
      entityTitle,
      model,
      aspectRatio,
    };
  }

  function handlePreview() {
    if (!campaignId) {
      toast.error("Seleziona una campagna.");
      return;
    }
    startTransition(async () => {
      const res = await previewContextualImagePromptAction(buildInput());
      setPreview(res);
      setTestImageSrc(null);
      if (!res.success) {
        toast.error(res.message);
      }
    });
  }

  function handleGenerateTest() {
    if (!campaignId) {
      toast.error("Seleziona una campagna.");
      return;
    }
    startGenerate(async () => {
      const res = await generateTestImageFromPromptAction(buildInput());
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setTestImageSrc(res.imageUrl ?? res.imageBase64 ?? null);
      toast.success(`Immagine generata in ${res.durationMs} ms`);
    });
  }

  const built = preview?.success ? preview.result : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="campaign">Campagna</Label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger id="campaign" className="border-barber-gold/30 bg-barber-dark">
              <SelectValue placeholder="Seleziona campagna" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.type || "?"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCampaign?.type !== "long" && (
            <p className="text-xs text-amber-400/90">
              Campagna non long: la memoria IA wiki non verrà inclusa nel prompt.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="entity-type">Tipo entità</Label>
          <Select value={entityType} onValueChange={(v) => setEntityType(v as WikiImageEntityKind)}>
            <SelectTrigger id="entity-type" className="border-barber-gold/30 bg-barber-dark">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="npc">NPC (ritratto)</SelectItem>
              <SelectItem value="location">Luogo</SelectItem>
              <SelectItem value="monster">Mostro (full body)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Modello OpenRouter</Label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger id="model" className="border-barber-gold/30 bg-barber-dark">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aspect-ratio">Aspect ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger id="aspect-ratio" className="border-barber-gold/30 bg-barber-dark">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPENROUTER_IMAGE_ASPECT_RATIOS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="entity-title">Titolo voce wiki (opzionale)</Label>
          <Input
            id="entity-title"
            value={entityTitle}
            onChange={(e) => setEntityTitle(e.target.value)}
            placeholder="Es. Marco il locandiere"
            className="border-barber-gold/30 bg-barber-dark"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="user-prompt">Descrizione / prompt utente</Label>
          <Textarea
            id="user-prompt"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={4}
            className="border-barber-gold/30 bg-barber-dark font-mono text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button
            type="button"
            onClick={handlePreview}
            disabled={pending || generating}
            className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Anteprima prompt completo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateTest}
            disabled={pending || generating}
            className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10"
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            Genera immagine test (OpenRouter)
          </Button>
        </div>
      </div>

      {testImageSrc ? (
        <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
          <h2 className="mb-3 text-base font-semibold text-barber-gold">Immagine di test</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={testImageSrc} alt="" className="mx-auto max-h-[480px] rounded-lg object-contain" />
        </div>
      ) : null}

      {built && preview?.success && (
        <div className="space-y-6">
          <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
            <h2 className="mb-3 text-base font-semibold text-barber-gold">Metriche token e caratteri</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              <StatBadge label="Positivo (car.)" value={built.totals.positive.chars} />
              <StatBadge label="Positivo (CLIP est.)" value={built.totals.positive.estimatedClipTokens} />
              <StatBadge label="Positivo (GPT est.)" value={built.totals.positive.estimatedGptTokens} />
              <StatBadge label="Negativo (car.)" value={built.totals.negative.chars} />
              <StatBadge label="Negativo (CLIP est.)" value={built.totals.negative.estimatedClipTokens} />
              <StatBadge label="Output testo" value={built.totals.outputTextTokens} />
            </div>
            <p className="mt-3 text-xs text-barber-paper/55">
              OpenRouter invia positivo + negative nel campo <code>messages[0].content</code>. Stime CLIP/GPT
              sul payload effettivo.
            </p>
            {preview.providerPreview && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <StatBadge label="Payload OpenRouter (car.)" value={preview.providerPreview.stats.chars} />
                <StatBadge
                  label="Payload (CLIP est.)"
                  value={preview.providerPreview.stats.estimatedClipTokens}
                />
                <StatBadge
                  label="Payload (GPT est.)"
                  value={preview.providerPreview.stats.estimatedGptTokens}
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
            <h2 className="mb-3 text-base font-semibold text-barber-gold">Breakdown sezioni</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-barber-gold/20 text-barber-paper/60">
                    <th className="py-2 pr-4">Sezione</th>
                    <th className="py-2 pr-4">Caratteri</th>
                    <th className="py-2 pr-4">Parole</th>
                    <th className="py-2 pr-4">CLIP est.</th>
                    <th className="py-2">GPT est.</th>
                  </tr>
                </thead>
                <tbody>
                  {built.sections.map((s) => (
                    <tr key={s.id} className="border-b border-barber-gold/10 text-barber-paper/85">
                      <td className="py-2 pr-4 font-medium">{s.label}</td>
                      <td className="py-2 pr-4 font-mono">{s.stats.chars}</td>
                      <td className="py-2 pr-4 font-mono">{s.stats.words}</td>
                      <td className="py-2 pr-4 font-mono">{s.stats.estimatedClipTokens}</td>
                      <td className="py-2 font-mono">{s.stats.estimatedGptTokens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {built.meta.loreSkipReason && !built.meta.loreIncluded && (
              <p className="mt-3 text-xs text-amber-400/90">Memoria IA: {built.meta.loreSkipReason}</p>
            )}
            {built.meta.matchedEntityNames.length > 0 && (
              <p className="mt-1 text-xs text-barber-paper/55">
                Entità matched: {built.meta.matchedEntityNames.join(", ")}
              </p>
            )}
            {built.meta.loreSkipReason && !built.meta.loreIncluded && built.meta.memorySourceCounts && (
              <p className="mt-1 text-xs text-barber-paper/45">
                Pool memoria: {built.meta.memorySourceCounts.wiki} wiki,{" "}
                {built.meta.memorySourceCounts.maps} mappe, {built.meta.memorySourceCounts.characters} PG
              </p>
            )}
          </div>

          <PromptBlock title="Prompt positivo (completo)" text={built.positivePrompt} />
          <PromptBlock title="Negative prompt (strict)" text={built.strictNegativePrompt} />
          {preview.providerPreview && (
            <PromptBlock
              title={`Payload OpenRouter — ${preview.providerPreview.label}`}
              text={preview.providerPreview.text}
            />
          )}
        </div>
      )}
    </div>
  );
}
