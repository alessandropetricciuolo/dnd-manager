"use client";

import { SpotifyEmbedControlled } from "@/components/gm/spotify-embed-controlled";

type Props = {
  playlistId: string | null;
  /** Quando il foglio Audio è aperto il dock non monta l’embed: serve un host fuori schermo per l’iFrame API (telecomando). */
  active: boolean;
};

export function GmSpotifyEmbedHiddenHost({ playlistId, active }: Props) {
  if (!active || !playlistId?.trim()) return null;
  return (
    <div
      className="pointer-events-none fixed -left-[9999px] top-0 z-0 h-[320px] w-[400px] overflow-hidden opacity-0"
      aria-hidden
    >
      <SpotifyEmbedControlled playlistId={playlistId.trim()} width={400} height={300} />
    </div>
  );
}
