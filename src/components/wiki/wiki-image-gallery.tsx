"use client";

import { getWikiImages } from "@/lib/wiki/images";
import { DualSourceImage } from "@/components/dual-source-image";
import { Button } from "@/components/ui/button";
import { openProjectionWindow } from "@/lib/browser/projection-window";
import { toast } from "sonner";

export function WikiImageGallery({ entity, canProject }: { entity: { id: string; campaign_id: string; name: string; image_url: string | null; telegram_fallback_id?: string | null; attributes: Record<string, unknown> | null }; canProject: boolean }) {
  const images = getWikiImages(entity.attributes);
  const all = [
    ...(entity.image_url || entity.telegram_fallback_id ? [{ key: entity.id, url: entity.image_url, fallback: entity.telegram_fallback_id, title: "Copertina" }] : []),
    ...images.map(image => ({ key: `${entity.id}:${image.id}`, url: image.url, fallback: null, title: image.title || entity.name })),
  ];
  if (!all.length) return null;
  return <section className="space-y-3" aria-label="Immagini della voce wiki">
    <h2 className="text-lg font-semibold text-barber-gold">Immagini</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {all.map(image => <figure key={image.key} className="space-y-2 rounded-lg border border-barber-gold/30 p-3">
        <DualSourceImage driveUrl={image.url ?? undefined} telegramFallbackId={image.fallback ?? undefined} alt={image.title} className="h-48 w-full object-contain" />
        <figcaption className="text-sm text-barber-paper">{image.title}</figcaption>
        {canProject && <Button type="button" variant="outline" onClick={() => { void openProjectionWindow(`/campaigns/${entity.campaign_id}/gm-only/regia-immagini/proiezione?items=${encodeURIComponent(image.key)}`, "PlayerScreenWindow").catch(() => toast.error("Impossibile aprire la proiezione.")); }}>Proietta questa immagine</Button>}
      </figure>)}
    </div>
  </section>;
}
