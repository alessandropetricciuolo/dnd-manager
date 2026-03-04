"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, BookOpen, CalendarDays, Map, Lock, ScrollText } from "lucide-react";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/1200x400/1e293b/10b981/png?text=Campagna";

const VALID_TABS = ["overview", "sessioni", "wiki", "mappe", "gm"] as const;
type TabValue = (typeof VALID_TABS)[number];

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
  gmAreaContent,
}: CampaignTabsClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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
      className="w-full"
    >
      <TabsList className="mb-6 w-full flex-wrap justify-start gap-1 rounded-xl border border-emerald-700/50 bg-slate-950/80 p-1">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dettagli
        </TabsTrigger>
        <TabsTrigger
          value="sessioni"
          className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Sessioni
        </TabsTrigger>
        <TabsTrigger
          value="wiki"
          disabled={!hasPlayedCampaign}
          className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 disabled:opacity-60"
          title={!hasPlayedCampaign ? "Partecipa alla prima sessione per sbloccare" : undefined}
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
          className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300 disabled:opacity-60"
          title={!hasPlayedCampaign ? "Partecipa alla prima sessione per sbloccare" : undefined}
        >
          {!hasPlayedCampaign ? (
            <Lock className="mr-2 h-4 w-4 shrink-0" />
          ) : (
            <Map className="mr-2 h-4 w-4" />
          )}
          Mappe
        </TabsTrigger>
        {showGmTab && (
          <TabsTrigger
            value="gm"
            className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 border-violet-700/40"
          >
            <ScrollText className="mr-2 h-4 w-4" />
            Area GM
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="overview" className="mt-0">
        <div className="rounded-xl border border-emerald-700/40 bg-slate-950/60 overflow-hidden">
          <div className="relative aspect-[21/9] min-h-[200px] w-full bg-slate-900">
            <Image
              src={campaign.image_url ?? PLACEHOLDER_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
              unoptimized={!!campaign.image_url}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              {campaignTypeLabel && (
                <span className="inline-block rounded-full border border-emerald-500/60 bg-emerald-950/70 px-3 py-1 text-xs font-medium text-emerald-300">
                  {campaignTypeLabel}
                </span>
              )}
            </div>
          </div>
          <div className="p-6 md:p-8">
            <h2 className="text-xl font-semibold text-slate-50 md:text-2xl">{campaign.name}</h2>
            {campaign.description ? (
              <p className="mt-4 text-slate-300 leading-relaxed whitespace-pre-wrap">
                {campaign.description}
              </p>
            ) : (
              <p className="mt-4 text-slate-500 italic">Nessuna descrizione.</p>
            )}
            {!hasPlayedCampaign && (
              <p className="mt-6 rounded-lg border border-amber-600/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
                Partecipa alla prima sessione per sbloccare Wiki e Mappe e scoprire il mondo della campagna.
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
      {showGmTab && (
        <TabsContent value="gm" className="mt-0">
          {gmAreaContent}
        </TabsContent>
      )}
    </Tabs>
  );
}
