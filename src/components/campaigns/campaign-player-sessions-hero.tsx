"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, ChevronDown, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMAGE_BLUR_PLACEHOLDER, cn } from "@/lib/utils";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/1200x400/1c1917/fbbf24/png?text=Campagna";

type CampaignPlayerSessionsHeroProps = {
  campaignName: string;
  imageUrl: string | null;
  campaignTypeLabel: string | null;
  description: string | null;
  gmDisplayName: string | null;
  playerPrimerHref: string | null;
  isLongCampaign: boolean;
};

export function CampaignPlayerSessionsHero({
  campaignName,
  imageUrl,
  campaignTypeLabel,
  description,
  gmDisplayName,
  playerPrimerHref,
  isLongCampaign,
}: CampaignPlayerSessionsHeroProps) {
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const hasSynopsis = Boolean(description?.trim());
  const showGuide = isLongCampaign && Boolean(playerPrimerHref);

  return (
    <section className="mb-4 overflow-hidden rounded-2xl ring-1 ring-barber-gold/20 lg:hidden">
      <div className="relative h-36 sm:h-40">
        <Image
          src={imageUrl ?? PLACEHOLDER_IMAGE}
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
          priority
          placeholder="blur"
          blurDataURL={IMAGE_BLUR_PLACEHOLDER}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/55 to-barber-dark/20" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          {campaignTypeLabel ? (
            <span className="inline-flex rounded-full border border-barber-gold/40 bg-barber-dark/70 px-2.5 py-0.5 text-[10px] font-medium text-barber-gold backdrop-blur-sm">
              {campaignTypeLabel}
            </span>
          ) : null}
          <h2 className="mt-1.5 font-serif text-xl font-bold leading-tight text-barber-paper sm:text-2xl">
            {campaignName}
          </h2>
          {gmDisplayName ? (
            <p className="mt-0.5 text-xs text-barber-paper/65">
              Master · <span className="text-barber-gold/90">{gmDisplayName}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2 bg-barber-dark/90 p-3 sm:p-4">
        {showGuide ? (
          <Button
            asChild
            className="h-11 w-full bg-barber-gold text-base font-semibold text-barber-dark shadow-md hover:bg-barber-gold/90"
          >
            <Link href={playerPrimerHref!}>
              <BookOpen className="mr-2 h-5 w-5" />
              Leggi la Guida del Giocatore
            </Link>
          </Button>
        ) : null}

        {hasSynopsis ? (
          <div className="rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06]">
            <button
              type="button"
              aria-expanded={synopsisOpen}
              onClick={() => setSynopsisOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-barber-paper">
                <ScrollText className="h-4 w-4 shrink-0 text-barber-gold" />
                Sinossi
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-barber-paper/45 transition-transform",
                  synopsisOpen && "rotate-180"
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                synopsisOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <p className="border-t border-white/[0.06] px-3 pb-3 pt-2 text-sm leading-relaxed text-barber-paper/80">
                  {description}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <p className="text-center text-[11px] font-medium uppercase tracking-[0.14em] text-barber-gold/70">
          Prossime serate al tavolo
        </p>
      </div>
    </section>
  );
}
