"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listSpotifyPlaylistsForGmAction } from "@/app/campaigns/spotify-playlists-gm-actions";
import type { GmSpotifyPlaylistRow } from "@/lib/spotify/types";
import { spotifyPlaylistEmbedSrc } from "@/lib/spotify/playlist-id";
import { cn } from "@/lib/utils";

export function GmSpotifyPlayerPanel() {
  const [rows, setRows] = useState<GmSpotifyPlaylistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await listSpotifyPlaylistsForGmAction();
    setLoading(false);
    if (res.success) {
      setRows(res.data);
      setSelectedId((prev) => {
        if (prev && res.data.some((r) => r.id === prev)) return prev;
        return res.data[0]?.id ?? null;
      });
    } else {
      setErr(res.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.mood.toLowerCase().includes(q) ||
        r.spotify_playlist_id.toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Caricamento playlist…
      </div>
    );
  }

  if (err) {
    return <p className="text-sm text-red-400">{err}</p>;
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Nessuna playlist Spotify configurata. Chiedi a un admin di aggiungerle in Admin → Audio Gilda → tab Spotify.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-amber-700/50 text-amber-200"
            onClick={() => void load()}
          >
            Aggiorna
          </Button>
          <div className="min-w-0 flex-1 space-y-1">
            <Label className="text-[11px] text-zinc-500">Cerca</Label>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Titolo o mood…"
              className="border-amber-800/40 bg-zinc-950 text-sm"
            />
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-zinc-500">
          Player ufficiale Spotify (embed). Serve account Spotify e rispetto dei{" "}
          <a
            href="https://www.spotify.com/legal/end-user-agreement/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline-offset-2 hover:underline"
          >
            termini Spotify
          </a>
          .
        </p>
        <ul className="max-h-[min(40vh,16rem)] space-y-1 overflow-y-auto pr-1">
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  selectedId === r.id
                    ? "border-amber-400 bg-amber-600/20 text-amber-50"
                    : "border-amber-900/40 bg-zinc-900/50 text-zinc-300 hover:border-amber-700/50"
                )}
              >
                <Music2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/90" />
                <span className="min-w-0">
                  <span className="block font-medium">{r.title}</span>
                  <span className="block text-[11px] text-zinc-500">{r.mood || "— mood"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selected ? (
        <div className="w-full shrink-0 overflow-hidden rounded-xl border border-amber-800/40 bg-black/40 lg:w-[min(100%,400px)]">
          <iframe
            title={`Spotify: ${selected.title}`}
            src={spotifyPlaylistEmbedSrc(selected.spotify_playlist_id)}
            width="100%"
            height="380"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : null}
    </div>
  );
}
