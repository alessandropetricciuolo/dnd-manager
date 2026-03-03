"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

import { addPin } from "@/app/campaigns/map-actions";
import { NewPinDialog } from "./new-pin-dialog";
import { cn } from "@/lib/utils";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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

  return (
    <div className="h-full w-full bg-slate-950">
      <TransformWrapper
        initialScale={1}
        minScale={0.3}
        maxScale={4}
        centerOnInit
        limitToBounds={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TransformComponent
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentStyle={{ width: "100%", height: "100%", position: "relative" }}
        >
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              ref={containerRef}
              className="relative mx-auto h-full w-full"
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
                  unoptimized={imageUrl.startsWith("blob:")}
                />
              <div
                className="absolute inset-0 pointer-events-none"
                aria-hidden
              />
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
          </div>
        </TransformComponent>
      </TransformWrapper>

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
