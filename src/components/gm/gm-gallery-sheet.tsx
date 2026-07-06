"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DualSourceImage } from "@/components/dual-source-image";
import {
  Check,
  CheckSquare,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  Map,
  MonitorPlay,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadAllImagesButton } from "@/components/media/download-all-images-button";
import { DownloadImageButton } from "@/components/media/download-image-button";
import {
  getGmGalleryItems,
  listCampaignMissionsLiteForGm,
  type GmGalleryItem,
  type GmGalleryWikiMissionFilter,
} from "@/app/campaigns/wiki-actions";
import {
  getRelatedEntityLinks,
  type RelatedEntityLink,
} from "@/app/campaigns/entity-graph-actions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
};

function resolveImageUrl(item: GmGalleryItem): string | null {
  if (item.image_url && item.image_url.startsWith("http")) return item.image_url;
  if (item.image_url && item.image_url.startsWith("/api/")) return item.image_url;
  if (item.image_url && item.image_url.startsWith("/")) return item.image_url;
  if (item.telegram_fallback_id) {
    return `/api/tg-image/${encodeURIComponent(item.telegram_fallback_id)}`;
  }
  return null;
}

const CATEGORY_TABS: {
  value: "all" | "pg" | "npc" | "monster" | "location" | "item" | "lore";
  label: string;
}[] = [
  { value: "all", label: "Tutti" },
  { value: "pg", label: "PG" },
  { value: "npc", label: "NPC" },
  { value: "monster", label: "Mostri" },
  { value: "location", label: "Luoghi" },
  { value: "item", label: "Oggetti" },
  { value: "lore", label: "Lore" },
];

