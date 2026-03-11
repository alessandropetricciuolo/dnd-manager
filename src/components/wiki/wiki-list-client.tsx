"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, BookOpen, ChevronDown, Pencil, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { WikiEntityDeleteButton } from "./wiki-entity-delete-button";

export type WikiEntityListItem = {
  id: string;
  name: string;
  type: string;
  isSecret: boolean;
  /** public | secret | selective - per mostrare il lucchetto (solo GM/Admin) */
  visibility?: string;
  sortOrder: number | null;
  tags?: string[];
  /** Breve testo per ricerca (body della voce) */
  description?: string;
};

type WikiListClientProps = {
  campaignId: string;
  entities: WikiEntityListItem[];
  isGmOrAdmin: boolean;
  typeLabels: Record<string, string>;
  /** Messaggio quando non ci sono entità (es. player senza contenuti sbloccati). */
  emptyMessage?: string;
};

const ALL_TYPES = "all";
const WIKI_FILTER_VALUES = ["all", "npc", "location", "monster", "item", "lore"] as const;

const FILTER_LABELS: Record<string, string> = {
  all: "Tutti",
  npc: "NPC",
  location: "Luogo",
  monster: "Mostro",
  item: "Oggetto",
  lore: "Lore",
};

export function WikiListClient({
  campaignId,
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
  const typeFilter =
    wikiFilterParam && WIKI_FILTER_VALUES.includes(wikiFilterParam as (typeof WIKI_FILTER_VALUES)[number])
      ? wikiFilterParam
      : ALL_TYPES;

  const currentFilterLabel = FILTER_LABELS[typeFilter] ?? typeFilter;

  function setWikiFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "wiki");
    params.set("wiki_filter", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const byType =
    typeFilter === ALL_TYPES
      ? entities
      : entities.filter((e) => e.type === typeFilter);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return byType;
    return byType.filter((e) => {
      if (e.name.toLowerCase().includes(q)) return true;
      if (e.description && e.description.toLowerCase().includes(q)) return true;
      if (e.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [byType, searchQuery]);

  const sorted =
    typeFilter === "lore"
      ? [...filtered].sort((a, b) => {
          const na = a.sortOrder ?? 9999;
          const nb = b.sortOrder ?? 9999;
          return na - nb;
        })
      : filtered;

  const badgeVariant = (
    type: string
  ): "npc" | "location" | "monster" | "item" | "lore" | "secondary" =>
    type in typeLabels ? (type as "npc" | "location" | "monster" | "item" | "lore") : "secondary";

  /** Lucchetto: visibile solo per GM quando la voce è segreta o selettiva (non pubblica). */
  const showLock = (entity: WikiEntityListItem) =>
    isGmOrAdmin && (entity.visibility === "secret" || entity.visibility === "selective");

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
    { value: ALL_TYPES, label: FILTER_LABELS[ALL_TYPES] },
    ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-barber-paper/50" />
        <Input
          type="search"
          placeholder="Cerca per nome, descrizione o tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
        />
      </div>
      <Tabs value={typeFilter} onValueChange={setWikiFilter}>
        {/* Mobile: menu a tendina per il filtro (evita overflow e voci sotto le altre) */}
        <div className="md:hidden w-full min-w-0">
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between rounded-xl border-barber-gold/40 bg-barber-dark/90 py-6 text-left text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold"
              >
                <span className="font-medium">Filtro: {currentFilterLabel}</span>
                <ChevronDown className="h-5 w-5 shrink-0 opacity-70" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl border-t border-barber-gold/20 bg-barber-dark pb-8 pt-4"
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
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: tab orizzontali */}
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
      <ul className="mt-4 divide-y divide-barber-gold/20 rounded-xl border border-barber-gold/40 bg-barber-dark/90 overflow-hidden">
        {sorted.map((entity) => {
          const displayName =
            typeFilter === "lore" && entity.sortOrder != null && entity.sortOrder > 0
              ? `Capitolo ${entity.sortOrder}: ${entity.name}`
              : entity.name;
          const entityUrl = `/campaigns/${campaignId}/wiki/${entity.id}`;
          return (
            <li
              key={entity.id}
              className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-barber-gold/5 transition-colors min-w-0"
            >
              <Link
                href={entityUrl}
                className="min-w-0 flex-1 font-medium text-barber-paper hover:text-barber-gold hover:underline truncate"
              >
                {displayName}
              </Link>
              <Badge variant={badgeVariant(entity.type)} className="shrink-0">
                {typeLabels[entity.type] ?? entity.type}
              </Badge>
              {showLock(entity) && (
                <Lock
                  className="h-4 w-4 shrink-0 text-barber-gold/90"
                  aria-label="Solo GM / visibilità limitata"
                />
              )}
              {isGmOrAdmin && (
                <span className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-barber-gold/40 text-barber-paper/80 hover:text-barber-gold hover:bg-barber-gold/10"
                    asChild
                  >
                    <Link href={entityUrl}>
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Modifica
                    </Link>
                  </Button>
                  <WikiEntityDeleteButton
                    campaignId={campaignId}
                    entityId={entity.id}
                    entityName={entity.name}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
