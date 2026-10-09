"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { getWikiImages } from "@/lib/wiki/images";
import { setWikiPrimaryImage } from "@/app/campaigns/wiki-actions";
import { DualSourceImage } from "@/components/dual-source-image";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { openProjectionWindow } from "@/lib/browser/projection-window";
import { Star, MonitorPlay, Loader2 } from "lucide-react";
import { toast } from "sonner";

type GalleryEntity = { id: string; campaign_id: string; name: string; image_url: string | null; telegram_fallback_id?: string | null; attributes: Record<string, unknown> | null };
export function WikiImageGallery({ entity, canProject }: { entity: GalleryEntity; canProject: boolean }) {
  const router = useRouter();
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const images = getWikiImages(entity.attributes);
  const all = [
    ...(entity.image_url || entity.telegram_fallback_id ? [{ key: entity.id, imageId: null, url: entity.image_url, fallback: entity.telegram_fallback_id, title: entity.name }] : []),
    ...images.map(image => ({ key: `${entity.id}:${image.id}`, imageId: image.id, url: image.url, fallback: image.telegram_fallback_id, title: image.title || entity.name })),
  ];
  useEffect(() => {
    if (!api) return;
    const update = () => setIndex(api.selectedScrollSnap());
    update();
    api.on("select", update);
    api.on("reInit", update);
    return () => { api.off("select", update); api.off("reInit", update); };
  }, [api]);
  const current = all[Math.min(index, all.length - 1)];
  async function makePrimary() {
    if (!current?.imageId || saving) return;
    setSaving(true);
    try {
      const result = await setWikiPrimaryImage(entity.id, entity.campaign_id, current.imageId);
      if (!result.success) { toast.error(result.message); return; }
      toast.success(result.message);
      api?.scrollTo(0, true);
      router.refresh();
    } catch { toast.error("Impossibile salvare l’immagine principale."); }
    finally { setSaving(false); }
  }
  if (!current) return null;
  return <section className="mx-auto w-full max-w-2xl space-y-3" aria-label="Immagini della voce wiki">
    <Carousel setApi={setApi} opts={{ loop: all.length > 1 }} aria-label={`Immagini di ${entity.name}`} className="overflow-hidden rounded-lg border border-barber-gold/30 bg-black/30">
      <CarouselContent>
        {all.map((image, position) => <CarouselItem key={image.key} aria-label={`${position + 1} di ${all.length}`}>
          <DualSourceImage driveUrl={image.url ?? undefined} telegramFallbackId={image.fallback ?? undefined} alt={image.title} preserveOriginal draggable={false} loading={position === 0 ? "eager" : "lazy"} className="aspect-square max-h-[65vh] w-full object-contain" />
        </CarouselItem>)}
      </CarouselContent>
      <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">{Math.min(index + 1, all.length)} / {all.length}</span>
      {all.length > 1 && <><CarouselPrevious aria-label="Immagine precedente" className="left-3 h-10 w-10 bg-barber-dark/90" /><CarouselNext aria-label="Immagine successiva" className="right-3 h-10 w-10 bg-barber-dark/90" /></>}
    </Carousel>
    {all.length > 1 && <div className="flex flex-wrap justify-center" aria-label="Scegli immagine">
      {all.map((image, position) => <button key={image.key} type="button" aria-label={`Vai all’immagine ${position + 1}`} aria-current={index === position ? "true" : undefined} onClick={() => api?.scrollTo(position)} className="flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-barber-gold"><span className={`h-2 w-2 rounded-full ${index === position ? "bg-barber-gold" : "bg-barber-paper/30"}`} /></button>)}
    </div>}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 break-words text-sm text-barber-paper" aria-live="polite">{current.title}</p>
      {!current.imageId && <span className="flex items-center gap-1 text-xs text-barber-gold"><Star className="h-3 w-3 fill-current" />Principale</span>}
    </div>
    {canProject && <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => { void openProjectionWindow(`/campaigns/${entity.campaign_id}/gm-only/regia-immagini/proiezione?items=${encodeURIComponent(current.key)}`, "PlayerScreenWindow").catch(() => toast.error("Impossibile aprire la proiezione.")); }}><MonitorPlay className="mr-2 h-4 w-4" />Proietta questa immagine</Button>
      {current.imageId && <Button type="button" variant="outline" disabled={saving} onClick={() => void makePrimary()}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}Imposta come principale</Button>}
    </div>}
  </section>;
}
