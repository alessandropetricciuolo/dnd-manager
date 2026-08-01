"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import GridLayout, { useContainerWidth, type Layout, type LayoutItem } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GmPanelChrome } from "./gm-panel-chrome";
import { GmAddPanelMenu } from "./gm-add-panel-menu";
import { GM_PANEL_REGISTRY, getPanelLabel } from "./gm-panel-registry";
import { loadGmScreenLayout, saveGmScreenLayout, toStoredLayout } from "./gm-layout-storage";
import { getPresetForMode } from "./gm-presets";
import {
  GmScreenBoardProvider,
  type GmScreenBoardActions,
  type OpenMonsterStatOptions,
} from "./gm-screen-board-context";
import type { GmLayoutItem, GmPanelType, GmWorkspaceMode } from "./types";

const COLS = 12;
const ROW_HEIGHT = 36;

type SheetOpeners = {
  openMapsSheet: () => void;
  openFowSheet: () => void;
  openGallerySheet: () => void;
  openWhispersSheet: () => void;
  openAudioSheet: () => void;
};

type GmScreenBoardProps = {
  campaignId: string;
  currentUserId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
  selectedSessionId?: string | null;
  mode: GmWorkspaceMode;
  onModeChange: (mode: GmWorkspaceMode) => void;
  sheetOpeners: SheetOpeners;
  className?: string;
  /** Extra toolbar actions (e.g. quick note in closure). */
  toolbarExtra?: React.ReactNode;
  /** Override initial/reset preset (e.g. Legacy). */
  presetFactory?: () => GmLayoutItem[];
  /** Hide Durante/Chiusura-driven preset swaps when parent doesn't use mode toggle. */
  lockMode?: boolean;
};

function newPanelId(type: GmPanelType): string {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function itemsToGridLayout(items: GmLayoutItem[]): Layout {
  return items.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW ?? GM_PANEL_REGISTRY[item.type]?.defaultSize.minW ?? 2,
    minH: item.minH ?? GM_PANEL_REGISTRY[item.type]?.defaultSize.minH ?? 2,
  }));
}

function applyGridLayout(items: GmLayoutItem[], layout: Layout): GmLayoutItem[] {
  const byId = new Map(layout.map((l) => [l.i, l]));
  return items.map((item) => {
    const next = byId.get(item.i);
    if (!next) return item;
    return {
      ...item,
      x: next.x,
      y: next.y,
      w: next.w,
      h: next.h,
    };
  });
}

function findNextSlot(items: GmLayoutItem[], w: number, h: number): { x: number; y: number } {
  let maxY = 0;
  for (const item of items) {
    maxY = Math.max(maxY, item.y + item.h);
  }
  // Prefer right column if empty-ish, otherwise stack below.
  const rightBusy = items.some((item) => item.x >= 6 && item.y < 4);
  if (!rightBusy && w <= 6) return { x: 6, y: 0 };
  return { x: 0, y: maxY };
}

