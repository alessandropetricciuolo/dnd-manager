"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Map as MapIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getGmRegiaWikiMapsAction, type GmRegiaWikiMap } from "@/app/campaigns/gm-actions";
import { cn } from "@/lib/utils";

const POPOUT_FEATURES =
  "width=1200,height=800,menubar=no,toolbar=no,location=no,status=no";

const MAP_TYPE_LABEL: Record<string, string> = {
  world: "Mondo",
  continent: "Continente",
  city: "Città",
  dungeon: "Dungeon",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
};

export function GmWikiMapsSheet({ open, onOpenChange, campaignId }: Props) {
  const [maps, setMaps] = useState<GmRegiaWikiMap[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    setLoading(true);
    void getGmRegiaWikiMapsAction(campaignId).then((res) => {
      if (res.success && res.data) setMaps(res.data);
      else setMaps([]);
      setLoading(false);
    });
  }, [open, campaignId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return maps;
    return maps.filter((m) => {
      const typeLabel = m.map_type ? (MAP_TYPE_LABEL[m.map_type] ?? m.map_type) : "";
      return m.name.toLowerCase().includes(q) || typeLabel.toLowerCase().includes(q);
    });
  }, [maps, search]);

  const projectMap = useCallback(
    (map: GmRegiaWikiMap) => {
      setActiveMapId(map.id);
      const viewUrl = `/campaigns/${campaignId}/maps/${map.id}/view`;
      const popup = window.open(viewUrl, "MapPlayerWindow", POPOUT_FEATURES);
      if (!popup) {
        toast.error("Impossibile aprire la proiezione. Consenti i popup per questo sito.");
      }
    },
    [campaignId]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-md flex-col border-amber-600/30 bg-zinc-950 text-zinc-100"
      >
        <SheetHeader className="shrink-0 space-y-2 border-b border-amber-600/20 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-left text-amber-200">
            <MapIcon className="h-5 w-5 text-amber-400" />
            Regia Mappe
          </SheetTitle>
          <p className="text-left text-xs text-zinc-400">
            Clicca una mappa per proiettarla sullo schermo giocatori. Resti nel GM Screen.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 border-amber-600/40 text-xs text-amber-100 hover:bg-amber-600/10"
          >
            <Link href={`/campaigns/${campaignId}?tab=mappe`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Gestisci mappe (editor)
            </Link>
          </Button>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
          <Input
            placeholder="Cerca per nome o tipo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500"
          />

          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {loading ? (
              <p className="py-6 text-center text-xs text-zinc-500">Caricamento mappe…</p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">
                Nessuna mappa trovata. Carica mappe dalla tab Mappe della campagna.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((map) => (
                  <button
                    key={map.id}
                    type="button"
                    className={cn(
                      "group flex flex-col overflow-hidden rounded-md border text-left text-xs transition-colors",
                      activeMapId === map.id
                        ? "border-amber-400 bg-amber-600/10"
                        : "border-amber-600/30 bg-zinc-900 hover:border-amber-500/50"
                    )}
                    onClick={() => projectMap(map)}
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-800">
                      <Image
                        src={map.image_url}
                        alt={map.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="200px"
                        unoptimized
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 px-2 py-1.5">
                      <span className="line-clamp-2 text-[11px] font-medium text-amber-100">
                        {map.name}
                      </span>
                      {map.map_type ? (
                        <span className="text-[10px] uppercase tracking-wide text-amber-400/70">
                          {MAP_TYPE_LABEL[map.map_type] ?? map.map_type}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
