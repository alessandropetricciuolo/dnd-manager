"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "nextjs-toploader/app";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { addPin } from "@/app/campaigns/map-actions";
import { NewPinDialog } from "./new-pin-dialog";
import { cn } from "@/lib/utils";

const DEFAULT_ASPECT_RATIO = 16 / 9;

export type MapPinData = {
  id: string;
  x: number;
  y: number;
  label?: string;
  linkMapId?: string;
};

export type CampaignMapOption = {
  id: string;
  name: string;
};

type InteractiveMapProps = {
  campaignId: string;
  mapId: string;
  imageUrl: string;
  mapName: string;
  pins: MapPinData[];
  isCreator: boolean;
  campaignMaps: CampaignMapOption[];
};

export function InteractiveMap({
  campaignId,
  mapId,
  imageUrl,
  mapName,
  pins,
  isCreator,
  campaignMaps,
}: InteractiveMapProps) {
  const router = useRouter();
  const [newPinCoords, setNewPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const aspectRatio = imageAspectRatio ?? DEFAULT_ASPECT_RATIO;

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img?.naturalWidth && img.naturalHeight) {
      setImageAspectRatio(img.naturalWidth / img.naturalHeight);
    }
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isCreator) return;
      const img = imageRef.current ?? containerRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) return;
      const x = (e.clientX - rect.left) / w;
      const y = (e.clientY - rect.top) / h;
      if (x < 0 || x > 1 || y < 0 || y > 1) return;
      setNewPinCoords({ x, y });
    },
    [isCreator]
  );

  const handlePinSubmit = async (formData: FormData) => {
    const result = await addPin(mapId, campaignId, formData);
    if (result.success) {
      toast.success(result.message);
      setNewPinCoords(null);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const isExternalOrProxyUrl = useMemo(
    () =>
      imageUrl.startsWith("blob:") ||
      imageUrl.startsWith("/api/tg-image/") ||
      imageUrl.startsWith("/api/tg-file/") ||
      imageUrl.includes("drive.google.com") ||
      imageUrl.includes("googleusercontent.com"),
    [imageUrl]
  );

  return (
    <div className="h-full w-full min-h-[300px] bg-slate-950">
      {/* Robust container: defined aspect ratio prevents layout shift; matches image once loaded so pins align. */}
      <div
        className="relative w-full"
        style={{ aspectRatio: String(aspectRatio), minHeight: 280 }}
      >
        <div className="w-full h-full min-h-0">
          <TransformWrapper
            initialScale={1}
            minScale={0.3}
            maxScale={4}
            centerOnInit
            limitToBounds={false}
          >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: "100%", height: "100%", position: "relative" }}
          >
            {/* Map container: same size as wrapper; image + pin layer overlay exactly. */}
            <div
              ref={containerRef}
              className="relative w-full h-full"
              onDoubleClick={handleDoubleClick}
              style={{ cursor: isCreator ? "crosshair" : "default" }}
            >
              <Image
                ref={imageRef}
                src={imageUrl}
                alt={mapName}
                fill
                className="object-contain"
                sizes="100vw"
                priority
                unoptimized={isExternalOrProxyUrl}
                onLoad={handleImageLoad}
              />
              {/* Pin layer: absolute inset-0 so pins (left/top %) match the image coordinate system. */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden />
              <div className="absolute inset-0 pointer-events-auto">
                {pins.map((pin) => (
                  <PinMarker
                    key={pin.id}
                    pin={pin}
                    campaignId={campaignId}
                  />
                ))}
              </div>
            </div>
          </TransformComponent>
        </TransformWrapper>
        </div>
      </div>

      {isCreator && newPinCoords && (
        <NewPinDialog
          open={!!newPinCoords}
          onOpenChange={(open) => !open && setNewPinCoords(null)}
          campaignId={campaignId}
          campaignMaps={campaignMaps}
          coords={newPinCoords}
          onSubmit={handlePinSubmit}
        />
      )}
    </div>
  );
}

function PinMarker({
  pin,
  campaignId,
}: {
  pin: MapPinData;
  campaignId: string;
}) {
  const router = useRouter();
  const hasLink = !!pin.linkMapId;

  const handleClick = () => {
    if (hasLink && pin.linkMapId) {
      router.push(`/campaigns/${campaignId}/maps/${pin.linkMapId}`);
    }
  };

  return (
    <div
      className={cn(
        "group absolute -translate-x-1/2 -translate-y-1/2 cursor-default rounded-full p-0.5 transition-transform hover:scale-110",
        hasLink && "cursor-pointer"
      )}
      style={{
        left: `${pin.x * 100}%`,
        top: `${pin.y * 100}%`,
      }}
      title={!hasLink ? pin.label ?? "Pin" : undefined}
      onClick={hasLink ? handleClick : undefined}
      onKeyDown={(e) => {
        if (hasLink && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
      role={hasLink ? "link" : "img"}
      tabIndex={hasLink ? 0 : undefined}
      aria-label={pin.label ?? (hasLink ? "Vai alla mappa collegata" : "Pin")}
    >
      <MapPin
        className={cn(
          "h-8 w-8 drop-shadow-md",
          hasLink
            ? "text-emerald-400 fill-emerald-500/50"
            : "text-slate-300 fill-slate-500/50"
        )}
      />
      {pin.label && (
        <span className="absolute left-1/2 top-full z-10 mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900/95 px-1.5 py-0.5 text-xs text-slate-200 shadow-lg opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
          {pin.label}
        </span>
      )}
    </div>
  );
}
