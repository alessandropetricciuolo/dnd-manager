"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, BookOpen, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type WikiEntityListItem = {
  id: string;
  name: string;
  type: string;
  isSecret: boolean;
  sortOrder: number | null;
};

type WikiListClientProps = {
  campaignId: string;
  entities: WikiEntityListItem[];
  isCreator: boolean;
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
  isCreator,
  typeLabels,
  emptyMessage,
}: WikiListClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

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

  const filtered =
    typeFilter === ALL_TYPES
      ? entities
      : entities.filter((e) => e.type === typeFilter);

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
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((entity) => {
          const displayName =
            typeFilter === "lore" && entity.sortOrder != null && entity.sortOrder > 0
              ? `Capitolo ${entity.sortOrder}: ${entity.name}`
              : entity.name;
          return (
              <Link
                key={entity.id}
                href={`/campaigns/${campaignId}/wiki/${entity.id}`}
              >
                <Card className="h-full border-barber-gold/40 bg-barber-dark/90 transition-colors hover:border-barber-gold/50">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <CardTitle className="line-clamp-1 text-base text-barber-paper">
                      {displayName}
                    </CardTitle>
                    {isCreator && entity.isSecret && (
                      <Lock
                        className="h-4 w-4 shrink-0 text-barber-gold"
                        aria-label="Segreto"
                      />
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Badge variant={badgeVariant(entity.type)}>
                      {typeLabels[entity.type] ?? entity.type}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
            })}
      </div>
    </div>
  );
}
