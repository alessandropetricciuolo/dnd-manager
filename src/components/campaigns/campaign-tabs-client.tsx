"use client";

import { useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, BookOpen, CalendarDays, Map, Lock, ScrollText, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/1200x400/1e293b/10b981/png?text=Campagna";

const VALID_TABS = ["overview", "sessioni", "wiki", "mappe", "pg", "gm"] as const;
type TabValue = (typeof VALID_TABS)[number];

const TAB_LABELS: Record<TabValue, string> = {
  overview: "Panoramica",
  sessioni: "Sessioni",
  wiki: "Wiki",
  mappe: "Mappe",
  pg: "PG",
  gm: "Solo GM",
};

type CampaignTabsClientProps = {
  campaignId: string;
  campaign: {
    id: string;
    name: string;
    description: string | null;
    type: string | null;
    image_url: string | null;
  };
  hasPlayedCampaign: boolean;
  campaignTypeLabel: string | null;
  /** Contenuti passati dalla pagina server (Server Components) */
  sessioniContent: React.ReactNode;
  wikiContent: React.ReactNode;
  mappeContent: React.ReactNode;
  /** Tab PG: Personaggi (GM) / Il Mio Personaggio (Player) */
  pgContent: React.ReactNode;
  /** Area GM: passato solo se user è GM o Admin; tab e contenuto visibili solo in quel caso */
  gmAreaContent?: React.ReactNode | null;
};

export function CampaignTabsClient({
  campaignId,
  campaign,
  hasPlayedCampaign,
  campaignTypeLabel,
  sessioniContent,
  wikiContent,
  mappeContent,
  pgContent,
  gmAreaContent,
}: CampaignTabsClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tabSheetOpen, setTabSheetOpen] = useState(false);
  const showGmTab = gmAreaContent != null;

  const tabParam = searchParams.get("tab");
  let tab: TabValue =
    tabParam && VALID_TABS.includes(tabParam as TabValue)
      ? (tabParam as TabValue)
      : "overview";
  if (tab === "gm" && !showGmTab) tab = "overview";

  const effectiveTab =
    (tab === "wiki" || tab === "mappe") && !hasPlayedCampaign
      ? "overview"
      : tab;

  function setTab(newTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    if (newTab !== "wiki") params.delete("wiki_filter");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs
      value={effectiveTab}
      onValueChange={setTab}
      className="min-w-0 w-full max-w-full"
    >
      <div className="sticky top-0 z-10 -mt-4 mb-4 min-w-0 max-w-full bg-barber-dark/95 px-4 pt-4 backdrop-blur-md supports-[backdrop-filter]:bg-barber-dark/80 md:-mx-4 md:px-4 lg:-mx-6 lg:-mt-6 lg:px-6 lg:pt-6">
        {/* Mobile: selettore tab a tendina (evita overflow/sovrapposizioni) */}
        <div className="md:hidden w-full min-w-0">
          <Sheet open={tabSheetOpen} onOpenChange={setTabSheetOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between rounded-xl border-barber-gold/40 bg-barber-dark/90 py-6 text-left text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold data-[state=active]:bg-barber-gold/20"
              >
                <span className="font-medium">{TAB_LABELS[effectiveTab]}</span>
                <ChevronDown className="h-5 w-5 shrink-0 opacity-70" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="rounded-t-2xl border-t border-barber-gold/20 bg-barber-dark pb-8 pt-4"
            >
              <p className="mb-4 px-1 text-sm font-medium text-barber-paper/70">Sezione campagna</p>
              <nav className="flex flex-col gap-1">
                {(["overview", "sessioni", "wiki", "mappe", "pg"] as const).map((value) => {
                  const disabled = (value === "wiki" || value === "mappe") && !hasPlayedCampaign;
                  const isActive = effectiveTab === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (!disabled) {
                          setTab(value);
                          setTabSheetOpen(false);
                        }
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors",
                        disabled && "cursor-not-allowed opacity-60",
                        "text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold",
                        isActive && "bg-barber-gold/20 text-barber-gold"
                      )}
                    >
                      {value === "overview" && <LayoutDashboard className="h-5 w-5 shrink-0" />}
                      {value === "sessioni" && <CalendarDays className="h-5 w-5 shrink-0" />}
                      {value === "wiki" && (hasPlayedCampaign ? <BookOpen className="h-5 w-5 shrink-0" /> : <Lock className="h-5 w-5 shrink-0" />)}
                      {value === "mappe" && (hasPlayedCampaign ? <Map className="h-5 w-5 shrink-0" /> : <Lock className="h-5 w-5 shrink-0" />)}
                      {value === "pg" && <User className="h-5 w-5 shrink-0" />}
                      {TAB_LABELS[value]}
                    </button>
                  );
                })}
                {showGmTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setTab("gm");
                      setTabSheetOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors text-violet-200 hover:bg-violet-500/20",
                      effectiveTab === "gm" && "bg-violet-500/20 text-violet-300"
                    )}
                  >
                    <ScrollText className="h-5 w-5 shrink-0" />
                    {TAB_LABELS.gm}
                  </button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: tab orizzontali */}
        <TabsList className="hidden md:flex w-full flex-wrap justify-start gap-1 rounded-xl border border-barber-gold/40 bg-barber-dark/90 p-1">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Panoramica
          </TabsTrigger>
          <TabsTrigger
            value="sessioni"
            className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            Sessioni
          </TabsTrigger>
          <TabsTrigger
            value="wiki"
            disabled={!hasPlayedCampaign}
            className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold disabled:opacity-60"
            title={!hasPlayedCampaign ? "Sblocca partecipando a una sessione" : undefined}
          >
            {!hasPlayedCampaign ? (
              <Lock className="mr-2 h-4 w-4 shrink-0" />
            ) : (
              <BookOpen className="mr-2 h-4 w-4" />
            )}
            Wiki
          </TabsTrigger>
          <TabsTrigger
            value="mappe"
            disabled={!hasPlayedCampaign}
            className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold disabled:opacity-60"
            title={!hasPlayedCampaign ? "Sblocca partecipando a una sessione" : undefined}
          >
            {!hasPlayedCampaign ? (
              <Lock className="mr-2 h-4 w-4 shrink-0" />
            ) : (
              <Map className="mr-2 h-4 w-4" />
            )}
            Mappe
          </TabsTrigger>
          <TabsTrigger
            value="pg"
            className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
          >
            <User className="mr-2 h-4 w-4" />
            PG
          </TabsTrigger>
          {showGmTab && (
            <TabsTrigger
              value="gm"
              className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 border-violet-700/40"
            >
              <ScrollText className="mr-2 h-4 w-4" />
              Solo GM
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-0 min-w-0">
        <div className="min-w-0 max-w-full rounded-xl border border-barber-gold/30 bg-barber-dark/80 overflow-hidden">
          <div className="relative aspect-[21/9] min-h-[200px] min-w-0 w-full bg-barber-dark">
            <Image
              src={campaign.image_url ?? PLACEHOLDER_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
              unoptimized={!!campaign.image_url}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              {campaignTypeLabel && (
                <span className="inline-block rounded-full border border-barber-gold/50 bg-barber-dark/80 px-3 py-1 text-xs font-medium text-barber-gold">
                  {campaignTypeLabel}
                </span>
              )}
            </div>
          </div>
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-semibold text-barber-paper md:text-2xl">{campaign.name}</h2>
            {campaign.description ? (
              <p className="mt-4 text-barber-paper/80 leading-relaxed whitespace-pre-wrap">
                {campaign.description}
              </p>
            ) : (
              <p className="mt-4 text-barber-paper/50 italic">Nessuna descrizione.</p>
            )}
            {!hasPlayedCampaign && (
              <p className="mt-6 rounded-lg border border-barber-gold/40 bg-barber-gold/10 px-4 py-3 text-sm text-barber-gold">
                Partecipa a una sessione per sbloccare Wiki e Mappe.
              </p>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="sessioni" className="mt-0">
        {sessioniContent}
      </TabsContent>

      <TabsContent value="wiki" className="mt-0">
        {wikiContent}
      </TabsContent>

      <TabsContent value="mappe" className="mt-0">
        {mappeContent}
      </TabsContent>
      <TabsContent value="pg" className="mt-0">
        {pgContent}
      </TabsContent>
      {showGmTab && (
        <TabsContent value="gm" className="mt-0">
          {gmAreaContent}
        </TabsContent>
      )}
    </Tabs>
  );
}
