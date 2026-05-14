/** URL path (same-origin) per riprodurre una traccia del catalogo Gilda via proxy GM. */
export function gmGlobalAudioPreviewPath(trackId: string): string {
  return `/api/gm-global-audio-preview?id=${encodeURIComponent(trackId)}`;
}