export function GmScreenBoard({
  campaignId,
  currentUserId,
  campaignType = null,
  selectedSessionId = null,
  mode,
  onModeChange,
  sheetOpeners,
  className,
  toolbarExtra,
  presetFactory,
  lockMode = false,
}: GmScreenBoardProps) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const [items, setItems] = useState<GmLayoutItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextModePreset = useRef(false);

  const resolvePreset = useCallback(() => {
    return presetFactory ? presetFactory() : getPresetForMode(mode);
  }, [presetFactory, mode]);

  // Initial load from localStorage or preset.
  useEffect(() => {
    const stored = loadGmScreenLayout(campaignId);
    if (stored) {
      skipNextModePreset.current = true;
      setItems(stored.items);
      if (!lockMode && stored.mode !== mode) onModeChange(stored.mode);
    } else {
      setItems(resolvePreset());
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per campaign
  }, [campaignId]);

  // Persist layout (debounced).
  useEffect(() => {
    if (!hydrated) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      saveGmScreenLayout(campaignId, toStoredLayout(mode, items));
    }, 250);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [campaignId, hydrated, items, mode]);

  // Swap presets when mode changes (unless restoring from storage or locked).
  useEffect(() => {
    if (!hydrated || lockMode) return;
    if (skipNextModePreset.current) {
      skipNextModePreset.current = false;
      return;
    }
    setItems(resolvePreset());
  }, [mode, hydrated, lockMode, resolvePreset]);

  const addPanel = useCallback(
    (type: GmPanelType, opts?: { title?: string; props?: Record<string, unknown> }) => {
      const def = GM_PANEL_REGISTRY[type];
      if (!def) return;
      setItems((prev) => {
        if (!def.allowMultiple && prev.some((p) => p.type === type)) {
          return prev;
        }
        const size = def.defaultSize;
        const slot = findNextSlot(prev, size.w, size.h);
        const next: GmLayoutItem = {
          i: newPanelId(type),
          type,
          x: slot.x,
          y: slot.y,
          w: size.w,
          h: size.h,
          minW: size.minW,
          minH: size.minH,
          title: opts?.title ?? def.label,
          props: opts?.props,
        };
        return [...prev, next];
      });
    },
    []
  );

  const removePanel = useCallback((panelId: string) => {
    setItems((prev) => prev.filter((p) => p.i !== panelId));
  }, []);

  const renamePanel = useCallback((panelId: string, title: string) => {
    setItems((prev) => prev.map((p) => (p.i === panelId ? { ...p, title } : p)));
  }, []);

  const openMonsterStat = useCallback(
    (opts: OpenMonsterStatOptions) => {
      addPanel("monsterStat", {
        title: opts.title ?? opts.name ?? "Statblock mostro",
        props: {
          entityId: opts.entityId,
          name: opts.name,
          bestiaryChunkId: opts.bestiaryChunkId,
        },
      });
    },
    [addPanel]
  );

  const openWikiEntity = useCallback(
    (entityId: string, title?: string) => {
      addPanel("wikiEntity", { title: title ?? "Scheda wiki", props: { entityId } });
    },
    [addPanel]
  );

  const openRulesLookup = useCallback(
    (query?: string) => {
      addPanel("rulesLookup", {
        title: query ? `Regole: ${query}` : "Regole",
        props: query ? { query } : undefined,
      });
    },
    [addPanel]
  );

  const resetLayout = useCallback(() => {
    setItems(resolvePreset());
  }, [resolvePreset]);

  const boardActions = useMemo<GmScreenBoardActions>(
    () => ({
      campaignId,
      currentUserId,
      campaignType,
      selectedSessionId,
      mode,
      addPanel,
      removePanel,
      renamePanel,
      openMonsterStat,
      openWikiEntity,
      openRulesLookup,
      resetLayout,
      ...sheetOpeners,
    }),
    [
      campaignId,
      currentUserId,
      campaignType,
      selectedSessionId,
      mode,
      addPanel,
      removePanel,
      renamePanel,
      openMonsterStat,
      openWikiEntity,
      openRulesLookup,
      resetLayout,
      sheetOpeners,
    ]
  );

  const presentTypes = useMemo(() => new Set(items.map((i) => i.type)), [items]);
  const gridLayout = useMemo(() => itemsToGridLayout(items), [items]);

  const onLayoutChange = useCallback((layout: Layout) => {
    setItems((prev) => applyGridLayout(prev, layout));
  }, []);

  const popoutFor = useCallback(
    (item: GmLayoutItem): (() => void) | undefined => {
      switch (item.type) {
        case "maps":
          return sheetOpeners.openMapsSheet;
        case "fow":
          return sheetOpeners.openFowSheet;
        case "gallery":
          return sheetOpeners.openGallerySheet;
        case "whispers":
          return sheetOpeners.openWhispersSheet;
        case "audio":
          return sheetOpeners.openAudioSheet;
        case "missions":
          return () => {
            window.open(
              `/campaigns/${campaignId}/gm-only/missioni/proiezione`,
              "MissionProjectionWindow",
              "width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no"
            );
          };
        default:
          return undefined;
      }
    },
    [campaignId, sheetOpeners]
  );

  return (
    <GmScreenBoardProvider value={boardActions}>
      <div className={cn("flex h-full min-h-0 flex-col", className)}>
        <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
          <GmAddPanelMenu onAdd={(type) => addPanel(type)} presentTypes={presentTypes} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-zinc-700 px-2.5 text-xs text-zinc-300 hover:bg-zinc-800"
            onClick={resetLayout}
            title="Ripristina preset del modo corrente"
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Reset layout
          </Button>
          {toolbarExtra}
        </div>

        <div
          ref={containerRef as RefObject<HTMLDivElement>}
          className="min-h-0 flex-1 overflow-auto rounded-xl border border-amber-600/15 bg-zinc-950/40"
        >
          {!hydrated || !mounted ? (
            <div className="flex h-40 items-center justify-center text-xs text-zinc-500">Caricamento griglia…</div>
          ) : (
            <GridLayout
              width={width}
              layout={gridLayout}
              gridConfig={{
                cols: COLS,
                rowHeight: ROW_HEIGHT,
                margin: [10, 10],
                containerPadding: [10, 10],
              }}
              dragConfig={{
                handle: ".gm-panel-drag-handle",
                bounded: true,
              }}
              resizeConfig={{
                enabled: true,
                handles: ["se", "e", "s"],
              }}
              onLayoutChange={onLayoutChange}
              className="gm-screen-grid"
            >
              {items.map((item) => {
                const def = GM_PANEL_REGISTRY[item.type];
                const title = item.title ?? getPanelLabel(item.type);
                return (
                  <div key={item.i} className="h-full">
                    <GmPanelChrome
                      title={title}
                      onClose={() => removePanel(item.i)}
                      onRename={(next) => renamePanel(item.i, next)}
                      onPopout={popoutFor(item)}
                    >
                      {def ? def.render(item.props ?? {}) : (
                        <p className="text-xs text-zinc-500">Pannello sconosciuto: {item.type}</p>
                      )}
                    </GmPanelChrome>
                  </div>
                );
              })}
            </GridLayout>
          )}
        </div>
      </div>
    </GmScreenBoardProvider>
  );
}

// Re-export LayoutItem type alias for consumers that sync layout.
export type { LayoutItem };
