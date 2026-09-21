"use client";

import { useMemo, type ComponentType } from "react";
import {
  BookOpen,
  Lock,
  MapPin,
  Package,
  ScrollText,
  Search,
  Skull,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DualSourceImage } from "@/components/dual-source-image";
import type { WikiEntityListItem } from "./wiki-list-client";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  npc: Users,
  location: MapPin,
  monster: Skull,
  item: Package,
  lore: ScrollText,
};

type WikiCodexIndexProps = {
  entities: WikiEntityListItem[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  missionFilter: string;
  onMissionFilterChange: (mission: string) => void;
  missions: { id: string; title: string }[];
  campaignType?: "oneshot" | "quest" | "long" | null;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  typeLabels: Record<string, string>;
  typeCounts: Record<string, number>;
  totalCount: number;
  isGmOrAdmin: boolean;
};

export function WikiCodexIndex({
  entities,
  selectedEntityId,
  onSelectEntity,
  typeFilter,
  onTypeFilterChange,
  missionFilter,
  onMissionFilterChange,
  missions,
  campaignType,
  searchQuery,
  onSearchQueryChange,
  typeLabels,
  typeCounts,
  totalCount,
  isGmOrAdmin,
}: WikiCodexIndexProps) {
  const filterTabs = [
    { value: "all", label: "Tutti", icon: BookOpen, count: totalCount },
    { value: "npc", label: typeLabels.npc ?? "PNG", icon: Users, count: typeCounts.npc ?? 0 },
    { value: "location", label: typeLabels.location ?? "Luoghi", icon: MapPin, count: typeCounts.location ?? 0 },
    { value: "monster", label: typeLabels.monster ?? "Mostri", icon: Skull, count: typeCounts.monster ?? 0 },
    { value: "item", label: typeLabels.item ?? "Oggetti", icon: Package, count: typeCounts.item ?? 0 },
    { value: "lore", label: typeLabels.lore ?? "Cronache", icon: ScrollText, count: typeCounts.lore ?? 0 },
  ];

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-brass-base/30 bg-[#130d08]/95 shadow-xl">
      {/* Testata dell'Indice con Categorie Araldiche */}
      <div className="shrink-0 space-y-3 border-b border-brass-base/20 bg-gradient-to-r from-[#19100a] via-[#160e09] to-[#120a06] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-wider text-brass-light">
            <BookOpen className="h-3.5 w-3.5 text-brass-base" />
            <span>Indice del Tomo</span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-brass-base bg-guild-void/80 px-2 py-0.5 rounded-full border border-brass-base/25">
            {entities.length} {entities.length === 1 ? "voce" : "voci"}
          </span>
        </div>

        {/* Categorie a Nastro Rapido */}
        <div className="flex flex-wrap gap-1">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = typeFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onTypeFilterChange(tab.value)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-cinzel font-semibold transition-all",
                  isActive
                    ? "bg-gradient-to-r from-amber-700/90 to-amber-800/90 text-parchment-100 shadow-sm border border-brass-light/40"
                    : "border border-brass-base/20 bg-[#0e0906] text-parchment-400 hover:text-parchment-100 hover:border-brass-base/40"
                )}
              >
                <Icon className="h-2.5 w-2.5 text-amber-300" />
                <span>{tab.label}</span>
                <span className="font-mono text-[9px] opacity-75">({tab.count})</span>
              </button>
            );
          })}
        </div>

        {/* Barra di Ricerca Testuale */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brass-base/60" />
          <Input
            type="search"
            placeholder="Cerca nome, descrizione, tag..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="h-8 pl-8 pr-7 bg-guild-void/90 border-brass-base/30 text-xs font-serif text-parchment-100 placeholder:text-parchment-400/50 rounded-lg focus:border-brass-light focus:ring-brass-light/30 shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-parchment-400 hover:text-parchment-100"
              title="Azzera ricerca"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Filtro Missione (se campagna long o presenti missioni) */}
        {campaignType === "long" && missions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-cinzel text-brass-base shrink-0">Missione:</span>
            <select
              value={missionFilter}
              onChange={(e) => onMissionFilterChange(e.target.value)}
              className="h-7 flex-1 truncate rounded border border-brass-base/25 bg-guild-void px-2 text-[11px] font-serif text-parchment-200 focus:outline-none focus:border-brass-base"
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
      </div>

      {/* =========================================================================
          ELENCO DELLE VOCI (Scrollabile)
          ========================================================================= */}
      <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1">
        {entities.length === 0 ? (
          <div className="p-6 text-center text-xs font-serif italic text-parchment-500">
            Nessuna voce corrisponde ai criteri di ricerca.
          </div>
        ) : (
          entities.map((entity) => {
            const isSelected = selectedEntityId === entity.id;
            const TypeIcon = TYPE_ICONS[entity.type] ?? BookOpen;

            return (
              <button
                key={entity.id}
                type="button"
                onClick={() => onSelectEntity(entity.id)}
                className={cn(
                  "group relative w-full flex items-center gap-2.5 rounded-xl p-2 text-left transition-all",
                  isSelected
                    ? "border border-amber-500/70 bg-gradient-to-r from-amber-950/70 via-amber-900/40 to-[#1e140d] text-parchment-100 shadow-md"
                    : "border border-brass-base/15 bg-[#140e08]/60 hover:border-brass-base/40 hover:bg-[#1a120b] text-parchment-300"
                )}
              >
                {/* Mini-Avatar con anello in ottone */}
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-brass-base/40 bg-guild-void shadow-inner">
                  {entity.imageUrl ? (
                    <DualSourceImage
                      driveUrl={entity.imageUrl}
                      telegramFallbackId={entity.telegramFallbackId ?? null}
                      alt={entity.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-guild-stone text-brass-base">
                      <TypeIcon className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Info Testuali */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "truncate font-cinzel text-xs font-bold transition-colors",
                        isSelected ? "text-gold-relief" : "text-parchment-100 group-hover:text-amber-200"
                      )}
                      title={entity.name}
                    >
                      {entity.name}
                    </span>
                    {isGmOrAdmin && (entity.isSecret || entity.visibility === "secret") && (
                      <span title="Riservato al Master" className="shrink-0">
                        <Lock className="h-2.5 w-2.5 text-amber-400/90" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-parchment-400 mt-0.5">
                    <span className="truncate max-w-[130px] font-serif text-[9px] text-parchment-500">
                      {entity.missionTitle ? `📜 ${entity.missionTitle}` : typeLabels[entity.type] ?? entity.type}
                    </span>
                    {entity.tags && entity.tags.length > 0 && (
                      <span className="font-mono text-[8px] text-brass-base/80 truncate max-w-[60px]">
                        #{entity.tags[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Indicatore Visivo di selezione sul lato destro */}
                {isSelected && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-l bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
