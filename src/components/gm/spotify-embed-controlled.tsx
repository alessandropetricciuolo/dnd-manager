"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadSpotifyIframeApi, type SpotifyEmbedController } from "@/lib/spotify/spotify-iframe-api";
import {
  registerSpotifyEmbedController,
  unregisterSpotifyEmbedController,
} from "@/lib/spotify/spotify-embed-bus";
import { spotifyPlaylistEmbedSrc } from "@/lib/spotify/playlist-id";
import { cn } from "@/lib/utils";

type Props = {
  playlistId: string;
  width: number | string;
  height: number | string;
  className?: string;
};

function dimNumber(v: number | string, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

const API_INIT_MS = 12_000;

async function measureHostWidth(host: HTMLElement | null): Promise<number> {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  const w = host?.getBoundingClientRect().width ?? 0;
  return Math.max(260, Math.floor(w));
}

/**
 * Embed playlist Spotify via iFrame API (togglePlay da telecomando).
 * Misura la larghezza del contenitore dopo il layout (evita width 0 / display:none).
 * Se l’API non risponde in tempo, fallback a iframe statico.
 */
export function SpotifyEmbedControlled({ playlistId, width, height, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ownerRef = useRef(Symbol("spotify-embed"));
  const controllerRef = useRef<SpotifyEmbedController | null>(null);
  const [useStaticIframe, setUseStaticIframe] = useState(false);

  const hPx = dimNumber(height, 280);

  useLayoutEffect(() => {
    setUseStaticIframe(false);
  }, [playlistId]);

  useEffect(() => {
    const owner = ownerRef.current;
    const el = containerRef.current;
    const id = playlistId.trim();
    if (!el || !id) return;

    let cancelled = false;
    let settled = false;

    const failToStatic = () => {
      if (cancelled || settled) return;
      settled = true;
      unregisterSpotifyEmbedController(owner);
      const c = controllerRef.current;
      controllerRef.current = null;
      c?.destroy?.();
      setUseStaticIframe(true);
    };

    const t = window.setTimeout(() => {
      if (!cancelled && !controllerRef.current) failToStatic();
    }, API_INIT_MS);

    void (async () => {
      try {
        const IFrameAPI = await loadSpotifyIframeApi();
        if (cancelled || !containerRef.current) return;
        const wPx = await measureHostWidth(wrapRef.current);
        const wOpt = typeof width === "number" && Number.isFinite(width) ? width : wPx;
        const w = Math.max(260, wOpt);
        IFrameAPI.createController(
          containerRef.current,
          {
            uri: `spotify:playlist:${id}`,
            width: w,
            height: hPx,
          },
          (controller) => {
            if (cancelled) {
              controller.destroy?.();
              return;
            }
            settled = true;
            window.clearTimeout(t);
            controllerRef.current = controller;
            registerSpotifyEmbedController(owner, controller);
          }
        );
      } catch {
        window.clearTimeout(t);
        failToStatic();
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(t);
      unregisterSpotifyEmbedController(owner);
      const c = controllerRef.current;
      controllerRef.current = null;
      c?.destroy?.();
    };
  }, [playlistId, width, height, hPx, useStaticIframe]);

  if (useStaticIframe) {
    return (
      <div ref={wrapRef} className={cn("w-full", className)}>
        <iframe
          key={playlistId}
          title="Spotify"
          src={spotifyPlaylistEmbedSrc(playlistId)}
          width="100%"
          height={hPx}
          className="block w-full bg-black"
          style={{ border: 0, minHeight: hPx }}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={cn("w-full", className)}>
      <div ref={containerRef} className="min-h-[220px] w-full bg-black" style={{ minHeight: hPx }} />
    </div>
  );
}
