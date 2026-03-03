"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteMap } from "@/app/campaigns/map-actions";
import { EditMapDialog } from "./edit-map-dialog";

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

  return (
    <Card className="overflow-hidden border-emerald-700/50 bg-slate-950/70 transition-colors hover:border-emerald-500/60 relative group">
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
      <Link href={`/campaigns/${campaignId}/maps/${map.id}`} className="block">
        <div className="relative aspect-video w-full bg-slate-800">
          <Image
            src={map.image_url}
            alt={map.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 transition-opacity hover:opacity-100" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-50">
            <ImageIcon className="h-4 w-4 shrink-0 text-emerald-400" />
            {map.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {map.description ? (
            <p className="line-clamp-2 text-xs text-slate-400">{map.description}</p>
          ) : null}
          <span className="mt-1 block text-xs text-emerald-400/80">
            Apri mappa interattiva
          </span>
        </CardContent>
      </Link>
    </Card>
  );
}