export function GmGallerySheet({ open, onOpenChange, campaignId, campaignType = null }: Props) {
  const [items, setItems] = useState<GmGalleryItem[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pg" | "npc" | "monster" | "location" | "item" | "lore">("all");
  const [wikiMissionFilter, setWikiMissionFilter] = useState<GmGalleryWikiMissionFilter>("all");
  const [missions, setMissions] = useState<{ id: string; title: string }[]>([]);
  const [relatedFor, setRelatedFor] = useState<GmGalleryItem | null>(null);
  const [relatedLinks, setRelatedLinks] = useState<RelatedEntityLink[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isLong = campaignType === "long";

  useEffect(() => {
    if (!open || !isLong) {
      setMissions([]);
      setWikiMissionFilter("all");
      return;
    }
    void listCampaignMissionsLiteForGm(campaignId).then((r) => {
      if (r.success) setMissions(r.data);
      else setMissions([]);
    });
  }, [open, isLong, campaignId]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const opts =
        isLong ? { wikiMissionFilter } : undefined;
      const res = await getGmGalleryItems(campaignId, opts);
      if (res.success && res.data) setItems(res.data);
      else setItems([]);
    })();
  }, [open, campaignId, isLong, wikiMissionFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (tab !== "all" && item.category !== tab) return false;
      if (!q) return true;
      const missionHit = item.mission_title?.toLowerCase().includes(q);
      return item.title.toLowerCase().includes(q) || Boolean(missionHit);
    });
  }, [items, search, tab]);

  const handleClickImage = useCallback((item: GmGalleryItem) => {
    const url = resolveImageUrl(item);
    if (!url) return;
    const FEATURES =
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no";
    window.open(url, "PlayerScreenWindow", FEATURES);
  }, []);

  const handleShowRelated = useCallback(
    (item: GmGalleryItem) => {
      setRelatedFor(item);
      setRelatedLinks([]);
      setRelatedLoading(true);
      void getRelatedEntityLinks(campaignId, item.id).then((res) => {
        setRelatedLinks(res.success ? res.data : []);
        setRelatedLoading(false);
      });
    },
    [campaignId]
  );

  const handleProjectRelated = useCallback(
    (link: RelatedEntityLink) => {
      const FEATURES =
        "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no";
      if (link.kind === "map") {
        window.open(`/campaigns/${campaignId}/maps/${link.id}/view`, "MapPlayerWindow", FEATURES);
        return;
      }
      const url = resolveImageUrl({
        id: link.id,
        title: link.name,
        category: "npc",
        image_url: link.image_url,
        telegram_fallback_id: link.telegram_fallback_id,
      });
      if (url) window.open(url, "PlayerScreenWindow", FEATURES);
    },
    [campaignId]
  );

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds([]);
      return !prev;
    });
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleProjectSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    const FEATURES =
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no";
    const url = `/campaigns/${campaignId}/gm-only/regia-immagini/proiezione?items=${selectedIds.join(",")}`;
    window.open(url, "PlayerScreenWindow", FEATURES);
  }, [campaignId, selectedIds]);

  useEffect(() => {
    if (!open) {
      setRelatedFor(null);
      setRelatedLinks([]);
      setSelectionMode(false);
      setSelectedIds([]);
    }
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-md flex-col border-amber-600/30 bg-zinc-950 text-zinc-100"
      >
        <SheetHeader className="shrink-0 space-y-3 border-b border-amber-600/20 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-left text-amber-200">
            <ImageIcon className="h-5 w-5 text-amber-400" />
            Regia Immagini
          </SheetTitle>
          <DownloadAllImagesButton
            campaignId={campaignId}
            variant="outline"
            size="sm"
            className="w-full border-amber-600/40 text-amber-100 hover:bg-amber-600/10"
          />
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
          <div className="space-y-2">
            <Input
              placeholder="Cerca per titolo o missione…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 flex-1 border-amber-600/40 text-xs",
                  selectionMode
                    ? "bg-amber-600/20 text-amber-100 hover:bg-amber-600/30"
                    : "text-amber-200/90 hover:bg-amber-600/10"
                )}
                onClick={toggleSelectionMode}
              >
                <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                {selectionMode ? "Annulla selezione" : "Selezione multipla"}
              </Button>
              {selectionMode && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 flex-1 bg-amber-600 text-xs text-zinc-950 hover:bg-amber-500"
                  disabled={selectedIds.length === 0}
                  onClick={handleProjectSelected}
                >
                  <MonitorPlay className="mr-1.5 h-3.5 w-3.5" />
                  Proietta ({selectedIds.length})
                </Button>
              )}
            </div>
            {selectionMode && (
              <p className="text-[10px] text-zinc-500">
                Tocca le immagini per selezionarle, poi «Proietta» le mostra tutte in un&apos;unica finestra sul secondo schermo.
              </p>
            )}
          </div>
          {isLong && (
            <div className="space-y-1">
              <label htmlFor="gm-gallery-mission" className="text-[11px] font-medium uppercase tracking-wide text-amber-400/80">
                Wiki per missione
              </label>
              <select
                id="gm-gallery-mission"
                value={wikiMissionFilter}
                onChange={(e) => setWikiMissionFilter(e.target.value as GmGalleryWikiMissionFilter)}
                className="h-9 w-full rounded-md border border-amber-600/35 bg-zinc-900 px-2 text-xs text-amber-100"
              >
                <option value="all">Tutte le missioni</option>
                <option value="none">Senza missione</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-500">
                I PG restano sempre visibili nelle tab PG / Tutti. Le immagini wiki si filtrano in base al legame missione.
              </p>
            </div>
          )}
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="flex flex-wrap gap-1 rounded-lg border border-amber-600/30 bg-zinc-900 p-1">
              {CATEGORY_TABS.map((c) => (
                <TabsTrigger
                  key={c.value}
                  value={c.value}
                  className={cn(
                    "flex-1 rounded px-2 py-1 text-[11px]",
                    tab === c.value
                      ? "bg-amber-600 text-zinc-950"
                      : "text-amber-200/80 data-[state=inactive]:hover:bg-amber-600/10"
                  )}
                >
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {relatedFor && (
            <div className="shrink-0 space-y-2 rounded-md border border-amber-600/35 bg-zinc-900/80 p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-200">
                  <Link2 className="h-3.5 w-3.5 text-amber-400" />
                  Collegate a: {relatedFor.title}
                </span>
                <button
                  type="button"
                  className="rounded p-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  onClick={() => setRelatedFor(null)}
                  aria-label="Chiudi collegate"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {relatedLoading ? (
                <div className="flex items-center gap-2 py-2 text-[11px] text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carico i collegamenti…
                </div>
              ) : relatedLinks.length === 0 ? (
                <p className="py-1 text-[11px] text-zinc-500">
                  Nessuna relazione trovata (mappa concettuale).
                </p>
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {relatedLinks.map((link) => {
                    const relLabel = link.label.trim() && link.label.trim() !== "—" ? link.label.trim() : null;
                    const hasImage = link.kind === "map" || link.image_url || link.telegram_fallback_id;
                    return (
                      <div
                        key={link.relationshipId}
                        className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950/70 px-2 py-1"
                      >
                        <button
                          type="button"
                          className={cn(
                            "flex min-w-0 flex-1 items-center gap-2 text-left",
                            hasImage ? "cursor-pointer" : "cursor-default opacity-70"
                          )}
                          onClick={() => hasImage && handleProjectRelated(link)}
                          title={
                            link.kind === "map"
                              ? "Proietta la mappa ai giocatori"
                              : hasImage
                                ? "Proietta l'immagine ai giocatori"
                                : "Nessuna immagine da proiettare"
                          }
                        >
                          {link.kind === "map" ? (
                            <Map className="h-6 w-6 shrink-0 rounded bg-zinc-800 p-1 text-sky-300" />
                          ) : (
                            <div className="h-6 w-6 shrink-0 overflow-hidden rounded bg-zinc-800">
                              {(link.image_url || link.telegram_fallback_id) && (
                                <DualSourceImage
                                  driveUrl={link.image_url ?? undefined}
                                  telegramFallbackId={link.telegram_fallback_id ?? undefined}
                                  alt={link.name}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-medium text-amber-100">
                              {link.name}
                            </span>
                            {relLabel && (
                              <span className="block truncate text-[10px] text-zinc-400">{relLabel}</span>
                            )}
                          </span>
                        </button>
                        {link.kind === "wiki" && (
                          <a
                            href={`/campaigns/${campaignId}/wiki/${link.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded p-1 text-amber-300/80 hover:bg-amber-600/10 hover:text-amber-200"
                            title="Apri la voce wiki"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">
                Nessuna immagine trovata per questa campagna.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filtered.map((item) => {
                  const selectedIndex = selectionMode ? selectedIds.indexOf(item.id) : -1;
                  const isSelected = selectedIndex >= 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        "group flex flex-col items-stretch overflow-hidden rounded-md border bg-zinc-900 text-left text-xs",
                        isSelected ? "border-amber-400 ring-2 ring-amber-500/60" : "border-amber-600/30"
                      )}
                      onClick={() =>
                        selectionMode ? toggleSelected(item.id) : handleClickImage(item)
                      }
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-zinc-800">
                        <DualSourceImage
                          driveUrl={item.image_url ?? undefined}
                          telegramFallbackId={item.telegram_fallback_id ?? undefined}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                        {selectionMode ? (
                          <div
                            className={cn(
                              "absolute left-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold",
                              isSelected
                                ? "border-amber-400 bg-amber-500 text-zinc-950"
                                : "border-zinc-500 bg-zinc-900/80 text-zinc-400"
                            )}
                          >
                            {isSelected ? selectedIndex + 1 : <Check className="h-3.5 w-3.5 opacity-40" />}
                          </div>
                        ) : (
                          <>
                            <div className="absolute right-1 top-1 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                              <DownloadImageButton
                                driveUrl={item.image_url}
                                telegramFallbackId={item.telegram_fallback_id}
                                filename={item.title}
                                compact
                                stopPropagation
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7 border-amber-600/40 bg-zinc-900/90 text-amber-100"
                              />
                            </div>
                            {item.category !== "pg" && (
                              <div className="absolute left-1 top-1 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                                <span
                                  role="button"
                                  tabIndex={0}
                                  title="Mostra entità collegate"
                                  className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-600/40 bg-zinc-900/90 text-amber-100 hover:bg-amber-600/20"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowRelated(item);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleShowRelated(item);
                                    }
                                  }}
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 px-1.5 py-1">
                        <span className="line-clamp-2 text-[11px] font-medium text-amber-100">
                          {item.title}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-amber-400/70">
                          {item.category === "pg"
                            ? "PG"
                            : item.category === "npc"
                              ? "NPC"
                              : item.category === "monster"
                                ? "Mostro"
                                : item.category === "location"
                                  ? "Luogo"
                                  : item.category === "item"
                                    ? "Oggetto"
                                    : "Lore"}
                        </span>
                        {item.category !== "pg" && item.mission_title && (
                          <span className="line-clamp-2 text-[10px] leading-tight text-zinc-400">
                            {item.mission_title}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
