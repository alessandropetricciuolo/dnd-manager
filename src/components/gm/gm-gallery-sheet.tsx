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
import { getGmGalleryItems, type GmGalleryItem } from "@/app/campaigns/wiki-actions";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
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

function openInPlayerScreen(url: string) {
  if (!url) return;
  const FEATURES =
    "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no";
  window.open(url, "PlayerScreenWindow", FEATURES);
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

export function GmGallerySheet({ open, onOpenChange, campaignId }: Props) {
  const [items, setItems] = useState<GmGalleryItem[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "pg" | "npc" | "monster" | "location" | "item" | "lore">("all");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const res = await getGmGalleryItems(campaignId);
      if (res.success && res.data) setItems(res.data);
      else setItems([]);
    })();
  }, [open, campaignId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (tab !== "all" && item.category !== tab) return false;
      if (!q) return true;
      return item.title.toLowerCase().includes(q);
    });
  }, [items, search, tab]);

  const handleClickImage = useCallback((item: GmGalleryItem) => {
    const url = resolveImageUrl(item);
    if (url) openInPlayerScreen(url);
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
              placeholder="Cerca per titolo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 bg-zinc-900 text-xs text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
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
                  const url = resolveImageUrl(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="group flex flex-col items-stretch overflow-hidden rounded-md border border-amber-600/30 bg-zinc-900 text-left text-xs"
                      onClick={() => {
                        if (url) openInPlayerScreen(url);
                      }}
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

