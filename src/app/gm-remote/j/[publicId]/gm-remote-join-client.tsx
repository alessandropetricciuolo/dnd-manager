"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Music2, Play, SkipBack, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Props = {
  publicId: string;
};

async function postCommand(
  publicId: string,
  token: string,
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${origin}/api/gm-remote/${publicId}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      command_id: crypto.randomUUID(),
      type,
      payload,
      issued_at: new Date().toISOString(),
      source: "remote" as const,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !j.ok) {
    throw new Error(j.error ?? `http_${res.status}`);
  }
}

type SpotifyPlaylistOpt = {
  id: string;
  title: string;
  mood: string | null;
  spotify_playlist_id: string;
};

type GlobalMusicOpt = {
  id: string;
  title: string;
  mood: string | null;
};

function remoteErrorMessage(code: string | undefined): string {
  switch (code) {
    case "session_expired":
    case "session_revoked":
      return "Sessione scaduta o revocata.";
    case "invalid_token":
      return "Token non valido.";
    case "session_not_found":
      return "Sessione non trovata.";
    case "rate_limited":
      return "Troppe richieste. Attendi un attimo.";
    case "load_failed":
      return "Errore server nel caricamento.";
    default:
      return "Impossibile caricare.";
  }
}

export function GmRemoteJoinClient({ publicId }: Props) {
  const [linkState, setLinkState] = useState<"loading" | "bad" | "ok">("loading");
  const [token, setToken] = useState<string | null>(null);
  const [musicVolPct, setMusicVolPct] = useState(75);
  const [muted, setMuted] = useState(false);
  const [sending, setSending] = useState(false);
  const [spotifyRows, setSpotifyRows] = useState<SpotifyPlaylistOpt[]>([]);
  const [spotifyLoading, setSpotifyLoading] = useState(false);
  const [spotifyLoadError, setSpotifyLoadError] = useState<string | null>(null);
  const [catalogRows, setCatalogRows] = useState<GlobalMusicOpt[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogLoadError, setCatalogLoadError] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#t=")) {
      setLinkState("bad");
      return;
    }
    setToken(decodeURIComponent(hash.slice(3)));
    setLinkState("ok");
  }, []);

  useEffect(() => {
    if (linkState !== "ok" || !token) return;
    let cancelled = false;
    setSpotifyLoadError(null);
    setCatalogLoadError(null);
    (async () => {
      setSpotifyLoading(true);
      setCatalogLoading(true);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      try {
        const [resPl, resCat] = await Promise.all([
          fetch(`${origin}/api/gm-remote/${publicId}/spotify-playlists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }),
          fetch(`${origin}/api/gm-remote/${publicId}/global-music-tracks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }),
        ]);
        const jPl = (await resPl.json().catch(() => ({}))) as {
          ok?: boolean;
          playlists?: SpotifyPlaylistOpt[];
          error?: string;
        };
        const jCat = (await resCat.json().catch(() => ({}))) as {
          ok?: boolean;
          tracks?: GlobalMusicOpt[];
          error?: string;
        };
        if (cancelled) return;
        if (resPl.ok && jPl.ok && Array.isArray(jPl.playlists)) setSpotifyRows(jPl.playlists);
        else setSpotifyLoadError(remoteErrorMessage(jPl.error));

        if (resCat.ok && jCat.ok && Array.isArray(jCat.tracks)) setCatalogRows(jCat.tracks);
        else setCatalogLoadError(remoteErrorMessage(jCat.error));
      } catch {
        if (!cancelled) {
          setSpotifyLoadError("Impossibile caricare le playlist.");
          setCatalogLoadError("Impossibile caricare il catalogo musica.");
        }
      } finally {
        if (!cancelled) {
          setSpotifyLoading(false);
          setCatalogLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkState, token, publicId]);

  const send = useCallback(
    async (type: string, payload: Record<string, unknown> = {}) => {
      if (!token) {
        toast.error("Link non valido (manca il token).");
        return;
      }
      setSending(true);
      try {
        await postCommand(publicId, token, type, payload);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "errore";
        if (msg === "rate_limited") toast.error("Troppi comandi. Attendi un attimo.");
        else if (msg === "session_expired" || msg === "session_revoked") toast.error("Sessione scaduta o revocata.");
        else if (msg === "invalid_token") toast.error("Token non valido.");
        else toast.error("Comando non inviato.");
      } finally {
        setSending(false);
      }
    },
    [publicId, token]
  );

  const padSlots = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  if (linkState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">Caricamento…</div>
    );
  }

  if (linkState === "bad" || !token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-200">
        <p className="text-lg font-medium text-amber-200">Link non valido</p>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          Apri il link completo generato dal GM screen (include <code className="text-amber-300/90">#t=…</code> dopo
          il QR o dalla copia).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-3 pb-8 pt-6 text-zinc-100">
      <header className="mb-6 text-center">
        <h1 className="text-lg font-semibold text-amber-200">Telecomando</h1>
        <p className="mt-1 text-xs text-zinc-500">Comandi verso il PC del GM · nessun audio su questo dispositivo</p>
      </header>

      <section className="mx-auto max-w-md space-y-4 pb-12">
        <div className="rounded-xl border border-amber-900/45 bg-zinc-900/50 p-4">
          <p className="mb-2 flex items-center justify-center gap-2 text-center text-xs font-medium uppercase tracking-wide text-amber-200/80">
            <Music2 className="h-3.5 w-3.5" />
            Controller Spotify (PC)
          </p>
          {spotifyLoading ? (
            <div className="flex justify-center py-6 text-zinc-400">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : spotifyLoadError ? (
            <p className="text-center text-xs text-red-400">{spotifyLoadError}</p>
          ) : spotifyRows.length === 0 ? (
            <p className="text-center text-xs text-zinc-500">
              Nessuna playlist Spotify in elenco (configurazione admin).
            </p>
          ) : (
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
              {spotifyRows.map((r) => (
                <Button
                  key={r.id}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 w-full touch-manipulation flex-col items-start gap-0 border-amber-800/40 py-2 text-left"
                  disabled={sending}
                  onClick={() =>
                    void send("audio.spotify_select_playlist", { spotify_playlist_id: r.spotify_playlist_id })
                  }
                >
                  <span className="w-full truncate text-sm text-zinc-100">{r.title}</span>
                  {r.mood ? <span className="w-full truncate text-[10px] text-zinc-500">{r.mood}</span> : null}
                </Button>
              ))}
            </div>
          )}
          <Button
            type="button"
            size="lg"
            className="mt-3 h-14 w-full touch-manipulation border border-amber-600/50 bg-amber-950/40 text-amber-100 hover:bg-amber-950/60"
            disabled={sending || spotifyRows.length === 0}
            onClick={() => void send("audio.spotify_toggle_play")}
          >
            <Play className="mr-2 h-5 w-5" />
            Play / Pause Spotify
          </Button>
          <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
            Stessi comandi del riquadro Spotify visibile in basso a destra sul GM screen. Non controlla la musica
            catalogo del mixer.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-900/35 bg-zinc-900/50 p-4">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
            Musica catalogo Gilda (sul PC)
          </p>
          {catalogLoading ? (
            <div className="flex justify-center py-6 text-zinc-400">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          ) : catalogLoadError ? (
            <p className="text-center text-xs text-red-400">{catalogLoadError}</p>
          ) : catalogRows.length === 0 ? (
            <p className="text-center text-xs text-zinc-500">Nessuna traccia musica nel catalogo globale.</p>
          ) : (
            <div className="max-h-52 space-y-1.5 overflow-y-auto pr-0.5">
              {catalogRows.map((r) => (
                <Button
                  key={r.id}
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 w-full touch-manipulation flex-col items-start gap-0 border-emerald-800/35 py-2 text-left"
                  disabled={sending}
                  onClick={() => void send("audio.music_play_global_catalog", { global_track_id: r.id })}
                >
                  <span className="w-full truncate text-sm text-zinc-100">{r.title}</span>
                  {r.mood ? <span className="w-full truncate text-[10px] text-zinc-500">{r.mood}</span> : null}
                </Button>
              ))}
            </div>
          )}
          <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
            Riproduzione sul canale musica del mixer (sul PC del GM).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 touch-manipulation"
            disabled={sending}
            onClick={() => void send("audio.music_play_pause")}
          >
            <Play className="mr-2 h-5 w-5" />
            Play / Pause mixer
          </Button>
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 touch-manipulation"
            disabled={sending}
            onClick={() => void send("audio.stop_all")}
          >
            <Square className="mr-2 h-5 w-5" />
            Stop tutto
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 border-amber-800/50 touch-manipulation"
            disabled={sending}
            onClick={() => void send("audio.music_prev")}
          >
            <SkipBack className="mr-2 h-5 w-5" />
            Prev
          </Button>
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-14 border-amber-800/50 touch-manipulation"
            disabled={sending}
            onClick={() => void send("audio.music_next")}
          >
            <SkipForward className="mr-2 h-5 w-5" />
            Next
          </Button>
        </div>

        <p className="mx-auto max-w-md text-center text-[10px] text-zinc-600">
          Prev / Next: solo la <strong className="font-medium text-zinc-500">musica del mixer</strong> (categorie
          Libreria). L&apos;API embed Spotify non espone salto brano da remoto.
        </p>

        <div className="rounded-xl border border-amber-900/40 bg-zinc-900/50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm text-amber-100/90">
            <span className="flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              Volume musica
            </span>
            <span>{musicVolPct}%</span>
          </div>
          <Slider
            value={[musicVolPct]}
            max={100}
            step={1}
            disabled={sending}
            onValueChange={(v) => setMusicVolPct(v[0] ?? 0)}
            className="py-2"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2 w-full border-amber-800/50"
            disabled={sending}
            onClick={() => void send("audio.music_master_volume", { value: musicVolPct / 100 })}
          >
            Invia volume al PC
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-amber-200/90"
            disabled={sending}
            onClick={() => {
              const next = !muted;
              setMuted(next);
              void send("audio.music_mute", { muted: next });
            }}
          >
            {muted ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}
            {muted ? "Ripristina volume (unmute)" : "Mute musica"}
          </Button>
        </div>

        <div>
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">Pad SFX (slot)</p>
          <div className="grid grid-cols-4 gap-2">
            {padSlots.map((i) => (
              <Button
                key={i}
                type="button"
                variant="outline"
                className="h-12 min-w-0 border-amber-800/40 px-0 text-sm touch-manipulation"
                disabled={sending}
                onClick={() => void send("audio.sfx_pad_slot", { slot_index: i })}
              >
                {i + 1}
              </Button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
