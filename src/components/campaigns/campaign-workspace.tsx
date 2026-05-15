"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Info,
  Lock,
  Map,
  ScrollText,
  Shield,
  Swords,
  User,
} from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/1200x400/1c1917/fbbf24/png?text=Campagna";

const VALID_TABS = ["sessioni", "wiki", "mappe", "missioni", "pg", "gm"] as const;
export type CampaignTabValue = (typeof VALID_TABS)[number];

const TAB_META: Record<
  CampaignTabValue,
  { label: string; icon: typeof CalendarDays }
> = {
  sessioni: { label: "Sessioni", icon: CalendarDays },
  wiki: { label: "Wiki", icon: BookOpen },
  mappe: { label: "Mappe", icon: Map },
  missioni: { label: "Missioni", icon: Swords },
  pg: { label: "Personaggi", icon: User },
  gm: { label: "Strumenti GM", icon: Shield },
};

const PLAYER_TABS: CampaignTabValue[] = ["sessioni", "wiki", "mappe", "missioni", "pg"];

export type CampaignWorkspaceProps = {
  campaignId: string;
  campaignName: string;
  imageUrl: string | null;
  campaignTypeLabel: string | null;
  description: string | null;
  gmDisplayName: string | null;
  playerPrimerHref: string | null;
  hasPlayedCampaign: boolean;
  defaultTab?: CampaignTabValue;
  lockedOut?: boolean;
  headerActions?: React.ReactNode;
  infoFooter?: React.ReactNode;
  sessioniContent: React.ReactNode;
  wikiContent: React.ReactNode;
  mappeContent: React.ReactNode;
  missionsContent: React.ReactNode;
  pgContent: React.ReactNode;
  gmAreaContent?: React.ReactNode | null;
  showGmTab?: boolean;
  showMissionsTab: boolean;
};

function useCampaignTab(
  defaultTab: CampaignTabValue,
  hasPlayedCampaign: boolean,
  showGmTab: boolean,
  showMissionsTab: boolean
) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  let tab: CampaignTabValue =
    tabParam && VALID_TABS.includes(tabParam as CampaignTabValue)
      ? (tabParam as CampaignTabValue)
      : defaultTab;
  if (tab === "gm" && !showGmTab) tab = defaultTab;
  if (tab === "missioni" && !showMissionsTab) tab = defaultTab;

  const effectiveTab =
    (tab === "wiki" || tab === "mappe") && !hasPlayedCampaign ? "sessioni" : tab;

  function setTab(newTab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    if (newTab !== "wiki") params.delete("wiki_filter");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return { effectiveTab, setTab };
}

type NavItemProps = {
  value: CampaignTabValue;
  active: boolean;
  disabled?: boolean;
  locked?: boolean;
  onSelect: (value: string) => void;
  variant: "rail" | "pill";
};

function NavItem({ value, active, disabled, locked, onSelect, variant }: NavItemProps) {
  const meta = TAB_META[value];
  const Icon = locked ? Lock : meta.icon;
  const isGm = value === "gm";

  if (variant === "pill") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onSelect(value)}
        className={cn(
          "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          isGm
            ? active
              ? "border-violet-400/50 bg-violet-500/20 text-violet-200"
              : "border-violet-500/30 bg-barber-dark/80 text-violet-200/80 hover:bg-violet-500/15"
            : active
              ? "border-barber-gold/50 bg-barber-gold/20 text-barber-gold"
              : "border-barber-gold/25 bg-barber-dark/60 text-barber-paper/80 hover:border-barber-gold/40 hover:text-barber-gold"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {meta.label}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onSelect(value)}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
        disabled && "cursor-not-allowed opacity-50",
        isGm
          ? active
            ? "bg-violet-500/15 text-violet-200 ring-1 ring-inset ring-violet-400/30"
            : "text-violet-200/75 hover:bg-violet-500/10 hover:text-violet-100"
          : active
            ? "bg-barber-gold/15 text-barber-gold ring-1 ring-inset ring-barber-gold/35"
            : "text-barber-paper/75 hover:bg-barber-gold/10 hover:text-barber-gold"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active
            ? isGm
              ? "text-violet-300"
              : "text-barber-gold"
            : "text-barber-paper/45 group-hover:text-barber-gold/80"
        )}
      />
      <span className="min-w-0 flex-1 truncate">{meta.label}</span>
      {active ? <ChevronRight className="h-4 w-4 shrink-0 opacity-60" /> : null}
    </button>
  );
}

