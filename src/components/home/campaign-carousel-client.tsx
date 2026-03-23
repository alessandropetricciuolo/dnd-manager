"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PLACEHOLDER_IMAGE =
  "https://placehold.co/800x450/1c1917/fbbf24/png?text=Campagna";

export type CampaignCarouselItem = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
};

type CampaignCarouselClientProps = {
  campaigns: CampaignCarouselItem[];
};

export function CampaignCarouselClient({ campaigns }: CampaignCarouselClientProps) {
  const [api, setApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    if (!api) return;
    const timer = setInterval(() => {
      api.scrollNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [api]);

  if (!campaigns.length) return null;

  return (
    <Carousel
      setApi={setApi}
      opts={{ align: "start", loop: true }}
      className="w-full"
    >
      <CarouselContent className="-ml-2 md:-ml-4">
        {campaigns.map((campaign) => (
          <CarouselItem
            key={campaign.id}
            className={cn(
              "pl-2 md:pl-4",
              "basis-full md:basis-1/2 lg:basis-1/3"
            )}
          >
            <Link href={`/campaigns/${campaign.id}`} className="block h-full">
              <Card
                className={cn(
                  "h-full overflow-hidden border-yellow-600/30 bg-barber-dark/80",
                  "transition-all duration-300 ease-out",
                  "hover:border-barber-gold/50 hover:bg-barber-dark/95",
                  "hover:shadow-[0_0_30px_rgba(251,191,36,0.08)]",
                  "group"
                )}
              >
                <CardHeader className="p-0">
                  <div className="relative aspect-video w-full overflow-hidden bg-barber-dark">
                    <Image
                      src={campaign.image_url || PLACEHOLDER_IMAGE}
                      alt={campaign.name}
                      fill
                      className={cn(
                        "object-cover transition-transform duration-300 ease-out",
                        "group-hover:scale-105"
                      )}
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      placeholder="blur"
                      blurDataURL={IMAGE_BLUR_PLACEHOLDER}
                      unoptimized={!!campaign.image_url?.startsWith("/api/")}
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-barber-dark/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <h3 className="line-clamp-1 font-semibold text-barber-paper group-hover:text-barber-gold transition-colors">
                    {campaign.name}
                  </h3>
                  {campaign.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-barber-paper/70">
                      {campaign.description}
                    </p>
                  ) : (
                    <p className="mt-1 line-clamp-2 text-sm text-barber-paper/50 italic">
                      Nessuna descrizione
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious
        className="hidden lg:flex -left-12 border-barber-gold/40 bg-barber-dark/90 text-barber-gold hover:bg-barber-gold/20 hover:text-barber-paper"
        aria-label="Campagne precedenti"
      />
      <CarouselNext
        className="hidden lg:flex -right-12 border-barber-gold/40 bg-barber-dark/90 text-barber-gold hover:bg-barber-gold/20 hover:text-barber-paper"
        aria-label="Campagne successive"
      />
    </Carousel>
  );
}
