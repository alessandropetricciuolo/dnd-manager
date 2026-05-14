/**
 * Estrae l'ID playlist da URL web o URI spotify:.
 * Esempi: https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd?si=...
 *         https://open.spotify.com/intl-it/playlist/37i9dQZF1DX0XUsuxWHRQd
 *         spotify:playlist:37i9dQZF1DX0XUsuxWHRQd
 */
export function extractSpotifyPlaylistId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const uriMatch = /^spotify:playlist:([a-zA-Z0-9]+)$/i.exec(raw);
  if (uriMatch?.[1]) return uriMatch[1];

  try {
    const u = new URL(raw, "https://open.spotify.com");
    const path = u.pathname;
    const webMatch = /\/(?:intl-[a-z]{2}\/)?playlist\/([a-zA-Z0-9]+)/i.exec(path);
    if (webMatch?.[1]) return webMatch[1];
  } catch {
    return null;
  }

  return null;
}

export function spotifyPlaylistEmbedSrc(playlistId: string): string {
  const id = playlistId.trim();
  const params = new URLSearchParams({
    utm_source: "generator",
    theme: "0",
  });
  return `https://open.spotify.com/embed/playlist/${encodeURIComponent(id)}?${params.toString()}`;
}
