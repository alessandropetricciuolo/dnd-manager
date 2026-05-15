"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listSpotifyPlaylistsForGmAction } from "@/app/campaigns/spotify-playlists-gm-actions";
import type { GmSpotifyPlaylistRow } from "@/lib/spotify/types";
import { cn } from "@/lib/utils";

type Props = {
  /** ID playlist Spotify (non UUID riga DB): controlla l’embed sul GM screen. */
  spotifyEmbedPlaylistId: string | null;
  onSpotifyEmbedPlaylistIdChange: (spotifyPlaylistId: string) => void;
};

export function GmSpotifyPlayerPanel({ spotifyEmbedPlaylistId, onSpotifyEmbedPlaylistIdChange }: Props) {
  const [rows, setRows] = useState<GmSpotifyPlaylistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await listSpotifyPlaylistsForGmAction();
    setLoading(false);
    if (res.success) {
      setRows(res.data);
    } else {
      setErr(res.message);
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Allinea embed a una playlist valida dopo caricamento o se l’ID non è più in elenco. */
  useEffect(() => {
    if (rows.length === 0) return;
    const ok =
      spotifyEmbedPlaylistId &&
      rows.some((r) => r.spotify_playlist_id === spotifyEmbedPlaylistId);
    if (ok) return;
    const first = rows[0]?.spotify_playlist_id;
    if (first) onSpotifyEmbedPlaylistIdChange(first);
  }, [rows, spotifyEmbedPlaylistId, onSpotifyEmbedPlaylistIdChange]);

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
      <div className="space-y-2 text-sm text-zinc-500">
        <p>Nessuna playlist Spotify configurata.</p>
        <p className="text-xs text-zinc-400">
          Gli admin aggiungono playlist in{" "}
          <Link href="/admin/audio-library" className="text-amber-400 underline-offset-2 hover:underline">
            Admin → Libreria audio
          </Link>{" "}
          (tab Spotify).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
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
      <p className="text-xs text-zinc-500">
        Nuove playlist:{" "}
        <Link href="/admin/audio-library" className="text-amber-400 underline-offset-2 hover:underline">
          Admin → Libreria audio
        </Link>
        .
      </p>
      <ul className="max-h-36 space-y-1 overflow-y-auto pr-1">
        {filtered.map((r) => {
          const active = r.spotify_playlist_id === spotifyEmbedPlaylistId;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSpotifyEmbedPlaylistIdChange(r.spotify_playlist_id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  active
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
          );
        })}
      </ul>
    </div>
  );
}
