"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, BookOpen } from "lucide-react";

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

  const wikiFilterParam = searchParams.get("wiki_filter");
  const typeFilter =
    wikiFilterParam && WIKI_FILTER_VALUES.includes(wikiFilterParam as (typeof WIKI_FILTER_VALUES)[number])
      ? wikiFilterParam
      : ALL_TYPES;

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
      <div className="rounded-xl border border-emerald-700/40 bg-slate-950/60 px-6 py-10 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-slate-500" />
        <p className="mt-3 text-slate-400">
          {emptyMessage ?? "Nessuna voce nel wiki. Crea la prima entità per iniziare."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={typeFilter} onValueChange={setWikiFilter}>
        <TabsList className="flex flex-wrap gap-1 rounded-xl border border-emerald-700/50 bg-slate-950/80 p-1">
          <TabsTrigger
            value={ALL_TYPES}
            className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
          >
            Tutti
          </TabsTrigger>
          {Object.entries(typeLabels).map(([value, label]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
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
                <Card className="h-full border-emerald-700/50 bg-slate-950/70 transition-colors hover:border-emerald-500/60">
                  <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <CardTitle className="line-clamp-1 text-base text-slate-50">
                      {displayName}
                    </CardTitle>
                    {isCreator && entity.isSecret && (
                      <Lock
                        className="h-4 w-4 shrink-0 text-amber-400"
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