function CampaignInfoSheet({
  open,
  onOpenChange,
  campaignName,
  campaignTypeLabel,
  description,
  gmDisplayName,
  playerPrimerHref,
  infoFooter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  campaignTypeLabel: string | null;
  description: string | null;
  gmDisplayName: string | null;
  playerPrimerHref: string | null;
  infoFooter?: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-barber-gold/25 bg-barber-dark text-barber-paper sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-barber-gold/15 pb-4 text-left">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-barber-gold/70">
            La campagna
          </p>
          <SheetTitle className="font-serif text-xl text-barber-paper">{campaignName}</SheetTitle>
          {campaignTypeLabel ? (
            <span className="mt-2 inline-flex w-fit rounded-full border border-barber-gold/40 bg-barber-gold/10 px-3 py-0.5 text-xs font-medium text-barber-gold">
              {campaignTypeLabel}
            </span>
          ) : null}
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 py-4 pr-3">
          <div className="space-y-4">
            {description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-barber-paper/85">
                {description}
              </p>
            ) : (
              <p className="text-sm italic text-barber-paper/50">Nessuna sinossi ancora.</p>
            )}
            {gmDisplayName ? (
              <p className="text-sm text-barber-gold/90">
                <span className="text-barber-paper/55">Master · </span>
                {gmDisplayName}
              </p>
            ) : null}
            {playerPrimerHref ? (
              <Link
                href={playerPrimerHref}
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center gap-2 rounded-lg border border-barber-gold/40 bg-barber-gold/10 px-4 py-2.5 text-sm font-medium text-barber-gold transition-colors hover:bg-barber-gold/20"
              >
                <BookOpen className="h-4 w-4" />
                Guida del giocatore
              </Link>
            ) : null}
            {infoFooter ? (
              <div className="space-y-3 border-t border-barber-gold/15 pt-4">{infoFooter}</div>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function CampaignWorkspace({
  campaignId: _campaignId,
  campaignName,
  imageUrl,
  campaignTypeLabel,
  description,
  gmDisplayName,
  playerPrimerHref,
  hasPlayedCampaign,
  defaultTab = "sessioni",
  lockedOut = false,
  headerActions,
  infoFooter,
  sessioniContent,
  wikiContent,
  mappeContent,
  missionsContent,
  pgContent,
  gmAreaContent,
  showGmTab = gmAreaContent != null,
  showMissionsTab,
}: CampaignWorkspaceProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { effectiveTab, setTab } = useCampaignTab(
    defaultTab,
    hasPlayedCampaign,
    showGmTab,
    showMissionsTab
  );

  const visiblePlayerTabs = PLAYER_TABS.filter((t) => t !== "missioni" || showMissionsTab);

  function renderNav(variant: "rail" | "pill") {
    return (
      <>
        {visiblePlayerTabs.map((value) => {
          const disabled = (value === "wiki" || value === "mappe") && !hasPlayedCampaign;
          return (
            <NavItem
              key={value}
              value={value}
              active={effectiveTab === value}
              disabled={disabled}
              locked={disabled}
              onSelect={setTab}
              variant={variant}
            />
          );
        })}
        {showGmTab ? (
          <NavItem
            value="gm"
            active={effectiveTab === "gm"}
            onSelect={setTab}
            variant={variant}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Hero */}
      <div className="relative shrink-0 overflow-hidden border-b border-barber-gold/15">
        <div className="relative h-36 sm:h-40 lg:h-44">
          <Image
            src={imageUrl ?? PLACEHOLDER_IMAGE}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
            placeholder="blur"
            blurDataURL={IMAGE_BLUR_PLACEHOLDER}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-barber-dark via-barber-dark/90 to-barber-dark/55 lg:via-barber-dark/80 lg:to-barber-dark/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-barber-dark/90 via-transparent to-transparent" />
        </div>

        <div className="absolute inset-0 flex flex-col justify-end px-4 pb-4 pt-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-barber-gold/70 sm:text-xs">
                Campagna
              </p>
              <h1 className="mt-0.5 font-serif text-2xl font-bold leading-tight text-barber-paper sm:text-3xl lg:text-4xl">
                {campaignName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {campaignTypeLabel ? (
                  <span className="inline-flex rounded-full border border-barber-gold/40 bg-barber-gold/10 px-2.5 py-0.5 text-[11px] font-medium text-barber-gold sm:text-xs">
                    {campaignTypeLabel}
                  </span>
                ) : null}
                {gmDisplayName ? (
                  <span className="text-xs text-barber-paper/60 sm:text-sm">
                    Master · <span className="text-barber-gold/90">{gmDisplayName}</span>
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-barber-gold/35 bg-barber-dark/60 text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold"
                onClick={() => setInfoOpen(true)}
              >
                <Info className="mr-1.5 h-4 w-4" />
                Sinossi
              </Button>
              {playerPrimerHref ? (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="hidden border-barber-gold/35 text-barber-gold hover:bg-barber-gold/10 sm:inline-flex"
                >
                  <Link href={playerPrimerHref}>
                    <BookOpen className="mr-1.5 h-4 w-4" />
                    Guida
                  </Link>
                </Button>
              ) : null}
              {headerActions}
            </div>
          </div>
        </div>
      </div>

      <CampaignInfoSheet
        open={infoOpen}
        onOpenChange={setInfoOpen}
        campaignName={campaignName}
        campaignTypeLabel={campaignTypeLabel}
        description={description}
        gmDisplayName={gmDisplayName}
        playerPrimerHref={playerPrimerHref}
        infoFooter={infoFooter}
      />

      {lockedOut ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-lg rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-6 text-center">
            <ScrollText className="mx-auto mb-3 h-8 w-8 text-barber-gold/70" />
            <p className="font-serif text-lg text-barber-paper">Accesso limitato</p>
            <p className="mt-2 text-sm text-barber-paper/70">
              Per questa campagna Long devi iscriverti prima di vedere sessioni e strumenti.
            </p>
            {infoFooter ? <div className="mt-4 text-left">{infoFooter}</div> : null}
            <Button
              type="button"
              variant="outline"
              className="mt-4 border-barber-gold/40 text-barber-gold"
              onClick={() => setInfoOpen(true)}
            >
              Leggi la sinossi
            </Button>
          </div>
        </div>
      ) : (
        <Tabs
          value={effectiveTab}
          onValueChange={setTab}
          className="flex min-h-0 flex-1 flex-col lg:flex-row"
        >
          {/* Nav rail — desktop */}
          <aside className="hidden min-h-0 w-52 shrink-0 flex-col border-b border-barber-gold/15 bg-barber-dark/40 lg:flex lg:w-56 lg:border-b-0 lg:border-r xl:w-60">
            <nav className="flex flex-col gap-0.5 p-3">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-barber-paper/40">
                Sezioni
              </p>
              {renderNav("rail")}
            </nav>
            <div className="mt-auto border-t border-barber-gold/10 p-3">
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-barber-paper/70 transition-colors hover:bg-barber-gold/10 hover:text-barber-gold"
              >
                <Info className="h-4 w-4 shrink-0" />
                Sinossi e dettagli
              </button>
            </div>
          </aside>

          {/* Nav pills — mobile / tablet */}
          <div className="shrink-0 border-b border-barber-gold/15 bg-barber-dark/50 lg:hidden">
            <div className="flex gap-2 overflow-x-auto px-4 py-3">
              {renderNav("pill")}
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-barber-gold/25 bg-barber-dark/60 px-3.5 py-2 text-sm text-barber-paper/75"
              >
                <Info className="h-4 w-4" />
                Info
              </button>
            </div>
            {!hasPlayedCampaign ? (
              <p className="border-t border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-100">
                <span className="font-medium">Wiki e Mappe</span> si sbloccano dopo la prima sessione giocata.
              </p>
            ) : null}
          </div>

          {/* Main content */}
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              {!hasPlayedCampaign ? (
                <p className="mb-4 hidden rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 lg:block">
                  <span className="font-medium">Wiki e Mappe bloccate</span> finché non partecipi a una sessione.
                </p>
              ) : null}

              <TabsContent value="sessioni" className="mt-0 outline-none">
                {effectiveTab === "sessioni" ? sessioniContent : null}
              </TabsContent>
              <TabsContent value="wiki" className="mt-0 outline-none">
                {effectiveTab === "wiki" ? wikiContent : null}
              </TabsContent>
              <TabsContent value="mappe" className="mt-0 outline-none">
                {effectiveTab === "mappe" ? mappeContent : null}
              </TabsContent>
              {showMissionsTab ? (
                <TabsContent value="missioni" className="mt-0 outline-none">
                  {effectiveTab === "missioni" ? missionsContent : null}
                </TabsContent>
              ) : null}
              <TabsContent value="pg" className="mt-0 outline-none">
                {effectiveTab === "pg" ? pgContent : null}
              </TabsContent>
              {showGmTab ? (
                <TabsContent value="gm" className="mt-0 outline-none">
                  {effectiveTab === "gm" ? gmAreaContent : null}
                </TabsContent>
              ) : null}
            </div>
          </main>
        </Tabs>
      )}
    </div>
  );
}
