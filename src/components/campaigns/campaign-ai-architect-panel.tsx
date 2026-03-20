"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { generateCampaignContextAction } from "@/lib/actions/ai-architect";
import type { CampaignAiContext } from "@/lib/campaign-ai-context";

const FIELD_LABELS: Record<keyof CampaignAiContext, string> = {
  narrative_tone: "Tono narrativo",
  magic_level: "Livello di magia",
  mechanics_focus: "Focus meccaniche 5e",
  visual_positive: "Stile visivo (positivo)",
  visual_negative: "Vietato in immagine",
};

type CampaignAiArchitectPanelProps = {
  campaignId: string;
  initialContext: CampaignAiContext | null;
};

export function CampaignAiArchitectPanel({
  campaignId,
  initialContext,
}: CampaignAiArchitectPanelProps) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [localContext, setLocalContext] = useState<CampaignAiContext | null>(initialContext);

  useEffect(() => {
    setLocalContext(initialContext);
  }, [initialContext]);

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
        toast.success("Paletti AI salvati. Il contesto è pronto per le prossime funzioni.");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

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
        {localContext && (
          <div className="rounded-lg border border-emerald-600/40 bg-emerald-950/30 px-3 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-200/90">
              Cervello AI configurato
            </p>
            <ul className="space-y-2 text-sm">
              {(Object.keys(FIELD_LABELS) as (keyof CampaignAiContext)[]).map((key) => (
                <li key={key} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
                  <Badge
                    variant="secondary"
                    className="w-fit shrink-0 border-emerald-600/50 bg-emerald-900/50 text-emerald-100"
                  >
                    {FIELD_LABELS[key]}
                  </Badge>
                  <span className="min-w-0 text-violet-100/90 leading-snug">{localContext[key]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-emerald-200/70">
              Puoi rigenerare i paletti in qualsiasi momento: la nuova descrizione sostituisce il contesto
              salvato.
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
