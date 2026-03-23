"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { IMAGE_BLUR_PLACEHOLDER, cn } from "@/lib/utils";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/800x450/1c1917/fbbf24/png?text=Campagna";

export type CampaignMiniItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

type CampaignMiniCarouselClientProps = {
  campaigns: CampaignMiniItem[];
  isAuthenticated: boolean;
};

export function CampaignMiniCarouselClient({
  campaigns,
  isAuthenticated,
}: CampaignMiniCarouselClientProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => {
      api.scrollNext();
    }, 3800);
    return () => clearInterval(timer);
  }, [api]);

  if (!campaigns.length) return null;

  return (
    <div className="space-y-2">
      <Carousel setApi={setApi} opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-2">
          {campaigns.map((campaign) => {
            const href = isAuthenticated ? `/campaigns/${campaign.id}` : "/login";
            return (
              <CarouselItem
                key={campaign.id}
                className={cn(
                  "pl-2",
                  "basis-[78%] sm:basis-[52%] md:basis-[40%] lg:basis-[30%]"
                )}
              >
                <Link href={href} className="block h-full">
                  <Card className="h-full overflow-hidden border-barber-gold/25 bg-[#140f1f]/90 transition-colors hover:border-barber-gold/50">
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <Image
                        src={campaign.image_url || PLACEHOLDER_IMAGE}
                        alt={campaign.name}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-[1.03]"
                        sizes="(max-width: 768px) 78vw, (max-width: 1024px) 40vw, 30vw"
                        placeholder="blur"
                        blurDataURL={IMAGE_BLUR_PLACEHOLDER}
                        unoptimized={!!campaign.image_url?.startsWith("/api/")}
                      />
                    </div>
                    <CardContent className="p-3">
                      <h3 className="line-clamp-1 text-sm font-semibold text-barber-gold">
                        {campaign.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-barber-paper/75">
                        {campaign.description || "Scopri la sinossi e le prossime sessioni disponibili."}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {!isAuthenticated && (
        <p className="text-xs text-barber-paper/70">
          Visualizzi le campagne in anteprima. Accedi per entrare nelle pagine campagna e iscriverti alle sessioni.
        </p>
      )}
    </div>
  );
}
