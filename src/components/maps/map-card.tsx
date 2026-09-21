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
import { openProjectionWindow } from "@/lib/browser/projection-window";

const MAP_TYPE_LABELS: Record<string, string> = {
  world: "Mondo",
  continent: "Continente",
  city: "Città",
  dungeon: "Dungeon",
  district: "Quartiere",
  building: "Edificio",
  region: "Regione",
};

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
    admin_only?: boolean;
  };
  isGmOrAdmin: boolean;
  isAdmin?: boolean;
  adminDraftsEnabled?: boolean;
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
  isAdmin = false,
  adminDraftsEnabled = false,
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

  async function handlePopout(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const viewUrl = `/campaigns/${campaignId}/maps/${map.id}/view`;
    await openProjectionWindow(viewUrl, "MapWindow", { fallbackWidth: 1200, fallbackHeight: 800 });
  }

  const typeLabel = MAP_TYPE_LABELS[map.map_type ?? ""] ?? "Mappa";

  return (
    <div className="card-guild-stone relative group flex flex-col overflow-hidden rounded-2xl border-2 border-brass-base/40 shadow-xl transition-all duration-300 hover:border-brass-base/70 hover:shadow-[0_10px_30px_rgba(200,157,73,0.18)]">
      <div className="corner-ornament-tl" />
      <div className="corner-ornament-tr" />
      <div className="corner-ornament-bl" />
      <div className="corner-ornament-br" />

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
              initialAdminOnly={Boolean(map.admin_only)}
              isAdmin={isAdmin}
              adminDraftsEnabled={adminDraftsEnabled}
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
            className="absolute top-2.5 right-11 z-10 h-8 w-8 rounded-lg border border-brass-base/40 bg-guild-void/90 text-brass-light shadow-md hover:bg-guild-stone hover:text-parchment-100"
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
            className="absolute top-2.5 right-2.5 z-10 h-8 w-8 rounded-lg border border-red-500/40 bg-guild-void/90 text-red-300 shadow-md hover:bg-red-950/60 hover:text-red-200"
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
        <div className="order-1 border-b border-brass-base/20 px-4 py-4 lg:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-brass-base/40 bg-guild-stone px-2.5 py-0.5 text-[10px] font-serif uppercase tracking-wider text-brass-light">
              ✦ {typeLabel}
            </span>
          </div>
          <h3 className="mt-2 font-serif text-xl font-bold leading-tight text-gold-relief">
            <Link
              href={`/campaigns/${campaignId}/maps/${map.id}`}
              className="hover:text-brass-light focus:outline-none focus:ring-2 focus:ring-brass-base/50 rounded"
            >
              {map.name}
            </Link>
          </h3>
          {map.description?.trim() ? (
            <div className="scrollbar-barber-y mt-2 max-h-[min(42vh,20rem)] overflow-y-auto text-xs leading-relaxed text-parchment-300">
              <p className="whitespace-pre-wrap break-words">{map.description}</p>
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-parchment-400">
              Nessuna descrizione per questa mappa.
            </p>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "relative w-full bg-guild-void overflow-hidden",
          isGmOrAdmin ? "aspect-video" : "order-2 aspect-[5/3] max-h-52 lg:order-none lg:aspect-video lg:max-h-none"
        )}
      >
        <Image
          src={map.image_url}
          alt={map.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-guild-void via-guild-void/60 to-transparent transition-opacity backdrop-blur-[2px]",
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
              className="gap-2 border border-brass-base/50 bg-guild-oak/95 text-parchment-100 hover:bg-brass-base/20 hover:text-brass-light font-serif shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="h-4 w-4 text-brass-base" />
              <span>Esplora Mappa</span>
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden gap-2 border border-brass-base/40 bg-guild-void/90 text-parchment-200 hover:bg-brass-base/20 hover:text-brass-light md:inline-flex font-serif text-xs"
            onClick={handlePopout}
            title="Apri in una finestra separata (es. secondo schermo)"
          >
            <ExternalLink className="h-3.5 w-3.5 text-brass-base" />
            <span>Seconda Finestra</span>
          </Button>
          <DownloadImageButton
            driveUrl={map.image_url}
            filename={map.name}
            stopPropagation
            className="border border-brass-base/40 bg-guild-void/90 text-parchment-200 hover:bg-brass-base/20 hover:text-brass-light text-xs"
          />
        </div>
      </div>

      {!isGmOrAdmin ? (
        <div className="order-3 flex flex-wrap gap-2 border-t border-brass-base/20 px-4 py-3 lg:hidden">
          <Link href={`/campaigns/${campaignId}/maps/${map.id}`} className="flex-1 min-w-[8rem]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="btn-wax-seal h-9 w-full gap-2 text-xs font-serif font-bold uppercase tracking-wider"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Apri Mappa</span>
            </Button>
          </Link>
          <DownloadImageButton
            driveUrl={map.image_url}
            filename={map.name}
            stopPropagation
            className="h-9 flex-1 min-w-[8rem] border border-brass-base/30 bg-guild-stone text-parchment-200 hover:bg-brass-base/20 hover:text-brass-light text-xs"
          />
        </div>
      ) : null}

      <div className={cn("p-4 space-y-2", !isGmOrAdmin && "hidden lg:block")}>
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-2 font-serif text-base font-bold text-gold-relief">
            <ImageIcon className="h-4 w-4 shrink-0 text-brass-base" />
            <Link
              href={`/campaigns/${campaignId}/maps/${map.id}`}
              className="hover:text-brass-light focus:outline-none focus:ring-2 focus:ring-brass-base/50 rounded"
            >
              {map.name}
            </Link>
          </h4>
          <span className="rounded-full border border-brass-base/30 bg-guild-stone px-2 py-0.5 text-[10px] font-serif uppercase tracking-wider text-brass-light">
            {typeLabel}
          </span>
        </div>

        {map.description ? (
          <div className="scrollbar-barber-y max-h-24 overflow-y-auto text-xs text-parchment-300">
            <p className="whitespace-pre-wrap break-words pr-1">{map.description}</p>
          </div>
        ) : null}
        {isGmOrAdmin && map.visibility === "selective" && selectiveAudienceLabel && (
          <span className="mt-1 inline-block rounded-md border border-brass-base/30 bg-guild-stone/80 px-2 py-0.5 text-[11px] text-brass-light">
            Visibile a: {selectiveAudienceLabel}
          </span>
        )}
      </div>
    </div>
  );
}
