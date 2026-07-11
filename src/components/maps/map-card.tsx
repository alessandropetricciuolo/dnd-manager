"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { ImageIcon, Trash2, ExternalLink, MapPin, Pencil } from "lucide-react";
import { DownloadImageButton } from "@/components/media/download-image-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteMap } from "@/app/campaigns/map-actions";
import { EditMapDialog } from "./edit-map-dialog";
import { cn } from "@/lib/utils";

const MAP_TYPE_LABELS: Record<string, string> = {
  world: "Mondo",
  continent: "Continente",
  city: "Città",
  dungeon: "Dungeon",
  district: "Quartiere",
  building: "Edificio",
  region: "Regione",
};

const POPOUT_FEATURES =
  "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no";

type MapCardProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  map: {
    id: string;
    name: string;
    image_url: string;
    description?: string | null;
    map_type?: string;
    visibility?: string;
    parent_map_id?: string | null;
    wiki_entity_id?: string | null;
  };
  isGmOrAdmin: boolean;
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
  permittedUserIds?: string[];
  selectiveAudienceLabel?: string | null;
};

export function MapCard({
  campaignId,
  campaignType = null,
  map,
  isGmOrAdmin,
  eligiblePlayers = [],
  eligibleParties = [],
  permittedUserIds = [],
  selectiveAudienceLabel = null,
}: MapCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const inferredPartyIds = eligibleParties
    .filter((party) => party.memberIds.length > 0 && party.memberIds.every((id) => permittedUserIds.includes(id)))
    .map((party) => party.id);

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

  const typeLabel = MAP_TYPE_LABELS[map.map_type ?? ""] ?? "Mappa";

  return (
    <Card className="relative group flex flex-col overflow-hidden border-barber-gold/40 bg-barber-dark/90 transition-colors hover:border-barber-gold/50">
      {isGmOrAdmin && (
        <>
          {editOpen && (
            <EditMapDialog
              campaignId={campaignId}
              campaignType={campaignType}
              mapId={map.id}
              initialName={map.name}
              initialDescription={map.description ?? null}
              initialMapType={map.map_type ?? "city"}
              initialParentMapId={map.parent_map_id ?? null}
              initialWikiEntityId={map.wiki_entity_id ?? null}
              initialVisibility={map.visibility ?? "public"}
              initialAllowedUserIds={permittedUserIds}
              initialAllowedPartyIds={inferredPartyIds}
              eligiblePlayers={eligiblePlayers}
              eligibleParties={eligibleParties}
              onSuccess={() => router.refresh()}
              open={editOpen}
              onOpenChange={setEditOpen}
              hideTrigger
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-10 z-10 h-8 w-8 rounded-md bg-slate-700/90 text-slate-100 opacity-100 hover:bg-slate-500/80 hover:text-slate-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setEditOpen(true);
            }}
            title="Modifica info"
            aria-label="Modifica info mappa"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-md bg-red-600/30 text-red-200 opacity-100 hover:bg-red-500/40 hover:text-red-100"
            onClick={handleDelete}
            title="Elimina mappa"
            aria-label="Elimina mappa"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Mobile giocatore: descrizione in primo piano */}
      {!isGmOrAdmin ? (
        <div className="order-1 border-b border-barber-gold/15 px-4 py-4 lg:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-barber-gold/30 bg-barber-gold/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-barber-gold">
              {typeLabel}
            </span>
          </div>
          <h3 className="mt-2 font-serif text-xl font-semibold leading-tight text-barber-paper">
            <Link
              href={`/campaigns/${campaignId}/maps/${map.id}`}
              className="hover:text-barber-gold focus:outline-none focus:ring-2 focus:ring-barber-gold/50 rounded"
            >
              {map.name}
            </Link>
          </h3>
          {map.description?.trim() ? (
            <div className="scrollbar-barber-y mt-3 max-h-[min(42vh,20rem)] overflow-y-auto text-sm leading-relaxed text-barber-paper/90">
              <p className="whitespace-pre-wrap break-words">{map.description}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm italic text-barber-paper/50">
              Nessuna descrizione per questa mappa.
            </p>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "relative w-full bg-slate-800",
          isGmOrAdmin ? "aspect-video" : "order-2 aspect-[5/3] max-h-52 lg:order-none lg:aspect-video lg:max-h-none"
        )}
      >
        <Image
          src={map.image_url}
          alt={map.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent transition-opacity",
            isGmOrAdmin
              ? "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              : "pointer-events-none opacity-0 lg:pointer-events-auto lg:opacity-0 lg:group-hover:opacity-100"
          )}
        >
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
          <DownloadImageButton
            driveUrl={map.image_url}
            filename={map.name}
            stopPropagation
            className="border-barber-gold/40 bg-barber-dark/90 text-barber-paper hover:bg-barber-gold/20 hover:text-barber-gold"
          />
        </div>
      </div>

      {!isGmOrAdmin ? (
        <div className="order-3 flex flex-wrap gap-2 border-t border-barber-gold/15 px-3 py-3 lg:hidden">
          <Link href={`/campaigns/${campaignId}/maps/${map.id}`} className="flex-1 min-w-[8rem]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 w-full gap-2 border-barber-gold/40 bg-barber-dark/90 text-barber-paper hover:bg-barber-gold/20 hover:text-barber-gold"
            >
              <MapPin className="h-4 w-4" />
              Apri mappa
            </Button>
          </Link>
          <DownloadImageButton
            driveUrl={map.image_url}
            filename={map.name}
            stopPropagation
            className="h-9 flex-1 min-w-[8rem] border-barber-gold/40 bg-barber-dark/90 text-barber-paper hover:bg-barber-gold/20 hover:text-barber-gold"
          />
        </div>
      ) : null}

      <CardHeader className={cn("pb-2", !isGmOrAdmin && "hidden lg:flex")}>
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
      <CardContent className={cn("pt-0", !isGmOrAdmin && "hidden lg:block")}>
        {map.description ? (
          <div className="scrollbar-barber-y max-h-28 overflow-y-auto text-xs text-barber-paper/85">
            <p className="whitespace-pre-wrap break-words pr-1">{map.description}</p>
          </div>
        ) : null}
        {isGmOrAdmin && map.visibility === "selective" && selectiveAudienceLabel && (
          <span className="mt-1 inline-block rounded-md border border-barber-gold/30 bg-barber-gold/10 px-2 py-1 text-[11px] text-barber-gold/90">
            Visibile a: {selectiveAudienceLabel}
          </span>
        )}
        <span className="mt-1 block text-xs text-barber-gold">
          Clicca sull&apos;immagine per aprire la mappa o inviarla a un secondo schermo
        </span>
      </CardContent>
    </Card>
  );
}
