"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { BookOpen, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WikiCodexReader } from "./wiki-codex-reader";
import { WikiCodexIndex } from "./wiki-codex-index";
import { WikiColumnBoard } from "./wiki-column-board";
import {
  WIKI_ENTITY_TYPES,
  WIKI_FILTER_LABELS_IT,
} from "@/lib/wiki/entity-types";

export type WikiEntityListItem = {
  id: string;
  name: string;
  type: string;
  isSecret: boolean;
  visibility?: string;
  selectiveAudienceLabel?: string | null;
  sortOrder: number | null;
  tags?: string[];
  description?: string;
  contentBody?: string;
  imageUrl?: string | null;
  telegramFallbackId?: string | null;
  attributes?: Record<string, unknown> | null;
  linkedMissionId?: string | null;
  missionTitle?: string | null;
};

type WikiListClientProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  missions?: { id: string; title: string }[];
  entities: WikiEntityListItem[];
  isGmOrAdmin: boolean;
  typeLabels: Record<string, string>;
  emptyMessage?: string;
};

const ALL_TYPES = "all";
const WIKI_FILTER_VALUES = [ALL_TYPES, ...WIKI_ENTITY_TYPES] as const;
type WikiFilterValue = (typeof WIKI_FILTER_VALUES)[number];

const MISSION_FILTER_ALL = "all";
const MISSION_FILTER_NONE = "none";

