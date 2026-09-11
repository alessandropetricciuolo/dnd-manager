"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DualSourceImage } from "@/components/dual-source-image";
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
import {
  Check,
  CheckSquare,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  Loader2,
  Map,
  MonitorPlay,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
};
type Category = "all" | "pg" | "npc" | "monster" | "location" | "item" | "lore";
const CATEGORIES: { value: Category; label: string }[] = [
  { value: "all", label: "Tutti" },
  { value: "pg", label: "PG" },
  { value: "npc", label: "NPC" },
  { value: "monster", label: "Mostri" },
  { value: "location", label: "Luoghi" },
  { value: "item", label: "Oggetti" },
  { value: "lore", label: "Lore" },
];
const categoryLabel = (category: GmGalleryItem["category"]) =>
  CATEGORIES.find((c) => c.value === category)?.label ?? "Lore";
function resolveImageUrl(
  item: Pick<GmGalleryItem, "image_url" | "telegram_fallback_id">,
): string | null {
  if (item.image_url?.startsWith("http") || item.image_url?.startsWith("/"))
    return item.image_url;
  return item.telegram_fallback_id
    ? `/api/tg-image/${encodeURIComponent(item.telegram_fallback_id)}`
    : null;
}
function readRecent(campaignId: string): string[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(`gm-gallery-recent:${campaignId}`) ?? "[]",
    );
    return Array.isArray(parsed) && parsed.every((id) => typeof id === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function GmGallerySheet({
  open,
  onOpenChange,
  campaignId,
  campaignType = null,
}: Props) {
  const [items, setItems] = useState<GmGalleryItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [wikiMissionFilter, setWikiMissionFilter] =
    useState<GmGalleryWikiMissionFilter>("all");
  const [missions, setMissions] = useState<{ id: string; title: string }[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [relatedFor, setRelatedFor] = useState<GmGalleryItem | null>(null);
  const [relatedLinks, setRelatedLinks] = useState<RelatedEntityLink[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isLong = campaignType === "long";
  useEffect(() => {
    if (open) setRecentIds(readRecent(campaignId));
  }, [open, campaignId]);
  useEffect(() => {
    if (!open || !isLong) {
      setMissions([]);
      setWikiMissionFilter("all");
      return;
    }
    void listCampaignMissionsLiteForGm(campaignId).then((r) =>
      setMissions(r.success ? r.data : []),
    );
  }, [open, isLong, campaignId]);
  useEffect(() => {
    if (!open) return;
    // Carica l'intera galleria una sola volta: il filtro missione serve a
    // cambiare il focus visivo, senza nascondere le altre immagini.
    void getGmGalleryItems(campaignId).then((r) =>
      setItems(r.success ? r.data : []),
    );
  }, [open, campaignId]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (!q ||
          item.title.toLowerCase().includes(q) ||
          Boolean(item.mission_title?.toLowerCase().includes(q))),
    );
  }, [items, search, category]);
  const recent = useMemo(
    () =>
      recentIds
        .map((id) => filtered.find((item) => item.id === id))
        .filter(Boolean) as GmGalleryItem[],
    [recentIds, filtered],
  );
  const recentSet = useMemo(
    () => new Set(recent.map((item) => item.id)),
    [recent],
  );
  const missionTitle =
    isLong && wikiMissionFilter !== "all"
      ? wikiMissionFilter === "none"
        ? "Senza missione"
        : (missions.find((m) => m.id === wikiMissionFilter)?.title ??
          "Missione selezionata")
      : null;
  const missionItems = useMemo(
    () =>
      filtered.filter(
        (item) =>
          !recentSet.has(item.id) &&
          (missionTitle
            ? wikiMissionFilter === "none"
              ? !item.mission_title
              : item.linked_mission_id === wikiMissionFilter
            : Boolean(item.mission_title)),
      ),
    [filtered, missionTitle, recentSet, wikiMissionFilter],
  );
  const missionSet = useMemo(
    () => new Set(missionItems.map((item) => item.id)),
    [missionItems],
  );
  const otherItems = filtered.filter(
    (item) => !recentSet.has(item.id) && !missionSet.has(item.id),
  );
  const counts = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((c) => [
          c.value,
          c.value === "all"
            ? items.length
            : items.filter((i) => i.category === c.value).length,
        ]),
      ),
    [items],
  );
  const handleClickImage = useCallback(
    (item: GmGalleryItem) => {
      const url = resolveImageUrl(item);
      if (!url) return;
      const next = [
        item.id,
        ...readRecent(campaignId).filter((id) => id !== item.id),
      ].slice(0, 12);
      localStorage.setItem(
        `gm-gallery-recent:${campaignId}`,
        JSON.stringify(next),
      );
      setRecentIds(next);
      window.open(
        url,
        "PlayerScreenWindow",
        "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no",
      );
    },
    [campaignId],
  );
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
    [campaignId],
  );
  const handleProjectRelated = useCallback(
    (link: RelatedEntityLink) => {
      const features =
        "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no";
      if (link.kind === "map") {
        window.open(
          `/campaigns/${campaignId}/maps/${link.id}/view`,
          "MapPlayerWindow",
          features,
        );
        return;
      }
      const url = resolveImageUrl({
        image_url: link.image_url,
        telegram_fallback_id: link.telegram_fallback_id,
      });
      if (url) window.open(url, "PlayerScreenWindow", features);
    },
    [campaignId],
  );
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const handleProjectSelected = () => {
    if (!selectedIds.length) return;
    window.open(
      `/campaigns/${campaignId}/gm-only/regia-immagini/proiezione?items=${selectedIds.join(",")}`,
      "PlayerScreenWindow",
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no",
    );
  };
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
        className="left-[4vw] right-[4vw] top-[4vh] bottom-[4vh] h-auto w-auto max-w-none gap-0 overflow-hidden rounded-lg border-amber-600/30 bg-zinc-950 p-0 text-zinc-100 shadow-2xl"
      >
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-4 border-b border-amber-600/20 bg-zinc-950 px-5 py-3 pr-14">
          <SheetTitle className="flex items-center gap-2 text-left text-lg text-amber-200">
            <ImageIcon className="h-5 w-5 text-amber-400" /> Regia Immagini{" "}
            <span className="text-xs font-normal text-zinc-500">
              {filtered.length} elementi
            </span>
          </SheetTitle>
          <div className="flex items-center gap-2">
            <div className="relative hidden w-72 md:block">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-500" />
              <Input
                aria-label="Cerca immagini"
                placeholder="Cerca titolo o missione…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 border-zinc-700 bg-zinc-900 pl-8 text-xs"
              />
            </div>
            <DownloadAllImagesButton
              campaignId={campaignId}
              variant="outline"
              size="sm"
              className="h-8 border-amber-600/40 text-amber-100 hover:bg-amber-600/10"
            />
          </div>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="w-full shrink-0 border-b border-amber-600/20 bg-zinc-950 px-4 py-3 md:w-52 md:border-b-0 md:border-r md:py-5">
            <label
              htmlFor="gm-gallery-search-mobile"
              className="mb-2 block text-xs font-medium text-zinc-400 md:hidden"
            >
              Cerca immagini
            </label>
            <div className="relative mb-4 md:hidden">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-zinc-500" />
              <Input
                id="gm-gallery-search-mobile"
                placeholder="Titolo o missione…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 border-zinc-700 bg-zinc-900 pl-8 text-xs"
              />
            </div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Categorie
            </div>
            <nav className="flex gap-1 overflow-x-auto md:block md:space-y-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "flex min-h-9 shrink-0 items-center justify-between gap-4 rounded-md px-3 text-left text-xs transition-colors md:w-full",
                    category === c.value
                      ? "bg-amber-600 text-zinc-950"
                      : "text-zinc-300 hover:bg-zinc-800 hover:text-amber-100",
                  )}
                >
                  <span>{c.label}</span>
                  <span
                    className={cn(
                      "tabular-nums",
                      category === c.value
                        ? "text-zinc-950/70"
                        : "text-zinc-500",
                    )}
                  >
                    {counts[c.value]}
                  </span>
                </button>
              ))}
            </nav>
            {isLong && (
              <div className="mt-4 border-t border-zinc-800 pt-4">
                <label
                  htmlFor="gm-gallery-mission"
                  className="mb-2 block text-[11px] font-medium uppercase tracking-wide text-zinc-500"
                >
                  Missione
                </label>
                <select
                  id="gm-gallery-mission"
                  value={wikiMissionFilter}
                  onChange={(e) => setWikiMissionFilter(e.target.value)}
                  className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-amber-100"
                >
                  <option value="all">Tutte le missioni</option>
                  <option value="none">Senza missione</option>
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectionMode((v) => !v);
                setSelectedIds([]);
              }}
              className={cn(
                "mt-5 h-9 w-full border-amber-600/40 text-xs",
                selectionMode
                  ? "bg-amber-600/20 text-amber-100"
                  : "text-amber-200 hover:bg-amber-600/10",
              )}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              {selectionMode ? "Annulla selezione" : "Selezione multipla"}
            </Button>
          </aside>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-5 md:px-6">
            {relatedFor && (
              <div className="mb-5 rounded-md border border-amber-600/35 bg-zinc-900 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium text-amber-200">
                    <Link2 className="h-4 w-4 text-amber-400" /> Collegate a:{" "}
                    {relatedFor.title}
                  </span>
                  <button
                    type="button"
                    aria-label="Chiudi collegate"
                    onClick={() => setRelatedFor(null)}
                    className="rounded p-1 text-zinc-400 hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {relatedLoading ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carico i
                    collegamenti…
                  </div>
                ) : relatedLinks.length === 0 ? (
                  <p className="py-3 text-xs text-zinc-500">
                    Nessuna relazione trovata.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedLinks.map((link) => (
                      <div
                        key={link.relationshipId}
                        className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950 px-2 py-1"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            (link.kind === "map" ||
                              link.image_url ||
                              link.telegram_fallback_id) &&
                            handleProjectRelated(link)
                          }
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <span className="h-7 w-7 shrink-0 overflow-hidden rounded bg-zinc-800">
                            {link.kind === "map" ? (
                              <Map className="h-full w-full p-1.5 text-sky-300" />
                            ) : (
                              (link.image_url || link.telegram_fallback_id) && (
                                <DualSourceImage
                                  driveUrl={link.image_url ?? undefined}
                                  telegramFallbackId={
                                    link.telegram_fallback_id ?? undefined
                                  }
                                  alt={link.name}
                                  className="h-full w-full object-cover"
                                />
                              )
                            )}
                          </span>
                          <span className="truncate text-[11px] text-amber-100">
                            {link.name}
                          </span>
                        </button>
                        {link.kind === "wiki" && (
                          <a
                            href={`/campaigns/${campaignId}/wiki/${link.id}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Apri ${link.name}`}
                            className="text-amber-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="flex min-h-64 items-center justify-center text-sm text-zinc-500">
                Nessuna immagine trovata per questa campagna.
              </div>
            ) : (
              <>
                {recent.length > 0 && (
                  <GallerySection
                    title="Recentemente proiettate"
                    items={recent}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onSelect={toggleSelected}
                    onProject={handleClickImage}
                    onRelated={handleShowRelated}
                  />
                )}
                {missionItems.length > 0 && (
                  <GallerySection
                    title={missionTitle ?? "Immagini collegate alle missioni"}
                    items={missionItems}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onSelect={toggleSelected}
                    onProject={handleClickImage}
                    onRelated={handleShowRelated}
                  />
                )}
                {otherItems.length > 0 && (
                  <GallerySection
                    title={
                      missionTitle
                        ? "Altre immagini"
                        : "Senza missione / altre immagini"
                    }
                    items={otherItems}
                    selectionMode={selectionMode}
                    selectedIds={selectedIds}
                    onSelect={toggleSelected}
                    onProject={handleClickImage}
                    onRelated={handleShowRelated}
                  />
                )}
              </>
            )}
          </main>
        </div>
        {selectionMode && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-amber-600/30 bg-zinc-900 px-5 py-3">
            <span className="text-xs text-zinc-300">
              {selectedIds.length} immagini selezionate
            </span>
            <Button
              type="button"
              size="sm"
              disabled={!selectedIds.length}
              onClick={handleProjectSelected}
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
            >
              <MonitorPlay className="mr-2 h-4 w-4" /> Proietta selezionate
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function GallerySection({
  title,
  items,
  selectionMode,
  selectedIds,
  onSelect,
  onProject,
  onRelated,
}: {
  title: string;
  items: GmGalleryItem[];
  selectionMode: boolean;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onProject: (item: GmGalleryItem) => void;
  onRelated: (item: GmGalleryItem) => void;
}) {
  return (
    <section className="mb-7">
      <div className="mb-3 flex items-baseline gap-3 border-b border-zinc-800 pb-2">
        <h2 className="text-sm font-semibold text-amber-100">{title}</h2>
        <span className="text-[11px] text-zinc-500">{items.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {items.map((item) => (
          <GalleryCard
            key={item.id}
            item={item}
            selectionMode={selectionMode}
            selectedIndex={selectedIds.indexOf(item.id)}
            onSelect={onSelect}
            onProject={onProject}
            onRelated={onRelated}
          />
        ))}
      </div>
    </section>
  );
}
function GalleryCard({
  item,
  selectionMode,
  selectedIndex,
  onSelect,
  onProject,
  onRelated,
}: {
  item: GmGalleryItem;
  selectionMode: boolean;
  selectedIndex: number;
  onSelect: (id: string) => void;
  onProject: (item: GmGalleryItem) => void;
  onRelated: (item: GmGalleryItem) => void;
}) {
  const selected = selectedIndex >= 0;
  return (
    <button
      type="button"
      onClick={() => (selectionMode ? onSelect(item.id) : onProject(item))}
      className={cn(
        "group flex min-w-0 flex-col overflow-hidden rounded-md border bg-zinc-900 text-left transition-colors",
        selected
          ? "border-amber-400 ring-2 ring-amber-500/60"
          : "border-zinc-800 hover:border-amber-600/70",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-800">
        <DualSourceImage
          driveUrl={item.image_url ?? undefined}
          telegramFallbackId={item.telegram_fallback_id ?? undefined}
          alt={item.title}
          className="h-full w-full object-cover"
        />
        {selectionMode ? (
          <span
            className={cn(
              "absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold",
              selected
                ? "border-amber-400 bg-amber-500 text-zinc-950"
                : "border-zinc-500 bg-zinc-900/90 text-zinc-400",
            )}
          >
            {selected ? (
              selectedIndex + 1
            ) : (
              <Check className="h-3.5 w-3.5 opacity-60" />
            )}
          </span>
        ) : (
          <div className="absolute inset-x-2 top-2 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            {item.category !== "pg" && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Mostra entità collegate"
                onClick={(e) => {
                  e.stopPropagation();
                  onRelated(item);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onRelated(item);
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded border border-amber-600/40 bg-zinc-900/90 text-amber-100"
              >
                <Link2 className="h-3.5 w-3.5" />
              </span>
            )}
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
        )}
      </div>
      <div className="min-h-[4.25rem] px-2 py-2">
        <span className="line-clamp-2 text-xs font-medium text-amber-100">
          {item.title}
        </span>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-amber-400/70">
          {categoryLabel(item.category)}
        </span>
        {item.mission_title && (
          <span className="mt-0.5 block truncate text-[10px] text-zinc-500">
            {item.mission_title}
          </span>
        )}
      </div>
    </button>
  );
}
