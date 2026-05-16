"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Swords,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { InitiativeRemoteSnapshot } from "@/lib/gm-remote/initiative-commands";

type Props = {
  publicId: string;
  token: string;
  sending: boolean;
  onSend: (type: string, payload?: Record<string, unknown>) => Promise<void>;
};

function formatTurnElapsed(seconds: number): string {
  const s = Math.max(0, Math.trunc(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

async function fetchInitiativeSnapshot(
  publicId: string,
  token: string
): Promise<InitiativeRemoteSnapshot | null> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${origin}/api/gm-remote/${publicId}/initiative-state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    snapshot?: InitiativeRemoteSnapshot | null;
  };
  if (!res.ok || !j.ok) return null;
  return j.snapshot ?? null;
}

export function GmRemoteInitiativePanel({ publicId, token, sending, onSend }: Props) {
  const [snapshot, setSnapshot] = useState<InitiativeRemoteSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await fetchInitiativeSnapshot(publicId, token);
    setSnapshot(next);
    setLoading(false);
  }, [publicId, token]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 1500);
    return () => window.clearInterval(id);
  }, [refresh]);

  const activeEntry =
    snapshot && snapshot.entries.length > 0
      ? snapshot.entries[snapshot.currentTurnIndex] ?? null
      : null;

  return (
    <section className="rounded-xl border border-orange-900/45 bg-zinc-900/50 p-4">
      <p className="mb-3 flex items-center justify-center gap-2 text-center text-xs font-medium uppercase tracking-wide text-orange-200/90">
        <Swords className="h-3.5 w-3.5" />
        Combattimento
      </p>

      {loading && !snapshot ? (
        <div className="flex justify-center py-8 text-zinc-400">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : !snapshot || snapshot.entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-zinc-500">
          Nessun combattimento attivo sul GM screen. Aggiungi partecipanti all&apos;initiative tracker.
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-orange-800/30 bg-zinc-950/50 p-3 text-center">
            <div>
              <p className="text-[10px] uppercase text-zinc-500">Giro</p>
              <p className="text-2xl font-bold tabular-nums text-orange-100">{snapshot.roundNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-zinc-500">Timer turno</p>
              <p className="flex items-center justify-center gap-1 text-xl font-mono tabular-nums text-amber-100">
                <Timer className="h-4 w-4 text-amber-400/80" />
                {formatTurnElapsed(snapshot.turnElapsedSeconds)}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {snapshot.isTurnTimerRunning ? "In corso" : "In pausa"}
              </p>
            </div>
          </div>

          {activeEntry ? (
            <div className="mb-3 rounded-lg border border-amber-600/35 bg-amber-950/25 px-3 py-2 text-center">
              <p className="text-[10px] uppercase text-amber-200/70">In turno</p>
              <p className="truncate text-sm font-semibold text-amber-50">{activeEntry.name}</p>
            </div>
          ) : null}

          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="lg"
              className="h-14 touch-manipulation bg-amber-700 text-white hover:bg-amber-600"
              disabled={sending}
              onClick={() => void onSend("initiative.next_turn")}
            >
              <SkipForward className="mr-2 h-5 w-5" />
              Turno
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-14 touch-manipulation border-amber-700/50"
              disabled={sending}
              onClick={() => void onSend("initiative.toggle_timer")}
            >
              {snapshot.isTurnTimerRunning ? (
                <Pause className="mr-2 h-5 w-5" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              {snapshot.isTurnTimerRunning ? "Pausa" : "Avvia"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-10 touch-manipulation text-zinc-400"
              disabled={sending}
              onClick={() => void onSend("initiative.reset_turn_timer")}
            >
              Azzera timer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-10 touch-manipulation text-zinc-400"
              disabled={sending}
              onClick={() => void onSend("initiative.reset_round")}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset giro
            </Button>
          </div>

          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Ordine e danni inflitti
          </p>
          <ul className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto pr-0.5">
            {snapshot.entries.map((entry, index) => {
              const isActive = index === snapshot.currentTurnIndex;
              return (
                <li
                  key={entry.id}
                  className={cn(
                    "rounded-lg border px-3 py-2.5",
                    isActive
                      ? "border-amber-500/50 bg-amber-950/30"
                      : "border-zinc-800 bg-zinc-950/40",
                    entry.isDead && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          entry.isDead ? "text-zinc-500 line-through" : "text-zinc-100"
                        )}
                      >
                        {entry.name}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Init {entry.initiative}
                        {entry.maxHp > 0
                          ? ` · HP ${entry.hp}/${entry.maxHp}`
                          : entry.hp > 0
                            ? ` · HP ${entry.hp}`
                            : ""}
                      </p>
                    </div>
                    <span className="shrink-0 rounded bg-orange-950/60 px-2 py-1 text-sm font-bold tabular-nums text-orange-300">
                      {entry.damageDealt}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    {([-5, -1, 1, 5] as const).map((delta) => (
                      <Button
                        key={delta}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 touch-manipulation border-orange-800/40 px-0 text-xs"
                        disabled={sending}
                        onClick={() =>
                          void onSend("initiative.adjust_damage", { entry_id: entry.id, delta })
                        }
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="mt-3 text-center text-[10px] text-zinc-600">
        Vista aggiornata dal GM screen · i comandi si applicano sul PC
      </p>
    </section>
  );
}
