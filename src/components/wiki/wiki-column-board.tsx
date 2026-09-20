"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Lock,
  MapPin,
  Package,
  Pencil,
  ScrollText,
  Search,
  Skull,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DualSourceImage } from "@/components/dual-source-image";
import { WikiEntityDeleteButton } from "./wiki-entity-delete-button";
import type { WikiEntityListItem } from "./wiki-list-client";
import { cn } from "@/lib/utils";

const TYPE_CONFIG: Record<
  string,
  {
    icon: ComponentType<{ className?: string }>;
    headerBg: string;
    border: string;
    titleColor: string;
    badgeBg: string;
    iconColor: string;
  }
> = {
  npc: {
    icon: Users,
    headerBg: "bg-gradient-to-r from-amber-950/90 via-[#26180d] to-[#180f08]",
    border: "border-amber-600/40",
    titleColor: "text-amber-200",
    badgeBg: "bg-amber-950/90 border-amber-600/50 text-amber-200",
    iconColor: "text-amber-400",
  },
  location: {
    icon: MapPin,
    headerBg: "bg-gradient-to-r from-emerald-950/90 via-[#0d2218] to-[#08150f]",
    border: "border-emerald-600/40",
    titleColor: "text-emerald-200",
    badgeBg: "bg-emerald-950/90 border-emerald-600/50 text-emerald-200",
    iconColor: "text-emerald-400",
  },
  monster: {
    icon: Skull,
    headerBg: "bg-gradient-to-r from-red-950/90 via-[#2a0e11] to-[#160709]",
    border: "border-red-600/40",
    titleColor: "text-red-200",
    badgeBg: "bg-red-950/90 border-red-600/50 text-red-200",
    iconColor: "text-red-400",
  },
  item: {
    icon: Package,
    headerBg: "bg-gradient-to-r from-yellow-950/90 via-[#221608] to-[#140c04]",
    border: "border-yellow-600/40",
    titleColor: "text-yellow-200",
    badgeBg: "bg-yellow-950/90 border-yellow-600/50 text-yellow-200",
    iconColor: "text-yellow-400",
  },
  lore: {
    icon: ScrollText,
    headerBg: "bg-gradient-to-r from-purple-950/90 via-[#1f1026] to-[#100714]",
    border: "border-purple-600/40",
    titleColor: "text-purple-200",
    badgeBg: "bg-purple-950/90 border-purple-600/50 text-purple-200",
    iconColor: "text-purple-400",
  },
};

const ORDERED_TYPES = ["npc", "location", "monster", "item", "lore"] as const;

