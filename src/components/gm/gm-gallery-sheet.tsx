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
import { Image as ImageIcon } from "lucide-react";
import {
  getGmGalleryItems,
  listCampaignMissionsLiteForGm,
  type GmGalleryItem,
  type GmGalleryWikiMissionFilter,
} from "@/app/campaigns/wiki-actions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-dvh w-full max-w-md flex-col border-amber-600/30 bg-zinc-950 text-zinc-100"
      >
        <SheetHeader className="shrink-0 border-b border-amber-600/20 px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-left text-amber-200">
            <ImageIcon className="h-5 w-5 text-amber-400" />
            Regia Immagini
          </SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3">
          <div className="space-y-2">
            <Input
              placeholder="Cerca per titolo o missione…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
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
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">
                Nessuna immagine trovata per questa campagna.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filtered.map((item) => {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="group flex flex-col items-stretch overflow-hidden rounded-md border border-amber-600/30 bg-zinc-900 text-left text-xs"
                      onClick={() => handleClickImage(item)}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-zinc-800">
                        <DualSourceImage
                          driveUrl={item.image_url ?? undefined}
                          telegramFallbackId={item.telegram_fallback_id ?? undefined}
                          alt={item.title}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
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
