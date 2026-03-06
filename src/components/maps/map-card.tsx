"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Trash2, ExternalLink, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteMap } from "@/app/campaigns/map-actions";
import { EditMapDialog } from "./edit-map-dialog";

const POPOUT_FEATURES =
  "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no";

type MapCardProps = {
  campaignId: string;
  map: { id: string; name: string; image_url: string; description?: string | null; map_type?: string };
  isGmOrAdmin: boolean;
};

export function MapCard({ campaignId, map, isGmOrAdmin }: MapCardProps) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Eliminare la mappa "${map.name}"? I pin collegati verranno rimossi.`)) return;
    const result = await deleteMap(map.id, campaignId);
    if (result.success) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  function handlePopout(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const viewUrl = `/campaigns/${campaignId}/maps/${map.id}/view`;
    window.open(viewUrl, "MapWindow", POPOUT_FEATURES);
  }

  return (
    <Card className="relative group overflow-hidden border-barber-gold/40 bg-barber-dark/90 transition-colors hover:border-barber-gold/50">
      {isGmOrAdmin && (
        <>
          <EditMapDialog
            campaignId={campaignId}
            mapId={map.id}
            initialName={map.name}
            initialMapType={map.map_type ?? "region"}
            onSuccess={() => router.refresh()}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-md bg-red-500/20 text-red-300 opacity-0 group-hover:opacity-100 hover:bg-red-500/30 hover:text-red-200"
            onClick={handleDelete}
            title="Elimina mappa"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
      <div className="relative aspect-video w-full bg-slate-800">
        <Image
          src={map.image_url}
          alt={map.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <Link href={`/campaigns/${campaignId}/maps/${map.id}`}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2 border-barber-gold/40 bg-barber-dark/90 text-barber-paper hover:bg-barber-gold/20 hover:text-barber-gold"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="h-4 w-4" />
              Vedi Qui
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden gap-2 border-barber-gold/40 bg-barber-dark/90 text-barber-paper hover:bg-barber-gold/20 hover:text-barber-gold md:inline-flex"
            onClick={handlePopout}
            title="Apri in una finestra separata (es. secondo schermo)"
          >
            <ExternalLink className="h-4 w-4" />
            Nuova Finestra
          </Button>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-barber-paper">
          <ImageIcon className="h-4 w-4 shrink-0 text-barber-gold" />
          <Link
            href={`/campaigns/${campaignId}/maps/${map.id}`}
            className="hover:text-barber-gold focus:outline-none focus:ring-2 focus:ring-barber-gold/50 rounded"
          >
            {map.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {map.description ? (
          <p className="line-clamp-2 text-xs text-barber-paper/70">{map.description}</p>
        ) : null}
        <span className="mt-1 block text-xs text-barber-gold">
          Clicca sull&apos;immagine per aprire la mappa o inviarla a un secondo schermo
        </span>
      </CardContent>
    </Card>
  );
}
