"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  Anchor,
  ArrowLeft,
  Castle,
  DoorOpen,
  Flame,
  History,
  Key,
  Mountain,
  Save,
  Send,
  Skull,
  Star,
  Swords,
  Tent,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  discardMapOverlayDraftAction,
  listMapOverlaySnapshotsAction,
  publishMapOverlayAction,
  restoreMapOverlaySnapshotToDraftAction,
  saveMapOverlayDraftAction,
  type OverlaySnapshotRow,
} from "@/app/campaigns/map-overlay-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { MapOverlayLayer } from "./map-overlay-layer";
import type { CampaignMapOption } from "./interactive-map";
import { cn } from "@/lib/utils";
import {
  MAP_OVERLAY_SYMBOL_IDS,
  type MapOverlayItem,
  type MapOverlaySymbolId,
} from "@/types/map-overlay";

const DEFAULT_ASPECT_RATIO = 16 / 9;

const SYMBOL_ICONS: Record<MapOverlaySymbolId, LucideIcon> = {
  star: Star,
  flame: Flame,
  skull: Skull,
  castle: Castle,
  tent: Tent,
  swords: Swords,
  "door-open": DoorOpen,
  key: Key,
  anchor: Anchor,
  mountain: Mountain,
};

type Tool = "select" | "text" | "symbol";

type MapOverlayEditorProps = {
  campaignId: string;
  mapId: string;
  imageUrl: string;
  mapName: string;
  campaignMaps: CampaignMapOption[];
  initialItems: MapOverlayItem[];
};

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ov-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizedPointFromClient(
  clientX: number,
  clientY: number,
  imageOrContainer: HTMLElement | null
): { x: number; y: number } | null {
  const el = imageOrContainer;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w <= 0 || h <= 0) return null;
  const x = (clientX - rect.left) / w;
  const y = (clientY - rect.top) / h;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

