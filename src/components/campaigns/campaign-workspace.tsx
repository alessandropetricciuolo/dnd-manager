"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import {
  ArrowLeft,
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
import { MobileNavMenu } from "@/components/dashboard/mobile-nav-menu";
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
  { label: string; shortLabel: string; icon: typeof CalendarDays }
> = {
  sessioni: { label: "Sessioni", shortLabel: "Sess.", icon: CalendarDays },
  wiki: { label: "Wiki", shortLabel: "Wiki", icon: BookOpen },
  mappe: { label: "Mappe", shortLabel: "Mappe", icon: Map },
  missioni: { label: "Missioni", shortLabel: "Miss.", icon: Swords },
  pg: { label: "Personaggi", shortLabel: "PG", icon: User },
  gm: { label: "Strumenti GM", shortLabel: "GM", icon: Shield },
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
  /** Default true. Torneo nasconde la tab Mappe. */
  showMappeTab?: boolean;
  isAdmin?: boolean;
  isGmOrAdmin?: boolean;
};

function useCampaignTab(
  defaultTab: CampaignTabValue,
  hasPlayedCampaign: boolean,
  showGmTab: boolean,
  showMissionsTab: boolean,
  showMappeTab: boolean
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
  if (tab === "mappe" && !showMappeTab) tab = defaultTab;

  const effectiveTab =
    (tab === "wiki" || (tab === "mappe" && showMappeTab)) && !hasPlayedCampaign ? "sessioni" : tab;

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
  variant: "rail" | "pill" | "pill-icon";
};

function NavItem({ value, active, disabled, locked, onSelect, variant }: NavItemProps) {
  const meta = TAB_META[value];
  const Icon = locked ? Lock : meta.icon;
  const isGm = value === "gm";

  if (variant === "pill-icon") {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onSelect(value)}
        aria-label={meta.label}
        title={meta.label}
        className={cn(
          "inline-flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-1.5 min-w-[3rem] transition-colors",
          disabled && "cursor-not-allowed opacity-50",
          isGm
            ? active
              ? "border-violet-400/50 bg-violet-500/20 text-violet-200"
              : "border-transparent bg-barber-dark/40 text-violet-200/70 hover:bg-violet-500/10"
            : active
              ? "border-barber-gold/45 bg-barber-gold/20 text-barber-gold"
              : "border-transparent bg-barber-dark/40 text-barber-paper/70 hover:bg-barber-gold/10 hover:text-barber-gold"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="max-w-[3.25rem] truncate text-[9px] font-medium leading-none">
          {meta.shortLabel}
        </span>
      </button>
    );
  }

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
  headerActions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  campaignTypeLabel: string | null;
  description: string | null;
  gmDisplayName: string | null;
  playerPrimerHref: string | null;
  infoFooter?: React.ReactNode;
  headerActions?: React.ReactNode;
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
            {headerActions ? (
              <div className="space-y-2 border-t border-barber-gold/15 pt-4 lg:hidden">
                <p className="text-xs font-medium uppercase tracking-wide text-barber-paper/45">
                  Gestione campagna
                </p>
                <div className="flex flex-wrap gap-2">{headerActions}</div>
              </div>
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
  showMappeTab = true,
  isAdmin = false,
  isGmOrAdmin = false,
}: CampaignWorkspaceProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { effectiveTab, setTab } = useCampaignTab(
    defaultTab,
    hasPlayedCampaign,
    showGmTab,
    showMissionsTab,
    showMappeTab
  );

  const visiblePlayerTabs = PLAYER_TABS.filter((t) => {
    if (t === "missioni" && !showMissionsTab) return false;
    if (t === "mappe" && !showMappeTab) return false;
    return true;
  });

  function renderNav(variant: "rail" | "pill" | "pill-icon") {
    return (
      <>
        {visiblePlayerTabs.map((value) => {
          const disabled =
            (value === "wiki" || (value === "mappe" && showMappeTab)) && !hasPlayedCampaign;
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
      {/* Mobile: barra compatta + tab (niente hero immagine) */}
      <div className="sticky top-14 z-40 shrink-0 border-b border-barber-gold/15 bg-barber-dark/95 backdrop-blur-md supports-[backdrop-filter]:bg-barber-dark/90 lg:hidden">
        <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3">
          <MobileNavMenu isAdmin={isAdmin} isGmOrAdmin={isGmOrAdmin} iconOnly />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-barber-paper/80 hover:bg-barber-gold/10 hover:text-barber-gold"
            asChild
          >
            <Link href="/dashboard" aria-label="Torna alla dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate font-serif text-sm font-semibold leading-tight text-barber-paper sm:text-base">
              {campaignName}
            </p>
            {campaignTypeLabel ? (
              <p className="truncate text-[10px] text-barber-gold/80">{campaignTypeLabel}</p>
            ) : null}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-barber-paper/70 hover:bg-barber-gold/10 hover:text-barber-gold"
            onClick={() => setInfoOpen(true)}
            aria-label="Sinossi e dettagli campagna"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-1 overflow-x-auto px-2 pb-2 pt-0.5">
          {renderNav("pill-icon")}
        </div>
        {!hasPlayedCampaign ? (
          <p className="border-t border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] leading-snug text-amber-100">
            <span className="font-medium">
              {showMappeTab ? "Wiki e Mappe" : "Wiki"}
            </span>{" "}
            dopo la prima sessione.
          </p>
        ) : null}
      </div>

      {/* Desktop: hero con immagine */}
      <div className="relative hidden shrink-0 overflow-hidden border-b border-barber-gold/15 lg:block">
        <div className="relative h-44">
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
              <div className="hidden shrink-0 flex-wrap items-center gap-2 sm:flex">
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
        headerActions={headerActions}
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

          {/* Main content */}
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-8">
              {!hasPlayedCampaign ? (
                <p className="mb-4 hidden rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100 lg:block">
                  <span className="font-medium">
                    {showMappeTab ? "Wiki e Mappe bloccate" : "Wiki bloccata"}
                  </span>{" "}
                  finché non partecipi a una sessione.
                </p>
              ) : null}

              <TabsContent value="sessioni" className="mt-0 outline-none">
                {effectiveTab === "sessioni" ? sessioniContent : null}
              </TabsContent>
              <TabsContent value="wiki" className="mt-0 outline-none">
                {effectiveTab === "wiki" ? wikiContent : null}
              </TabsContent>
              {showMappeTab ? (
                <TabsContent value="mappe" className="mt-0 outline-none">
                  {effectiveTab === "mappe" ? mappeContent : null}
                </TabsContent>
              ) : null}
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
