"use client";

import { useEffect, useRef } from "react";
import { loadSpotifyIframeApi, type SpotifyEmbedController } from "@/lib/spotify/spotify-iframe-api";
import {
  registerSpotifyEmbedController,
  unregisterSpotifyEmbedController,
} from "@/lib/spotify/spotify-embed-bus";

type Props = {
  playlistId: string;
  width: number | string;
  height: number | string;
  className?: string;
};

function dim(v: number | string): string | number {
  return typeof v === "number" ? String(v) : v;
}

/**
 * Embed playlist Spotify via iFrame API (togglePlay da telecomando / codice).
 * Sostituisce un iframe statico: lo script Spotify sostituisce il contenuto del div.
 */
export function SpotifyEmbedControlled({ playlistId, width, height, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ownerRef = useRef(Symbol("spotify-embed"));
  const controllerRef = useRef<SpotifyEmbedController | null>(null);

  useEffect(() => {
    const owner = ownerRef.current;
    const el = containerRef.current;
    const id = playlistId.trim();
    if (!el || !id) return;

    let cancelled = false;
    void (async () => {
      try {
        const IFrameAPI = await loadSpotifyIframeApi();
        if (cancelled || !containerRef.current) return;
        IFrameAPI.createController(
          containerRef.current,
          {
            uri: `spotify:playlist:${id}`,
            width: dim(width),
            height: dim(height),
          },
          (controller) => {
            if (cancelled) {
              controller.destroy?.();
              return;
            }
            controllerRef.current = controller;
            registerSpotifyEmbedController(owner, controller);
          }
        );
      } catch {
        /* script bloccato o rete */
      }
    })();

    return () => {
      cancelled = true;
      unregisterSpotifyEmbedController(owner);
      const c = controllerRef.current;
      controllerRef.current = null;
      c?.destroy?.();
    };
  }, [playlistId, width, height]);

  return <div ref={containerRef} className={className} />;
}
