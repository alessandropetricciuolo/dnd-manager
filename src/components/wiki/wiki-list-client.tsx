"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, BookOpen, ChevronDown, Pencil, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { WikiEntityDeleteButton } from "./wiki-entity-delete-button";
import { WIKI_ENTITY_TYPES, WIKI_FILTER_LABELS_IT } from "@/lib/wiki/entity-types";

export type WikiEntityListItem = {
  id: string;
  name: string;
  type: string;
  isSecret: boolean;
  /** public | secret | selective - per mostrare il lucchetto (solo GM/Admin) */
  visibility?: string;
  /** Etichetta target visibilità selettiva (solo GM/Admin). */
  selectiveAudienceLabel?: string | null;
  sortOrder: number | null;
  tags?: string[];
  /** Breve testo per ricerca (body della voce) */
  description?: string;
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
  /** Messaggio quando non ci sono entità (es. player senza contenuti sbloccati). */
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sortEntitiesForDisplay(
  items: WikiEntityListItem[],
  typeFilter: WikiFilterValue
): WikiEntityListItem[] {
  if (typeFilter === "lore") {
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

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const wikiFilterParam = searchParams.get("wiki_filter");
  const typeFilter: WikiFilterValue =
    wikiFilterParam && isWikiFilterValue(wikiFilterParam) ? wikiFilterParam : ALL_TYPES;

  const wikiMissionParam = searchParams.get("wiki_mission");
  const missionIds = useMemo(() => new Set(missions.map((m) => m.id)), [missions]);
  const missionFilter: string = useMemo(() => {
    if (campaignType !== "long") return MISSION_FILTER_ALL;
    if (!wikiMissionParam || wikiMissionParam === MISSION_FILTER_ALL) return MISSION_FILTER_ALL;
    if (wikiMissionParam === MISSION_FILTER_NONE) return MISSION_FILTER_NONE;
    if (isUuidLike(wikiMissionParam) && missionIds.has(wikiMissionParam)) return wikiMissionParam;
    return MISSION_FILTER_ALL;
  }, [campaignType, wikiMissionParam, missionIds]);

  const currentFilterLabel = WIKI_FILTER_LABELS_IT[typeFilter] ?? typeFilter;

  const missionFilterLabel = useMemo(() => {
    if (campaignType !== "long") return "";
    if (missionFilter === MISSION_FILTER_ALL) return "Tutte le missioni";
    if (missionFilter === MISSION_FILTER_NONE) return "Senza missione";
    return missions.find((m) => m.id === missionFilter)?.title ?? "Missione";
  }, [campaignType, missionFilter, missions]);

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

  const byType =
    typeFilter === ALL_TYPES ? entities : entities.filter((e) => e.type === typeFilter);

  const byMission = useMemo(() => {
    if (campaignType !== "long") return byType;
    if (missionFilter === MISSION_FILTER_ALL) return byType;
    if (missionFilter === MISSION_FILTER_NONE) return byType.filter((e) => !e.linkedMissionId);
    return byType.filter((e) => e.linkedMissionId === missionFilter);
  }, [campaignType, missionFilter, byType]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byMission;
    return byMission.filter((e) => {
      if (e.name.toLowerCase().includes(q)) return true;
      if (e.description && e.description.toLowerCase().includes(q)) return true;
      if (e.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      if (e.missionTitle && e.missionTitle.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [byMission, searchQuery]);

  const sorted = sortEntitiesForDisplay(filtered, typeFilter);

  const groupedSections = useMemo(() => {
    if (campaignType !== "long" || missionFilter !== MISSION_FILTER_ALL || sorted.length === 0) {
      return null;
    }
    const general: WikiEntityListItem[] = [];
    const byMissionId = new Map<string, WikiEntityListItem[]>();
    for (const e of sorted) {
      if (!e.linkedMissionId) {
        general.push(e);
        continue;
      }
      const list = byMissionId.get(e.linkedMissionId) ?? [];
      list.push(e);
      byMissionId.set(e.linkedMissionId, list);
    }
    const missionKeys = [...byMissionId.keys()].sort((a, b) => {
      const ta = missions.find((m) => m.id === a)?.title ?? "";
      const tb = missions.find((m) => m.id === b)?.title ?? "";
      return ta.localeCompare(tb, "it");
    });
    const sections: { key: string; label: string; count: number; items: WikiEntityListItem[] }[] = [];
    if (general.length > 0) {
      sections.push({
        key: "__general",
        label: "Generale / non assegnata",
        count: general.length,
        items: general,
      });
    }
    for (const mid of missionKeys) {
      const items = byMissionId.get(mid) ?? [];
      if (items.length === 0) continue;
      sections.push({
        key: mid,
        label: missions.find((m) => m.id === mid)?.title ?? "Missione",
        count: items.length,
        items,
      });
    }
    return sections.length > 0 ? sections : null;
  }, [campaignType, missionFilter, sorted, missions]);

  const badgeVariant = (
    type: string
  ): "npc" | "location" | "monster" | "item" | "lore" | "secondary" =>
    type in typeLabels ? (type as "npc" | "location" | "monster" | "item" | "lore") : "secondary";

  const showLock = (entity: WikiEntityListItem) =>
    isGmOrAdmin && (entity.visibility === "secret" || entity.visibility === "selective");

  function renderEntityRow(entity: WikiEntityListItem) {
    const displayName =
      typeFilter === "lore" && entity.sortOrder != null && entity.sortOrder > 0
        ? `Capitolo ${entity.sortOrder}: ${entity.name}`
        : entity.name;
    const entityUrl = `/campaigns/${campaignId}/wiki/${entity.id}`;
    const editUrl = `${entityUrl}?edit=1`;
    const showMissionBadge =
      campaignType === "long" && !!entity.linkedMissionId && !!entity.missionTitle && missionFilter !== MISSION_FILTER_ALL;
    const tagList = (entity.tags ?? []).map((t) => t.trim()).filter(Boolean);

    if (isGmOrAdmin) {
      return (
        <li
          key={entity.id}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-barber-gold/15 px-2 py-1.5 transition-colors last:border-b-0 hover:bg-barber-gold/[0.06] sm:px-3 min-w-0 text-sm"
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <Link
              href={entityUrl}
              className="block font-medium leading-tight text-barber-paper hover:text-barber-gold hover:underline truncate"
            >
              {displayName}
            </Link>
            {tagList.length > 0 ? (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {tagList.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="h-5 shrink-0 border-barber-gold/25 px-1.5 py-0 text-[10px] font-normal leading-none text-barber-paper/75"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            {campaignType === "long" && entity.missionTitle && missionFilter === MISSION_FILTER_ALL && (
              <p className="truncate text-[11px] leading-tight text-barber-paper/45">Missione: {entity.missionTitle}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5 shrink-0">
            {showMissionBadge && (
              <span className="hidden max-w-[9rem] truncate rounded border border-barber-gold/25 bg-barber-dark px-1.5 py-0.5 text-[10px] text-barber-gold/85 sm:inline-block">
                {entity.missionTitle}
              </span>
            )}
            <Badge variant={badgeVariant(entity.type)} className="h-5 shrink-0 px-1.5 text-[10px] font-medium leading-none">
              {typeLabels[entity.type] ?? entity.type}
            </Badge>
            {showLock(entity) && (
              <Lock className="h-3.5 w-3.5 shrink-0 text-barber-gold/90" aria-label="Solo GM / visibilità limitata" />
            )}
            {entity.visibility === "selective" && entity.selectiveAudienceLabel && (
              <span className="max-w-[8rem] truncate rounded border border-barber-gold/30 bg-barber-gold/10 px-1.5 py-0.5 text-[10px] leading-tight text-barber-gold/90">
                {entity.selectiveAudienceLabel}
              </span>
            )}
            <span className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 border-barber-gold/40 px-2 text-xs text-barber-paper/80 hover:bg-barber-gold/10 hover:text-barber-gold"
                asChild
              >
                <Link href={editUrl}>
                  <Pencil className="mr-1 h-3.5 w-3.5 shrink-0" />
                  Modifica
                </Link>
              </Button>
              <WikiEntityDeleteButton compact campaignId={campaignId} entityId={entity.id} entityName={entity.name} />
            </span>
          </div>
        </li>
      );
    }

    return (
      <li
        key={entity.id}
        className="flex flex-wrap items-center gap-2 border-b border-barber-gold/15 px-4 py-3 transition-colors last:border-b-0 hover:bg-barber-gold/[0.06] sm:gap-3 min-w-0"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <Link
            href={entityUrl}
            className="block font-medium text-barber-paper hover:text-barber-gold hover:underline truncate"
          >
            {displayName}
          </Link>
          {campaignType === "long" && entity.missionTitle && missionFilter === MISSION_FILTER_ALL && (
            <p className="truncate text-xs text-barber-paper/55">Missione: {entity.missionTitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {showMissionBadge && (
            <span className="hidden max-w-[10rem] truncate rounded-md border border-barber-gold/25 bg-barber-dark px-2 py-0.5 text-[11px] text-barber-gold/85 sm:inline-block">
              {entity.missionTitle}
            </span>
          )}
          <Badge variant={badgeVariant(entity.type)} className="shrink-0">
            {typeLabels[entity.type] ?? entity.type}
          </Badge>
          {showLock(entity) && (
            <Lock className="h-4 w-4 shrink-0 text-barber-gold/90" aria-label="Solo GM / visibilità limitata" />
          )}
        </div>
      </li>
    );
  }

  if (!entities.length) {
    return (
      <div className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 px-6 py-10 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-barber-paper/50" />
        <p className="mt-3 text-barber-paper/70">
          {emptyMessage ?? "Nessuna voce nel wiki. Crea la prima entità per iniziare."}
        </p>
      </div>
    );
  }

  const filterOptions = [
    { value: ALL_TYPES, label: WIKI_FILTER_LABELS_IT[ALL_TYPES] },
    ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
  ];

  const showMissionUi = campaignType === "long";

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-barber-paper/50" />
          <Input
            type="search"
            placeholder="Cerca nome, descrizione, tag o missione…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
          />
        </div>
        {showMissionUi && (
          <div className="flex shrink-0 flex-col gap-1 lg:w-64">
            <label htmlFor="wiki-mission-filter" className="text-xs font-medium text-barber-paper/55">
              Missione (Long)
            </label>
            <select
              id="wiki-mission-filter"
              value={missionFilter}
              onChange={(e) => setWikiMissionFilter(e.target.value)}
              className="h-10 w-full rounded-md border border-barber-gold/35 bg-barber-dark px-3 text-sm text-barber-paper focus:outline-none focus:ring-2 focus:ring-barber-gold/40"
            >
              <option value={MISSION_FILTER_ALL}>Tutte (raggruppate)</option>
              <option value={MISSION_FILTER_NONE}>Senza missione</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Tabs value={typeFilter} onValueChange={setWikiFilter}>
        <div className="md:hidden w-full min-w-0">
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between rounded-xl border-barber-gold/40 bg-barber-dark/90 py-6 text-left text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold"
              >
                <span className="font-medium">
                  Filtro tipo: {currentFilterLabel}
                  {showMissionUi && missionFilter !== MISSION_FILTER_ALL ? (
                    <span className="mt-1 block text-xs font-normal text-barber-paper/60">{missionFilterLabel}</span>
                  ) : null}
                </span>
                <ChevronDown className="h-5 w-5 shrink-0 opacity-70" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl border-t border-barber-gold/20 bg-barber-dark pb-8 pt-4 max-h-[min(70vh,480px)] overflow-y-auto"
            >
              <p className="mb-4 px-1 text-sm font-medium text-barber-paper/70">Tipologia voce wiki</p>
              <nav className="flex flex-col gap-1">
                {filterOptions.map(({ value, label }) => {
                  const isActive = typeFilter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setWikiFilter(value);
                        setFilterSheetOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold",
                        isActive && "bg-barber-gold/20 text-barber-gold"
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </nav>
              {showMissionUi && missions.length > 0 && (
                <>
                  <p className="mb-2 mt-6 px-1 text-sm font-medium text-barber-paper/70">Missione</p>
                  <div className="flex flex-col gap-1">
                    {[
                      { id: MISSION_FILTER_ALL, title: "Tutte (raggruppate)" },
                      { id: MISSION_FILTER_NONE, title: "Senza missione" },
                      ...missions,
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setWikiMissionFilter(m.id);
                          setFilterSheetOpen(false);
                        }}
                        className={cn(
                          "rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold",
                          missionFilter === m.id && "bg-barber-gold/20 text-barber-gold"
                        )}
                      >
                        {m.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>

        <TabsList className="hidden md:flex w-full min-w-0 max-w-full flex-wrap justify-start gap-1 rounded-xl border border-barber-gold/40 bg-barber-dark/90 p-1">
          <TabsTrigger
            value={ALL_TYPES}
            className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
          >
            Tutti
          </TabsTrigger>
          {Object.entries(typeLabels).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-barber-gold/35 bg-barber-dark/50 px-6 py-10 text-center text-sm text-barber-paper/65">
          Nessuna voce con questi filtri. Prova a cambiare missione o tipo.
        </div>
      ) : groupedSections ? (
        <div className={cn("space-y-6", isGmOrAdmin && "space-y-4")}>
          {groupedSections.map((section) => (
            <section
              key={section.key}
              className="overflow-hidden rounded-xl border border-barber-gold/35 bg-barber-dark/85 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.08)]"
            >
              <div
                className={cn(
                  "sticky top-0 z-[1] flex flex-wrap items-baseline justify-between gap-2 border-b border-barber-gold/25 bg-barber-dark/95 px-4 py-3 backdrop-blur-sm",
                  isGmOrAdmin && "py-2 px-3"
                )}
              >
                <h3
                  className={cn(
                    "font-semibold uppercase tracking-wide text-barber-gold",
                    isGmOrAdmin ? "text-xs" : "text-sm"
                  )}
                >
                  {section.label}
                </h3>
                <span className={cn("text-barber-paper/50", isGmOrAdmin ? "text-[10px]" : "text-xs")}>
                  {section.count} voci
                </span>
              </div>
              <ul className="divide-y divide-barber-gold/10">{section.items.map((e) => renderEntityRow(e))}</ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-barber-gold/40 bg-barber-dark/90 shadow-inner">
          <ul>{sorted.map((entity) => renderEntityRow(entity))}</ul>
        </div>
      )}
    </div>
  );
}
