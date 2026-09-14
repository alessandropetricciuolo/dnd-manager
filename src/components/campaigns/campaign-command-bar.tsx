"use client";

import Link from "next/link";
import { ChevronDown, Info, MoreHorizontal, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CampaignCommandBarProps = {
  campaignName: string;
  campaignTypeLabel: string | null;
  gmDisplayName: string | null;
  sectionLabel: string;
  sectionIcon: React.ComponentType<{ className?: string }>;
  playerPrimerHref: string | null;
  onOpenInfo: () => void;
  primaryAction?: React.ReactNode;
  sectionActions?: React.ReactNode;
  managementActions?: React.ReactNode;
  dangerousAction?: React.ReactNode;
};

/** Barra condivisa di campagna: una riga densa, con le azioni operative nel menu. */
export function CampaignCommandBar({
  campaignName,
  campaignTypeLabel,
  gmDisplayName,
  sectionLabel,
  sectionIcon: SectionIcon,
  playerPrimerHref,
  onOpenInfo,
  primaryAction,
  sectionActions,
  managementActions,
  dangerousAction,
}: CampaignCommandBarProps) {
  const hasCommands = Boolean(
    sectionActions || managementActions || dangerousAction || playerPrimerHref
  );

  return (
    <div className="sticky top-0 z-30 shrink-0 border-b border-barber-gold/20 bg-barber-dark/95 shadow-[0_4px_18px_rgba(0,0,0,0.18)] backdrop-blur supports-[backdrop-filter]:bg-barber-dark/90">
      <div className="flex min-h-12 items-center gap-2 px-3 py-1 sm:px-4 lg:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5 text-xs leading-tight">
            <span className="truncate font-serif text-sm font-semibold text-barber-paper lg:hidden">
              {campaignName}
            </span>
            <span className="text-barber-paper/30 lg:hidden">/</span>
            <span className="inline-flex min-w-0 items-center gap-1 truncate font-medium text-barber-gold">
              <SectionIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {sectionLabel}
            </span>
          </div>
          <div className="hidden truncate text-[10px] text-barber-paper/45 sm:block lg:hidden">
            {campaignTypeLabel ?? "Campagna"}
            {gmDisplayName ? ` · Master ${gmDisplayName}` : ""}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {primaryAction ? <div className="shrink-0">{primaryAction}</div> : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenInfo}
            className="hidden h-9 border-barber-gold/30 text-barber-paper hover:bg-barber-gold/10 hover:text-barber-gold sm:inline-flex"
          >
            <Info className="mr-1.5 h-4 w-4" />
            Sinossi
          </Button>
          {hasCommands ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 border-barber-gold/45 bg-barber-gold/10 text-barber-gold hover:bg-barber-gold/20"
                  aria-label="Apri comandi campagna"
                >
                  <MoreHorizontal className="mr-1.5 h-4 w-4" />
                  <span className="hidden sm:inline">Comandi</span>
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[min(92vw,22rem)] border-barber-gold/25 bg-barber-dark p-2 text-barber-paper"
              >
                <DropdownMenuLabel className="px-2 text-[10px] uppercase tracking-[0.2em] text-barber-paper/45">
                  {campaignName}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-barber-gold/15" />
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onOpenInfo}
                    className="h-9 w-full justify-start gap-2 px-2 text-barber-paper/85 hover:bg-barber-gold/10 hover:text-barber-gold"
                  >
                    <Info className="h-4 w-4" />
                    Sinossi e dettagli
                  </Button>
                  {playerPrimerHref ? (
                    <Button
                      asChild
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full justify-start gap-2 px-2 text-barber-gold hover:bg-barber-gold/10"
                    >
                      <Link href={playerPrimerHref}>
                        <BookOpen className="h-4 w-4" />
                        Guida del giocatore
                      </Link>
                    </Button>
                  ) : null}
                  {sectionActions ? (
                    <div className="border-t border-barber-gold/15 pt-1">{sectionActions}</div>
                  ) : null}
                  {managementActions ? (
                    <div className="border-t border-barber-gold/15 pt-2">
                      <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-barber-paper/40">
                        Gestione campagna
                      </p>
                      <div className="flex flex-wrap gap-1.5">{managementActions}</div>
                    </div>
                  ) : null}
                  {dangerousAction ? (
                    <div className="border-t border-red-500/25 pt-2">
                      <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-red-300/70">
                        Area pericolosa
                      </p>
                      {dangerousAction}
                    </div>
                  ) : null}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </div>
  );
}
