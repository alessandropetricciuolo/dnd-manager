"use client";

import { useEffect, useState } from "react";
import { DualSourceImage } from "@/components/dual-source-image";
import { ImageMediaActions } from "@/components/media/image-media-actions";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { getWikiImages } from "@/lib/wiki/images";
import type { WikiEntityListItem } from "./wiki-list-client";

export function WikiCodexImageCarousel({ entity, campaignId, placeholder, canProject }: { entity: WikiEntityListItem; campaignId: string; placeholder: string; canProject: boolean }) {
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const images = [
    ...(entity.imageUrl || entity.telegramFallbackId ? [{ key: entity.id, url: entity.imageUrl, fallback: entity.telegramFallbackId, title: entity.name }] : []),
    ...getWikiImages(entity.attributes).map(image => ({ key: `${entity.id}:${image.id}`, url: image.url, fallback: image.telegram_fallback_id, title: image.title || entity.name })),
  ];
  const current = images[Math.min(index, images.length - 1)];
  useEffect(() => {
    if (!api) return;
    const update = () => setIndex(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => { api.off("select", update); api.off("reInit", update); };
  }, [api]);
  return <div className="w-full max-w-[260px]">
    <Carousel setApi={setApi} opts={{ loop: images.length > 1 }} aria-label={`Immagini di ${entity.name}`} className="overflow-hidden rounded-xl border-4 border-brass-base/60 bg-gradient-to-b from-amber-950/40 to-black p-1 shadow-[0_0_20px_rgba(217,119,6,0.25)]">
      <CarouselContent>
        {(images.length ? images : [{ key: "placeholder", url: placeholder, fallback: null, title: entity.name }]).map((image, position) => <CarouselItem key={image.key} aria-label={`${position + 1} di ${Math.max(1, images.length)}`}>
          <div className="relative aspect-[3/4] w-full">
            <DualSourceImage driveUrl={image.url ?? placeholder} telegramFallbackId={image.fallback} alt={image.title} draggable={false} className="h-full w-full rounded-lg object-contain" />
            <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_15px_rgba(0,0,0,0.85)]" />
          </div>
        </CarouselItem>)}
      </CarouselContent>
      {images.length > 1 && <>
        <CarouselPrevious aria-label="Immagine precedente" className="left-1 h-9 w-9 border-brass-base/60 bg-black/80 text-brass-light" />
        <CarouselNext aria-label="Immagine successiva" className="right-1 h-9 w-9 border-brass-base/60 bg-black/80 text-brass-light" />
        <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-2 py-0.5 text-xs text-parchment-100" aria-live="polite">{Math.min(index + 1, images.length)} / {images.length}</span>
      </>}
    </Carousel>
    {current && <div className="mt-2">
      <ImageMediaActions driveUrl={current.url} telegramFallbackId={current.fallback} title={current.title} viewUrl={canProject ? `/campaigns/${campaignId}/gm-only/regia-immagini/proiezione?items=${encodeURIComponent(current.key)}` : undefined} />
    </div>}
  </div>;
}