function isWikiFilterValue(value: string): value is WikiFilterValue {
  return WIKI_FILTER_VALUES.includes(value as WikiFilterValue);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function sortEntitiesForDisplay(
  items: WikiEntityListItem[],
  typeFilter: WikiFilterValue,
): WikiEntityListItem[] {
  if (typeFilter === "lore" || items.every((e) => e.type === "lore")) {
    return [...items].sort((a, b) => {
      const na = a.sortOrder ?? 9999;
      const nb = b.sortOrder ?? 9999;
      if (na !== nb) return na - nb;
      return a.name.localeCompare(b.name, "it");
    });
  }
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export function WikiListClient({
  campaignId,
  campaignType = null,
  missions = [],
  entities,
  isGmOrAdmin,
  typeLabels,
  emptyMessage,
}: WikiListClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");

  const wikiFilterParam = searchParams.get("wiki_filter");
  const typeFilter: WikiFilterValue =
    wikiFilterParam && isWikiFilterValue(wikiFilterParam)
      ? wikiFilterParam
      : ALL_TYPES;

  const wikiMissionParam = searchParams.get("wiki_mission");
  const missionIds = useMemo(
    () => new Set(missions.map((m) => m.id)),
    [missions],
  );
  const missionFilter: string = useMemo(() => {
    if (campaignType !== "long") return MISSION_FILTER_ALL;
    if (!wikiMissionParam || wikiMissionParam === MISSION_FILTER_ALL)
      return MISSION_FILTER_ALL;
    if (wikiMissionParam === MISSION_FILTER_NONE) return MISSION_FILTER_NONE;
    if (isUuidLike(wikiMissionParam) && missionIds.has(wikiMissionParam))
      return wikiMissionParam;
    return MISSION_FILTER_ALL;
  }, [campaignType, wikiMissionParam, missionIds]);

  function setWikiFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "wiki");
    params.set("wiki_filter", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function setWikiMissionFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "wiki");
    if (!value || value === MISSION_FILTER_ALL) params.delete("wiki_mission");
    else params.set("wiki_mission", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const byType = useMemo(() => {
    if (typeFilter === ALL_TYPES) return entities;
    return entities.filter((e) => e.type === typeFilter);
  }, [entities, typeFilter]);

  const byMission = useMemo(() => {
    if (campaignType !== "long") return byType;
    if (missionFilter === MISSION_FILTER_ALL) return byType;
    if (missionFilter === MISSION_FILTER_NONE)
      return byType.filter((e) => !e.linkedMissionId);
    return byType.filter((e) => e.linkedMissionId === missionFilter);
  }, [campaignType, missionFilter, byType]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byMission;
    return byMission.filter((e) => {
      if (e.name.toLowerCase().includes(q)) return true;
      if (e.description && e.description.toLowerCase().includes(q)) return true;
      if (e.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      if (e.missionTitle && e.missionTitle.toLowerCase().includes(q))
        return true;
      return false;
    });
  }, [byMission, searchQuery]);

  const sorted = useMemo(() => {
    return sortEntitiesForDisplay(filtered, typeFilter);
  }, [filtered, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entities) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return counts;
  }, [entities]);

  const [displayMode, setDisplayMode] = useState<"codex" | "board">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`wiki_display_mode_${campaignId}`);
      if (saved === "codex" || saved === "board") return saved;
      if (saved === "gallery") return "board";
    }
    return "codex";
  });

  const handleDisplayModeChange = (mode: "codex" | "board") => {
    setDisplayMode(mode);
    try {
      localStorage.setItem(`wiki_display_mode_${campaignId}`, mode);
    } catch {}
  };

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(() => {
    return entities.length > 0 ? entities[0].id : null;
  });

  const [mobilePane, setMobilePane] = useState<"index" | "reader">("index");

  useEffect(() => {
    if (sorted.length > 0) {
      if (!selectedEntityId || !sorted.some((e) => e.id === selectedEntityId)) {
        setSelectedEntityId(sorted[0].id);
      }
    } else {
      setSelectedEntityId(null);
    }
  }, [sorted, selectedEntityId]);

  const selectedEntity = useMemo(() => {
    return sorted.find((e) => e.id === selectedEntityId) ?? sorted[0] ?? null;
  }, [sorted, selectedEntityId]);

  if (!entities.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-brass-base/30 bg-[#120d09]/80 p-10 text-center shadow-xl">
        <BookOpen className="mx-auto h-12 w-12 text-brass-base/50" />
        <p className="mt-3 font-serif text-sm text-parchment-300">
          {emptyMessage ??
            "Nessuna voce nel wiki. Crea la prima entità per iniziare a forgiare la lore."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {/* =========================================================================
          TESTATA MASTER: TITOLO, STATISTICHE & SWITCHER MODALITÀ
          ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brass-base/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-brass-base/50 bg-gradient-to-br from-amber-600/30 to-amber-950/80 shadow-[0_0_10px_rgba(217,119,6,0.3)]">
            <BookOpen className="h-4 w-4 text-brass-light" />
          </div>
          <div>
            <h2 className="font-cinzel text-base sm:text-lg font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-brass-light via-amber-200 to-amber-400">
              Archivi & Grimorio di Gilda
            </h2>
            <p className="text-[11px] font-serif text-parchment-400">
              {sorted.length} {sorted.length === 1 ? "voce catalogata" : "voci catalogate"}
              {searchQuery ? ` per "${searchQuery}"` : ""}
            </p>
          </div>
        </div>

        {/* Toggle Modalità: [ Tomo & Codex ] | [ Bacheca a Colonne ] */}
        <div className="inline-flex items-center rounded-lg border border-brass-base/30 bg-[#0e0906] p-0.5 shadow-inner">
          <button
            type="button"
            onClick={() => handleDisplayModeChange("codex")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-cinzel font-semibold transition-all",
              displayMode === "codex"
                ? "bg-gradient-to-r from-amber-700/90 to-amber-800/90 text-parchment-100 shadow-sm border border-brass-light/40"
                : "text-parchment-400 hover:text-parchment-100 hover:bg-brass-base/10"
            )}
            title="Vista Manoscritto a doppio pannello"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-300" />
            <span>Tomo & Codex</span>
          </button>
          <button
            type="button"
            onClick={() => handleDisplayModeChange("board")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-cinzel font-semibold transition-all",
              displayMode === "board"
                ? "bg-gradient-to-r from-amber-700/90 to-amber-800/90 text-parchment-100 shadow-sm border border-brass-light/40"
                : "text-parchment-400 hover:text-parchment-100 hover:bg-brass-base/10"
            )}
            title="Vista Bacheca a colonne per tipo e missione"
          >
            <Columns3 className="h-3.5 w-3.5 text-amber-300" />
            <span>Bacheca a Colonne</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          CORPO PRINCIPALE: SPLIT-CODEX OPPURE BACHECA A COLONNE
          ========================================================================= */}
      {displayMode === "codex" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-14.5rem)] min-h-[580px]">
          {/* Indice Sinistro (4 colonne su desktop) */}
          <div
            className={cn(
              "h-full min-h-0 lg:col-span-4 xl:col-span-4",
              mobilePane === "reader" ? "hidden lg:block" : "block"
            )}
          >
            <WikiCodexIndex
              entities={sorted}
              selectedEntityId={selectedEntity?.id ?? null}
              onSelectEntity={(id) => {
                setSelectedEntityId(id);
                setMobilePane("reader");
              }}
              typeFilter={typeFilter}
              onTypeFilterChange={setWikiFilter}
              missionFilter={missionFilter}
              onMissionFilterChange={setWikiMissionFilter}
              missions={missions}
              campaignType={campaignType}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              typeLabels={typeLabels}
              typeCounts={typeCounts}
              totalCount={entities.length}
              isGmOrAdmin={isGmOrAdmin}
            />
          </div>

          {/* Lettore Tomo Destro (8 colonne su desktop) */}
          <div
            className={cn(
              "h-full min-h-0 lg:col-span-8 xl:col-span-8",
              mobilePane === "index" ? "hidden lg:block" : "block"
            )}
          >
            <WikiCodexReader
              entity={selectedEntity}
              campaignId={campaignId}
              isGmOrAdmin={isGmOrAdmin}
              onBackToIndex={() => setMobilePane("index")}
            />
          </div>
        </div>
      ) : (
        <WikiColumnBoard
          entities={sorted}
          missions={missions}
          campaignType={campaignType}
          missionFilter={missionFilter}
          onMissionFilterChange={setWikiMissionFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setWikiFilter}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          campaignId={campaignId}
          isGmOrAdmin={isGmOrAdmin}
          typeLabels={typeLabels}
          onOpenInCodex={(id) => {
            setSelectedEntityId(id);
            setDisplayMode("codex");
            setMobilePane("reader");
          }}
        />
      )}
    </div>
  );
}