export function MapOverlayEditor({
  campaignId,
  mapId,
  imageUrl,
  mapName,
  campaignMaps,
  initialItems,
}: MapOverlayEditorProps) {
  void campaignMaps;
  const router = useRouter();
  const [items, setItems] = useState<MapOverlayItem[]>(() => initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [symbolId, setSymbolId] = useState<MapOverlaySymbolId>("star");
  const [placeColor, setPlaceColor] = useState("#e8c97a");
  const [placeFontRel, setPlaceFontRel] = useState(0.028);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [snapshots, setSnapshots] = useState<OverlaySnapshotRow[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  /** Tap sulla mappa per inserire (evita aggiunte accidentali durante il pan). */
  const placeTapRef = useRef<{
    pointerId: number;
    cx: number;
    cy: number;
    nx: number;
    ny: number;
  } | null>(null);
  const dragRef = useRef<{
    id: string;
    pointerId: number;
    startCx: number;
    startCy: number;
    origX: number;
    origY: number;
  } | null>(null);

  const aspectRatio = imageAspectRatio ?? DEFAULT_ASPECT_RATIO;

  const selected = useMemo(
    () => (selectedId ? items.find((i) => i.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  const isExternalOrProxyUrl = useMemo(
    () =>
      imageUrl.startsWith("blob:") ||
      imageUrl.startsWith("/api/tg-image/") ||
      imageUrl.startsWith("/api/tg-file/") ||
      imageUrl.includes("drive.google.com") ||
      imageUrl.includes("googleusercontent.com"),
    [imageUrl]
  );

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img?.naturalWidth && img.naturalHeight) {
      setImageAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  const refreshSnapshots = useCallback(async () => {
    const res = await listMapOverlaySnapshotsAction(campaignId, mapId);
    if (res.success) setSnapshots(res.rows);
    else toast.error(res.message);
  }, [campaignId, mapId]);

  useEffect(() => {
    if (!historyOpen) return;
    void refreshSnapshots();
  }, [historyOpen, refreshSnapshots]);

  useEffect(() => {
    if (!draggingId) return;
    const d = dragRef.current;
    if (!d || d.id !== draggingId) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== d.pointerId) return;
      const img = imageRef.current ?? containerRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;
      const dx = (e.clientX - d.startCx) / w;
      const dy = (e.clientY - d.startCy) / h;
      const nx = Math.min(1, Math.max(0, d.origX + dx));
      const ny = Math.min(1, Math.max(0, d.origY + dy));
      setItems((prev) => prev.map((i) => (i.id === d.id ? { ...i, x: nx, y: ny } : i)));
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== d.pointerId) return;
      dragRef.current = null;
      setDraggingId(null);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [draggingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const t = e.target as HTMLElement;
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
        if (!selectedId) return;
        e.preventDefault();
        setItems((prev) => prev.filter((i) => i.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const handleItemPointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedId(id);
      if (tool !== "select") return;
      const item = items.find((i) => i.id === id);
      if (!item) return;
      dragRef.current = {
        id,
        pointerId: e.pointerId,
        startCx: e.clientX,
        startCy: e.clientY,
        origX: item.x,
        origY: item.y,
      };
      setDraggingId(id);
    },
    [items, tool]
  );

  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-map-overlay-item]")) return;
      if (tool !== "text" && tool !== "symbol") return;

      const pt = normalizedPointFromClient(
        e.clientX,
        e.clientY,
        imageRef.current ?? containerRef.current
      );
      if (!pt) return;

      const arm = {
        pointerId: e.pointerId,
        cx: e.clientX,
        cy: e.clientY,
        nx: pt.x,
        ny: pt.y,
      };
      placeTapRef.current = arm;

      const maxMove = 10;
      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        if (placeTapRef.current === arm) placeTapRef.current = null;
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== arm.pointerId) return;
        const dx = ev.clientX - arm.cx;
        const dy = ev.clientY - arm.cy;
        if (dx * dx + dy * dy > maxMove * maxMove) cleanup();
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== arm.pointerId) return;
        cleanup();
        const dx = ev.clientX - arm.cx;
        const dy = ev.clientY - arm.cy;
        if (dx * dx + dy * dy > maxMove * maxMove) return;

        if (tool === "text") {
          setItems((prev) => [
            ...prev,
            {
              kind: "text",
              id: newId(),
              x: arm.nx,
              y: arm.ny,
              text: "Etichetta",
              fontRel: placeFontRel,
              color: placeColor,
            },
          ]);
        } else if (tool === "symbol") {
          setItems((prev) => [
            ...prev,
            {
              kind: "symbol",
              id: newId(),
              x: arm.nx,
              y: arm.ny,
              symbolId,
              color: placeColor,
            },
          ]);
        }
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== arm.pointerId) return;
        cleanup();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    },
    [placeColor, placeFontRel, symbolId, tool]
  );

  const onSaveDraft = async () => {
    const res = await saveMapOverlayDraftAction(campaignId, mapId, items);
    if (res.success) {
      toast.success(res.message ?? "Bozza salvata.");
      router.refresh();
    } else toast.error(res.message);
  };

  const onPublish = async () => {
    const res = await publishMapOverlayAction(
      campaignId,
      mapId,
      publishNote.trim() || null,
      items
    );
    if (res.success) {
      toast.success(res.message ?? "Pubblicato.");
      setPublishOpen(false);
      setPublishNote("");
      router.refresh();
    } else toast.error(res.message);
  };

  const onDiscardDraft = async () => {
    const res = await discardMapOverlayDraftAction(campaignId, mapId);
    if (res.success) {
      toast.success(res.message ?? "Bozza scartata.");
      setItems(initialItems);
      router.refresh();
    } else toast.error(res.message);
  };

  const onRestoreSnapshot = async (snapshotId: string) => {
    const res = await restoreMapOverlaySnapshotToDraftAction(campaignId, mapId, snapshotId);
    if (res.success) {
      toast.success(res.message ?? "Ripristinato in bozza.");
      setHistoryOpen(false);
      router.refresh();
    } else toast.error(res.message);
  };

  const updateSelected = (patch: Partial<MapOverlayItem>) => {
    if (!selectedId) return;
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== selectedId) return i;
        return { ...i, ...patch } as MapOverlayItem;
      })
    );
  };

  return (
    <div className="flex h-screen min-h-0 flex-col bg-slate-950">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-barber-gold/40 bg-barber-dark px-3 py-2 lg:gap-3 lg:px-4">
        <Link href={`/campaigns/${campaignId}/maps/${mapId}`}>
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-slate-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Mappa
          </Button>
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-slate-50 lg:text-lg">
          Annotazioni · {mapName}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="border-barber-gold/50">
                <History className="mr-1.5 h-4 w-4" />
                Storico
              </Button>
            </SheetTrigger>
            <SheetContent className="border-barber-gold/30 bg-barber-dark text-slate-100">
              <SheetHeader>
                <SheetTitle className="text-barber-gold">Versioni precedenti</SheetTitle>
              </SheetHeader>
              <ScrollArea className="mt-4 h-[calc(100vh-8rem)]">
                <ul className="space-y-2 pr-3">
                  {(snapshots ?? []).length === 0 && (
                    <li className="text-sm text-slate-400">Nessuno snapshot ancora.</li>
                  )}
                  {(snapshots ?? []).map((row) => (
                    <li
                      key={row.id}
                      className="rounded-md border border-barber-gold/20 bg-barber-dark/80 p-3 text-sm"
                    >
                      <div className="text-xs text-slate-400">
                        {new Date(row.created_at).toLocaleString()}
                      </div>
                      {row.note && <p className="mt-1 text-slate-300">{row.note}</p>}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        onClick={() => void onRestoreSnapshot(row.id)}
                      >
                        Ripristina in bozza
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-barber-gold/50"
            onClick={() => void onSaveDraft()}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Salva bozza
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-slate-200"
            onClick={() => void onDiscardDraft()}
          >
            Scarta bozza
          </Button>

          <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90">
                <Send className="mr-1.5 h-4 w-4" />
                Pubblica
              </Button>
            </DialogTrigger>
            <DialogContent className="border-barber-gold/30 bg-barber-dark text-slate-100">
              <DialogHeader>
                <DialogTitle className="text-barber-gold">Pubblica annotazioni</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-300">
                Tutti coloro che possono vedere la mappa vedranno questa versione. La versione attuale
                viene salvata nello storico.
              </p>
              <div className="space-y-2">
                <Label htmlFor="pub-note" className="text-slate-200">
                  Nota (opzionale)
                </Label>
                <Textarea
                  id="pub-note"
                  value={publishNote}
                  onChange={(e) => setPublishNote(e.target.value)}
                  placeholder="es. Aggiunti accampamenti"
                  className="min-h-[80px] border-barber-gold/30 bg-slate-900/80"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setPublishOpen(false)}>
                  Annulla
                </Button>
                <Button type="button" onClick={() => void onPublish()}>
                  Conferma pubblicazione
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <div className="relative min-h-[50dvh] min-w-0 flex-1 overflow-hidden rounded-lg border border-barber-gold/20 lg:min-h-0">
          <div
            className="relative h-full min-h-[280px] w-full"
            style={{ aspectRatio: String(aspectRatio), minHeight: 280 }}
          >
            <TransformWrapper
              initialScale={1}
              minScale={0.3}
              maxScale={4}
              centerOnInit
              limitToBounds={false}
            >
              <TransformComponent
                wrapperStyle={{ width: "100%", height: "100%" }}
                contentStyle={{ width: "100%", height: "100%", position: "relative" }}
              >
                <div
                  ref={containerRef}
                  className={cn(
                    "relative h-full w-full",
                    tool !== "select" && "cursor-crosshair",
                    tool === "select" && "cursor-default"
                  )}
                  onPointerDown={handleContainerPointerDown}
                >
                  <Image
                    ref={imageRef}
                    src={imageUrl}
                    alt={mapName}
                    fill
                    className="object-contain pointer-events-none"
                    sizes="100vw"
                    priority
                    unoptimized={isExternalOrProxyUrl}
                    onLoad={handleImageLoad}
                  />
                  <MapOverlayLayer
                    items={items}
                    interactive
                    selectedId={selectedId}
                    onItemPointerDown={handleItemPointerDown}
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 rounded-lg border border-barber-gold/25 bg-barber-dark/90 p-4 lg:w-[340px] lg:self-stretch lg:overflow-y-auto">
          <section>
            <h2 className="mb-2 text-sm font-medium text-barber-gold">Strumento</h2>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={tool === "select" ? "default" : "outline"}
                onClick={() => setTool("select")}
              >
                Seleziona
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tool === "text" ? "default" : "outline"}
                onClick={() => setTool("text")}
              >
                Testo
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tool === "symbol" ? "default" : "outline"}
                onClick={() => setTool("symbol")}
              >
                Simbolo
              </Button>
            </div>
          </section>

          {tool === "symbol" && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-barber-gold">Preset simboli</h2>
              <div className="grid grid-cols-5 gap-2">
                {MAP_OVERLAY_SYMBOL_IDS.map((sid) => {
                  const Icon = SYMBOL_ICONS[sid];
                  const active = symbolId === sid;
                  return (
                    <button
                      key={sid}
                      type="button"
                      title={sid}
                      onClick={() => setSymbolId(sid)}
                      className={cn(
                        "flex h-10 items-center justify-center rounded-md border transition-colors",
                        active
                          ? "border-barber-gold bg-barber-gold/20 text-barber-gold"
                          : "border-barber-gold/25 bg-slate-900/50 text-slate-300 hover:border-barber-gold/50"
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-sm font-medium text-barber-gold">Colore nuovi elementi</h2>
            <Input
              type="color"
              value={placeColor}
              onChange={(e) => setPlaceColor(e.target.value)}
              className="h-10 w-full cursor-pointer border-barber-gold/30 bg-slate-900"
            />
          </section>

          {tool === "text" && (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-barber-gold">Dimensione testo (nuovi)</h2>
              <Slider
                value={[placeFontRel]}
                min={0.012}
                max={0.07}
                step={0.002}
                onValueChange={(v) => setPlaceFontRel(v[0] ?? 0.028)}
              />
            </section>
          )}

          {selected && (
            <section className="space-y-3 border-t border-barber-gold/20 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium text-barber-gold">Elemento selezionato</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-300 hover:bg-red-950/50 hover:text-red-200"
                  onClick={() => {
                    const id = selected.id;
                    setItems((prev) => prev.filter((i) => i.id !== id));
                    setSelectedId(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {selected.kind === "text" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-slate-300">Testo</Label>
                    <Textarea
                      value={selected.text}
                      onChange={(e) => updateSelected({ text: e.target.value } as Partial<MapOverlayItem>)}
                      className="min-h-[72px] border-barber-gold/30 bg-slate-900/80"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Colore</Label>
                    <Input
                      type="color"
                      value={selected.color}
                      onChange={(e) => updateSelected({ color: e.target.value } as Partial<MapOverlayItem>)}
                      className="h-9 border-barber-gold/30 bg-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Dimensione</Label>
                    <Slider
                      value={[selected.fontRel]}
                      min={0.012}
                      max={0.07}
                      step={0.002}
                      onValueChange={(v) => updateSelected({ fontRel: v[0] } as Partial<MapOverlayItem>)}
                    />
                  </div>
                </>
              )}

              {selected.kind === "symbol" && (
                <div className="space-y-2">
                  <Label className="text-slate-300">Colore</Label>
                  <Input
                    type="color"
                    value={selected.color ?? "#e8c97a"}
                    onChange={(e) => updateSelected({ color: e.target.value } as Partial<MapOverlayItem>)}
                    className="h-9 border-barber-gold/30 bg-slate-900"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Scala</Label>
                <Slider
                  value={[selected.scale ?? 1]}
                  min={0.25}
                  max={4}
                  step={0.05}
                  onValueChange={(v) => updateSelected({ scale: v[0] } as Partial<MapOverlayItem>)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Rotazione (°)</Label>
                <Slider
                  value={[selected.rotation ?? 0]}
                  min={-180}
                  max={180}
                  step={1}
                  onValueChange={(v) => updateSelected({ rotation: v[0] } as Partial<MapOverlayItem>)}
                />
              </div>
            </section>
          )}

          <p className="text-xs leading-relaxed text-slate-500">
            Suggerimento: con <strong className="font-medium text-slate-400">Seleziona</strong> trascina un
            elemento. Con Testo o Simbolo, clicca sul vuoto della mappa per aggiungere.
          </p>
        </aside>
      </div>
    </div>
  );
}
