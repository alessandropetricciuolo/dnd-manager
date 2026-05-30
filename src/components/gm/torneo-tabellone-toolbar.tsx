"use client";

import { Copy, ExternalLink, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { torneoTabelloneUrl } from "@/lib/torneo/live-links";

type Props = {
  campaignId: string;
  className?: string;
};

export function TorneoTabelloneToolbar({ campaignId, className }: Props) {
  const projectionUrl = torneoTabelloneUrl(campaignId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(projectionUrl);
      toast.success("Link tabellone copiato.");
    } catch {
      toast.error("Copia non riuscita.");
    }
  };

  const openProjection = () => {
    window.open(projectionUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={className}>
      <p className="text-[11px] text-zinc-500">
        Apri il link su un secondo monitor o proiettore: si aggiorna automaticamente quando registri i
        vincitori.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 bg-violet-700 text-xs hover:bg-violet-600"
          onClick={openProjection}
        >
          <Monitor className="mr-1.5 h-3.5 w-3.5" />
          Apri su secondo schermo
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => void copyLink()}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copia link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-zinc-400"
          onClick={openProjection}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Nuova finestra
        </Button>
      </div>
    </div>
  );
}
