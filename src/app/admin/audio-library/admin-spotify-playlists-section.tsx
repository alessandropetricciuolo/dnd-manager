"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createAdminSpotifyPlaylistAction,
  deleteAdminSpotifyPlaylistAction,
  listAdminSpotifyPlaylistsAction,
} from "@/app/admin/audio-library/spotify-playlists-actions";
import type { GmSpotifyPlaylistRow } from "@/lib/spotify/types";
import { spotifyPlaylistEmbedSrc } from "@/lib/spotify/playlist-id";

export function AdminSpotifyPlaylistsSection() {
  const [rows, setRows] = useState<GmSpotifyPlaylistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [mood, setMood] = useState("");
  const [url, setUrl] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listAdminSpotifyPlaylistsAction();
    setLoading(false);
    if (res.success) setRows(res.data);
    else toast.error(res.message);
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await createAdminSpotifyPlaylistAction({
        title: title.trim(),
        mood: mood.trim(),
        spotifyUrlOrUri: url,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Playlist aggiunta.");
      setTitle("");
      setMood("");
      setUrl("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Rimuovere questa playlist dall’elenco GM?")) return;
    const res = await deleteAdminSpotifyPlaylistAction(id);
    if (res.success) {
      toast.success("Rimossa.");
      await load();
    } else toast.error(res.message);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-xl text-barber-paper">Playlist Spotify</h2>
        <p className="mt-1 text-sm text-barber-paper/70">
          Incolla il link pubblico della playlist (da app o web). Nel GM Screen i master useranno il{" "}
          <strong className="text-barber-paper">player embed ufficiale</strong> di Spotify (account Spotify richiesto
          per la riproduzione, secondo i termini Spotify).
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="space-y-4 rounded-xl border border-barber-gold/25 bg-barber-dark/80 p-4"
      >
        <h3 className="text-sm font-semibold text-barber-gold">Nuova playlist</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sp-title">Titolo (come compare ai master)</Label>
            <Input
              id="sp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Combattimenti epici"
              className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-mood">Mood / tag</Label>
            <Input
              id="sp-mood"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="Es. battaglia, tensione"
              className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sp-url">Link o URI Spotify</Label>
            <Input
              id="sp-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://open.spotify.com/playlist/…"
              className="border-barber-gold/30 bg-barber-dark text-barber-paper"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={saving}
          className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salva playlist"}
        </Button>
      </form>

      <div className="space-y-3">
        <Label className="text-barber-paper/80">Cerca</Label>
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Titolo, mood o ID…"
          className="max-w-md border-barber-gold/30 bg-barber-dark text-barber-paper"
        />
        {loading ? (
          <div className="flex items-center gap-2 text-barber-paper/70">
            <Loader2 className="h-5 w-5 animate-spin" />
            Caricamento…
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-barber-paper/60">Nessuna playlist.</p>
        ) : (
          <ul className="divide-y divide-barber-gold/15 rounded-xl border border-barber-gold/20 bg-barber-dark/60">
            {filtered.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 px-3 py-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-barber-paper">{r.title}</p>
                  <p className="text-xs text-barber-paper/60">
                    Mood: {r.mood || "—"} · ID {r.spotify_playlist_id}
                  </p>
                </div>
                <div className="w-full max-w-md shrink-0 overflow-hidden rounded-lg border border-barber-gold/20">
                  <iframe
                    title={`Anteprima Spotify: ${r.title}`}
                    src={spotifyPlaylistEmbedSrc(r.spotify_playlist_id)}
                    width="100%"
                    height="152"
                    style={{ border: 0 }}
                    loading="lazy"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-red-800/50 text-red-300 hover:bg-red-950/30"
                  onClick={() => void handleDelete(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
