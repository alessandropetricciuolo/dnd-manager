"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Sparkles, Loader2, BookMarked } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { generateCampaignContextAction } from "@/lib/actions/ai-architect";
import { updateCampaignExcludedManualBooksAction } from "@/lib/actions/campaign-ai-settings-actions";
import type { CampaignAiContext } from "@/lib/campaign-ai-context";
import { CAMPAIGN_AI_CORE_FIELD_LABELS, type CampaignAiCoreFields } from "@/lib/campaign-ai-context";
import { WIKI_MANUAL_BOOK_OPTIONS } from "@/lib/manual-book-catalog";

type CampaignAiArchitectPanelProps = {
  campaignId: string;
  initialContext: CampaignAiContext | null;
  /** Esclusioni manuali (lettura da `ai_context`, anche se i sei paletti non sono ancora configurati). */
  initialExcludedManualBookKeys: string[];
};

export function CampaignAiArchitectPanel({
  campaignId,
  initialContext,
  initialExcludedManualBookKeys,
}: CampaignAiArchitectPanelProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [localContext, setLocalContext] = useState<CampaignAiContext | null>(initialContext);
  const [excludedKeys, setExcludedKeys] = useState<string[]>(initialExcludedManualBookKeys);
  const [savingExclusions, setSavingExclusions] = useState(false);

  useEffect(() => {
    setLocalContext(initialContext);
  }, [initialContext]);

  useEffect(() => {
    setExcludedKeys(initialExcludedManualBookKeys);
  }, [initialExcludedManualBookKeys]);

  function handleGenerate() {
    const text = description.trim();
    if (!text) {
      toast.error("Scrivi una descrizione dell’ambientazione.");
      return;
    }
    startTransition(async () => {
      const res = await generateCampaignContextAction(campaignId, text);
      if (res.success) {
        setLocalContext(res.data);
        setExcludedKeys(res.data.excluded_manual_book_keys ?? []);
        toast.success("Paletti AI salvati. Il contesto è pronto per le prossime funzioni.");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  function toggleExcluded(key: string) {
    setExcludedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function saveExclusions() {
    setSavingExclusions(true);
    try {
      const res = await updateCampaignExcludedManualBooksAction(campaignId, excludedKeys);
      if (res.success) {
        toast.success("Manuali esclusi aggiornati per la ricerca wiki AI.");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } finally {
      setSavingExclusions(false);
    }
  }

  const coreFieldKeys = Object.keys(CAMPAIGN_AI_CORE_FIELD_LABELS) as (keyof CampaignAiCoreFields)[];

  return (
    <Card className="border-violet-600/40 bg-violet-950/20 text-barber-paper">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-violet-100">
          <Sparkles className="h-5 w-5 text-violet-300" />
          L&apos;Anima della Campagna (Configurazione AI)
        </CardTitle>
        <CardDescription className="text-violet-200/70">
          Descrivi tono, magia e stile in linguaggio naturale: l&apos;Agente Architetto estrae un profilo
          tecnico (JSON) con paletti per ridurre allucinazioni nelle generazioni future.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-sky-700/40 bg-sky-950/25 px-3 py-3">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sky-200/90">
            <BookMarked className="h-4 w-4" />
            Manuali per la generazione wiki (RAG)
          </p>
          <p className="mb-3 text-xs text-sky-100/75">
            Di default sono usati <strong className="font-medium text-sky-100/90">tutti</strong> i manuali
            indicizzati. Spunta quelli da <strong className="font-medium">escludere</strong> per questa campagna
            (incantesimi, mostri, razze… non verranno mai citati dalle ricerche AI della wiki).
          </p>
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            {WIKI_MANUAL_BOOK_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-sky-800/35 bg-barber-dark/50 px-2 py-2 text-xs text-sky-50/90 hover:bg-sky-950/30"
              >
                <input
                  type="checkbox"
                  checked={excludedKeys.includes(opt.key)}
                  onChange={() => toggleExcluded(opt.key)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-sky-600/50 bg-barber-dark text-sky-400"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={savingExclusions}
            onClick={() => void saveExclusions()}
            className="border-sky-500/45 text-sky-100 hover:bg-sky-900/40"
          >
            {savingExclusions ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvataggio…
              </>
            ) : (
              "Salva esclusioni manuali"
            )}
          </Button>
        </div>

        {localContext && (
          <div className="rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-3 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-200/90">
              Cervello AI configurato
            </p>
            <ul className="space-y-2 text-sm">
              {coreFieldKeys.map((key) => (
                <li key={key} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                  <Badge
                    variant="secondary"
                    className="w-fit shrink-0 border-emerald-600/50 bg-emerald-900/50 text-emerald-100"
                  >
                    {CAMPAIGN_AI_CORE_FIELD_LABELS[key]}
                  </Badge>
                  <span className="min-w-0 text-violet-100/90 leading-snug">{localContext[key]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-emerald-200/70">
              Puoi rigenerare i paletti in qualsiasi momento: la nuova descrizione sostituisce il contesto
              salvato (le esclusioni manuali sopra vengono conservate).
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor={`ai-architect-desc-${campaignId}`} className="text-sm font-medium text-violet-200">
            Descrizione per l&apos;Architetto
          </label>
          <Textarea
            id={`ai-architect-desc-${campaignId}`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrivi il tono, la magia, e lo stile della tua campagna..."
            disabled={pending}
            className="min-h-[140px] resize-y border-violet-500/40 bg-barber-dark/90 text-barber-paper placeholder:text-barber-paper/40"
          />
        </div>

        <Button
          type="button"
          onClick={handleGenerate}
          disabled={pending}
          className="bg-violet-600 text-white hover:bg-violet-500"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generazione in corso…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Genera Paletti AI
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
