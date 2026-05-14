"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
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

export function GmRemoteJoinClient({ publicId }: Props) {
  const [linkState, setLinkState] = useState<"loading" | "bad" | "ok">("loading");
  const [token, setToken] = useState<string | null>(null);
  const [musicVolPct, setMusicVolPct] = useState(75);
  const [muted, setMuted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.startsWith("#t=")) {
      setLinkState("bad");
      return;
    }
    setToken(decodeURIComponent(hash.slice(3)));
    setLinkState("ok");
  }, []);

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

      <section className="mx-auto max-w-md space-y-4">
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
            Play / Pause
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
