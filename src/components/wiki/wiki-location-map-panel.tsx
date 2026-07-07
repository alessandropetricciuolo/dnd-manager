"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { ExternalLink, Map, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMapFromWikiLocationAction } from "@/app/campaigns/map-actions";

type Props = {
  campaignId: string;
  wikiEntityId: string;
  wikiEntityName: string;
  boundMapId: string | null;
  boundMapName?: string | null;
  hasImage: boolean;
  isGmOrAdmin: boolean;
};

export function WikiLocationMapPanel({
  campaignId,
  wikiEntityId,
  wikiEntityName,
  boundMapId,
  boundMapName,
  hasImage,
  isGmOrAdmin,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!boundMapId && !isGmOrAdmin) return null;

  const handleCreateMap = () => {
    if (!hasImage) {
      toast.error("Aggiungi un'immagine al luogo prima di creare la mappa interattiva.");
      return;
    }
    startTransition(async () => {
      const res = await createMapFromWikiLocationAction(campaignId, wikiEntityId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      router.refresh();
      router.push(`/campaigns/${campaignId}/maps/${res.mapId}`);
    });
  };

  return (
    <div className="rounded-lg border border-barber-gold/30 bg-barber-dark/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium text-barber-gold">
            <Map className="h-4 w-4 shrink-0" />
            Mappa interattiva
          </p>
          <p className="text-xs text-barber-paper/60">
            Un solo elemento wiki per {wikiEntityName}: la scheda descrive il luogo, la mappa ne
            mostra l&apos;interno o il dettaglio navigabile con i pin.
          </p>
        </div>
        {boundMapId ? (
          <Button
            asChild
            size="sm"
            className="shrink-0 bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
          >
            <Link href={`/campaigns/${campaignId}/maps/${boundMapId}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Apri mappa{boundMapName ? `: ${boundMapName}` : ""}
            </Link>
          </Button>
        ) : isGmOrAdmin ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 border-barber-gold/40"
            disabled={pending}
            onClick={handleCreateMap}
          >
            <Plus className="mr-2 h-4 w-4" />
            {pending ? "Creazione…" : "Crea mappa da questo luogo"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
