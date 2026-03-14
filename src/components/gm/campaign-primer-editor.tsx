"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updateCampaignPrimer } from "@/app/campaigns/actions";
import { BookOpen } from "lucide-react";

type CampaignPrimerEditorProps = {
  campaignId: string;
  initialPlayerPrimer: string | null;
};

export function CampaignPrimerEditor({
  campaignId,
  initialPlayerPrimer,
}: CampaignPrimerEditorProps) {
  const [value, setValue] = useState(initialPlayerPrimer ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateCampaignPrimer(campaignId, value);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-violet-600/30 bg-violet-950/30 p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-violet-200">
        <BookOpen className="h-4 w-4" />
        Guida del Giocatore (Bibbia)
      </h3>
      <p className="mb-4 text-xs text-violet-200/70">
        Testo pubblico per tutti i membri della campagna: razze, fazioni, regole di casa. I giocatori
        lo leggono dalla dashboard campagna tramite &quot;Leggi la Guida del Giocatore&quot;.
      </p>
      <p className="mb-3 text-xs text-barber-gold/90">
        Usa il Markdown (<code className="rounded bg-barber-dark/80 px-1">## Titolo</code>) per
        creare automaticamente l&apos;indice per i giocatori.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Label htmlFor="campaign-primer-bibbia" className="sr-only">
          Contenuto Bibbia di Campagna
        </Label>
        <Textarea
          id="campaign-primer-bibbia"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="## Razze giocabili&#10;...&#10;&#10;## Fazioni&#10;...&#10;&#10;## Regole di casa&#10;..."
          className="min-h-[280px] w-full resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50 font-mono text-sm"
          disabled={isPending}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isPending}
          className="border-violet-500/50 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
        >
          {isPending ? "Salvataggio..." : "Salva Guida del Giocatore"}
        </Button>
      </form>
    </div>
  );
}