type WikiColumnBoardProps = {
  entities: WikiEntityListItem[];
  missions: { id: string; title: string }[];
  campaignType?: "oneshot" | "quest" | "long" | null;
  missionFilter: string;
  onMissionFilterChange: (m: string) => void;
  typeFilter: string;
  onTypeFilterChange: (t: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  campaignId: string;
  isGmOrAdmin: boolean;
  typeLabels: Record<string, string>;
  onOpenInCodex: (entityId: string) => void;
};

export function WikiColumnBoard({
  entities,
  missions,
  campaignType,
  missionFilter,
  onMissionFilterChange,
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchQueryChange,
  campaignId,
  isGmOrAdmin,
  typeLabels,
  onOpenInCodex,
}: WikiColumnBoardProps) {
  // Traccia sezioni missione aperte o chiuse (default tutte aperte)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Raggruppamento per missione
  const missionSections = useMemo(() => {
    if (entities.length === 0) return [];

    if (campaignType !== "long") {
      return [
        {
          key: "__all",
          label: "Archivio di Gilda",
          count: entities.length,
          items: entities,
        },
      ];
    }

    const general: WikiEntityListItem[] = [];
    const byMissionId = new Map<string, WikiEntityListItem[]>();

    for (const e of entities) {
      if (!e.linkedMissionId) {
        general.push(e);
      } else {
        const list = byMissionId.get(e.linkedMissionId) ?? [];
        list.push(e);
        byMissionId.set(e.linkedMissionId, list);
      }
    }

    const sections: {
      key: string;
      label: string;
      count: number;
      items: WikiEntityListItem[];
    }[] = [];

    // Se c'è un filtro missione attivo, mostra solo quella sezione
    if (missionFilter !== "all") {
      if (missionFilter === "none") {
        if (general.length > 0) {
          sections.push({
            key: "__general",
            label: "Generale / Non Assegnata",
            count: general.length,
            items: general,
          });
        }
      } else {
        const items = byMissionId.get(missionFilter) ?? [];
        const mTitle = missions.find((m) => m.id === missionFilter)?.title ?? "Missione";
        if (items.length > 0) {
          sections.push({
            key: missionFilter,
            label: mTitle,
            count: items.length,
            items,
          });
        }
      }
      return sections;
    }

    // Altrimenti tutte le missioni raggruppate
    if (general.length > 0) {
      sections.push({
        key: "__general",
        label: "Generale / Non Assegnata",
        count: general.length,
        items: general,
      });
    }

    const sortedMissionIds = [...byMissionId.keys()].sort((a, b) => {
      const ta = missions.find((m) => m.id === a)?.title ?? "";
      const tb = missions.find((m) => m.id === b)?.title ?? "";
      return ta.localeCompare(tb, "it");
    });

    for (const mid of sortedMissionIds) {
      const items = byMissionId.get(mid) ?? [];
      if (items.length === 0) continue;
      const mTitle = missions.find((m) => m.id === mid)?.title ?? "Missione";
      sections.push({
        key: mid,
        label: mTitle,
        count: items.length,
        items,
      });
    }

    return sections;
  }, [entities, campaignType, missionFilter, missions]);

  // Render di un'entità all'interno di una colonna
  function renderColumnItem(entity: WikiEntityListItem) {
    const entityUrl = `/campaigns/${campaignId}/wiki/${entity.id}`;
    const editUrl = `${entityUrl}?edit=1`;
    const attrs = (entity.attributes ?? {}) as Record<string, unknown>;
    const combat = (attrs.combat_stats ?? {}) as Record<string, unknown>;

    // Dettaglio veloce in base al tipo
    let quickDetail = "";
    if (entity.type === "npc") {
      const r = typeof attrs.race === "string" ? attrs.race.trim() : "";
      const c = typeof attrs.class === "string" ? attrs.class.trim() : "";
      quickDetail = [r, c].filter(Boolean).join(" • ");
    } else if (entity.type === "monster") {
      const cr = combat.cr || attrs.cr;
      const ac = combat.ac || attrs.ac;
      if (cr) quickDetail = `GS ${cr}${ac ? ` • CA ${ac}` : ""}`;
    } else if (entity.type === "lore" && entity.sortOrder) {
      quickDetail = `Cap. ${entity.sortOrder}`;
    }

    return (
      <div
        key={entity.id}
        className="group relative flex items-center justify-between gap-2 rounded-lg border border-brass-base/15 bg-[#120c08]/80 px-2.5 py-1.5 transition-all hover:border-amber-500/50 hover:bg-[#1c120a] hover:shadow-sm"
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* Mini-medaglione avatar */}
          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-brass-base/40 bg-guild-void shadow-inner">
            {entity.imageUrl ? (
              <DualSourceImage
                driveUrl={entity.imageUrl}
                telegramFallbackId={entity.telegramFallbackId ?? null}
                alt={entity.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-guild-stone text-[9px] font-cinzel text-brass-light">
                {entity.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpenInCodex(entity.id)}
              className="block truncate text-left font-cinzel text-xs font-bold text-parchment-100 group-hover:text-gold-relief transition-colors"
              title={entity.name}
            >
              {entity.name}
            </button>
            {quickDetail && (
              <span className="block truncate font-serif text-[10px] text-parchment-400/70">
                {quickDetail}
              </span>
            )}
          </div>
        </div>

        {/* Badge lucchetto se segreto */}
        {isGmOrAdmin && (entity.isSecret || entity.visibility === "secret") && (
          <span title="Riservato al Master" className="shrink-0 text-amber-400/80">
            <Lock className="h-3 w-3" />
          </span>
        )}

        {/* Overlay Azioni Rapide al passaggio del mouse */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded-md border border-brass-base/30 bg-[#0e0805]/95 px-1 py-0.5 shadow-md group-hover:flex">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-parchment-300 hover:text-amber-300"
            onClick={() => onOpenInCodex(entity.id)}
            title="Apri nel Tomo"
          >
            <BookOpen className="h-3 w-3" />
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-parchment-300 hover:text-amber-300"
          >
            <Link href={editUrl} title="Modifica">
              <Pencil className="h-3 w-3" />
            </Link>
          </Button>
          {isGmOrAdmin && (
            <WikiEntityDeleteButton
              compact
              campaignId={campaignId}
              entityId={entity.id}
              entityName={entity.name}
            />
          )}
        </div>
      </div>
    );
  }

  // Render di una singola colonna per tipo
  function renderTypeColumn(type: string, items: WikiEntityListItem[]) {
    const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.lore;
    const Icon = config.icon;
    const label = typeLabels[type] ?? type;

    return (
      <div
        key={type}
        className={cn(
          "flex min-h-[140px] flex-col overflow-hidden rounded-xl border-2 shadow-lg bg-[#140e08]/90",
          config.border
        )}
      >
        {/* Testata della colonna con gradiente nobiliare */}
        <header
          className={cn(
            "flex shrink-0 items-center justify-between border-b border-brass-base/25 px-3 py-2 shadow-sm",
            config.headerBg
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon className={cn("h-3.5 w-3.5 shrink-0", config.iconColor)} />
            <h4 className={cn("truncate font-cinzel text-xs font-bold uppercase tracking-wider", config.titleColor)}>
              {label}
            </h4>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold shadow-inner",
              config.badgeBg
            )}
          >
            {items.length}
          </span>
        </header>

        {/* Lista degli elementi scrollabile */}
        <div className="scrollbar-barber-y max-h-[360px] flex-1 overflow-y-auto p-2 space-y-1.5">
          {items.length === 0 ? (
            <div className="p-4 text-center text-[11px] font-serif italic text-parchment-500">
              Nessuna voce
            </div>
          ) : (
            items.map((e) => renderColumnItem(e))
          )}
        </div>
      </div>
    );
  }

  // Determina quali tipi di colonne mostrare (tutti o solo quello filtrato)
  const visibleTypes = typeFilter === "all" ? ORDERED_TYPES : [typeFilter as (typeof ORDERED_TYPES)[number]];

  return (
    <div className="space-y-6">
      {/* =========================================================================
          BARRA DI RICERCA & FILTRI RAPIDI
          ========================================================================= */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border-2 border-brass-base/30 bg-[#150e09]/95 p-3.5 shadow-md">
        {/* Ricerca Testuale */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brass-base/60" />
          <Input
            type="search"
            placeholder="Cerca nome, descrizione, tag..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="h-8 pl-8 pr-7 bg-guild-void/90 border-brass-base/30 text-xs font-serif text-parchment-100 placeholder:text-parchment-400/50 rounded-lg focus:border-brass-light"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-parchment-400 hover:text-parchment-100"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filtro Missione (se applicabile) */}
        {campaignType === "long" && missions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-cinzel text-brass-base shrink-0">Missione:</span>
            <select
              value={missionFilter}
              onChange={(e) => onMissionFilterChange(e.target.value)}
              className="h-8 rounded-lg border border-brass-base/30 bg-guild-void px-2.5 text-xs font-serif text-parchment-100 focus:outline-none focus:border-brass-light"
            >
              <option value="all">Tutte le missioni</option>
              <option value="none">Voci Generali (Senza missione)</option>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tasti Filtro Tipo */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { value: "all", label: "Tutte le Colonne" },
            { value: "npc", label: typeLabels.npc ?? "PNG" },
            { value: "location", label: typeLabels.location ?? "Luoghi" },
            { value: "monster", label: typeLabels.monster ?? "Mostri" },
            { value: "item", label: typeLabels.item ?? "Oggetti" },
            { value: "lore", label: typeLabels.lore ?? "Cronache" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onTypeFilterChange(tab.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-cinzel font-semibold transition-all",
                typeFilter === tab.value
                  ? "bg-gradient-to-r from-amber-700/90 to-amber-800/90 text-parchment-100 shadow-sm border border-brass-light/40"
                  : "border border-brass-base/20 bg-[#0e0906] text-parchment-400 hover:text-parchment-100 hover:border-brass-base/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================================================
          SEZIONI MISSIONE & BACHECHE A COLONNE
          ========================================================================= */}
      {missionSections.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-brass-base/30 bg-[#120d09]/80 p-12 text-center text-parchment-400 font-serif">
          Nessuna voce trovata con i filtri selezionati.
        </div>
      ) : (
        missionSections.map((section) => {
          const isCollapsed = collapsedSections[section.key] ?? false;

          return (
            <section
              key={section.key}
              className="card-guild-stone relative overflow-hidden rounded-2xl border-2 border-brass-base/40 bg-[#140e08]/95 p-4 sm:p-5 shadow-2xl"
            >
              <div className="corner-ornament-tl" />
              <div className="corner-ornament-tr" />
              <div className="corner-ornament-bl" />
              <div className="corner-ornament-br" />

              {/* Testata della Sezione Missione (Cliccabile per Espandere/Comprimere) */}
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="w-full flex flex-wrap items-center justify-between gap-2 border-b border-brass-base/20 pb-3 text-left hover:brightness-110 transition-all"
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-brass-base" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-brass-base" />
                  )}
                  <h3 className="font-cinzel text-base sm:text-lg font-bold text-gold-relief tracking-wide">
                    ✦ {section.label}
                  </h3>
                </div>
                <span className="font-mono text-xs font-semibold text-brass-light bg-guild-void/90 px-2.5 py-0.5 rounded-full border border-brass-base/25">
                  {section.count} {section.count === 1 ? "voce archiviata" : "voci archiviate"}
                </span>
              </button>

              {/* Griglia a 5 Colonne per i diversi Tipi di Entità */}
              {!isCollapsed && (
                <div
                  className={cn(
                    "mt-4 grid gap-3.5",
                    visibleTypes.length === 1
                      ? "grid-cols-1"
                      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                  )}
                >
                  {visibleTypes.map((type) => {
                    const itemsForType = section.items.filter((e) => e.type === type);
                    return renderTypeColumn(type, itemsForType);
                  })}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
