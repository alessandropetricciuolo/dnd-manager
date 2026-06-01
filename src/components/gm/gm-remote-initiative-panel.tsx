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
  /** Incontro torneo: snapshot da match-state invece che sessione globale. */
  focusedMatchId?: string | null;
  commandPayload?: (base?: Record<string, unknown>) => Record<string, unknown>;
  /** Torneo: solo controlli initiative tracker (niente timer locale). */
  torneoMode?: boolean;
};

function formatTurnElapsed(seconds: number): string {
  const s = Math.max(0, Math.trunc(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

async function fetchInitiativeSnapshot(
  publicId: string,
  token: string,
  matchId?: string | null
): Promise<InitiativeRemoteSnapshot | null> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (matchId) {
    const res = await fetch(`${origin}/api/gm-remote/${publicId}/match-state`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, match_id: matchId }),
    });
    const j = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      snapshot?: InitiativeRemoteSnapshot | null;
    };
    if (!res.ok || !j.ok) return null;
    return j.snapshot ?? null;
  }

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

export function GmRemoteInitiativePanel({
  publicId,
  token,
  sending,
  onSend,
  focusedMatchId,
  commandPayload,
  torneoMode = false,
}: Props) {
  const [snapshot, setSnapshot] = useState<InitiativeRemoteSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const sendCmd = useCallback(
    (type: string, base?: Record<string, unknown>) => {
      const payload = commandPayload ? commandPayload(base) : base;
      return onSend(type, payload);
    },
    [commandPayload, onSend]
  );

  const refresh = useCallback(async () => {
    const next = await fetchInitiativeSnapshot(publicId, token, focusedMatchId);
    setSnapshot(next);
    setLoading(false);
  }, [publicId, token, focusedMatchId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 1000);
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
          {snapshot.activeMatch ? (
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-violet-900/35 bg-zinc-950/60 p-2">
              <div className="text-center" style={{ borderLeft: `3px solid ${snapshot.activeMatch.teamA.color}` }}>
                <p className="truncate text-[10px] text-zinc-500">{snapshot.activeMatch.teamA.name}</p>
                <p className="text-lg font-bold tabular-nums text-orange-300">
                  {snapshot.activeMatch.teamA.damageTotal}
                </p>
              </div>
              <div className="text-center" style={{ borderLeft: `3px solid ${snapshot.activeMatch.teamB.color}` }}>
                <p className="truncate text-[10px] text-zinc-500">{snapshot.activeMatch.teamB.name}</p>
                <p className="text-lg font-bold tabular-nums text-orange-300">
                  {snapshot.activeMatch.teamB.damageTotal}
                </p>
              </div>
            </div>
          ) : null}

          <div className={cn("mb-4 rounded-lg border border-orange-800/30 bg-zinc-950/50 p-3 text-center", torneoMode ? "" : "grid grid-cols-2 gap-2")}>
            <div>
              <p className="text-[10px] uppercase text-zinc-500">Round</p>
              <p className="text-3xl font-bold tabular-nums text-orange-100">{snapshot.roundNumber}</p>
            </div>
            {!torneoMode ? (
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
            ) : null}
          </div>

          {activeEntry ? (
            <div className="mb-4 rounded-lg border border-amber-600/35 bg-amber-950/25 px-3 py-3 text-center">
              <p className="text-[10px] uppercase text-amber-200/70">In turno ora</p>
              <p className="truncate text-lg font-semibold text-amber-50">{activeEntry.name}</p>
              {activeEntry.teamName ? (
                <p className="truncate text-xs text-amber-200/60">{activeEntry.teamName}</p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="mb-4 h-16 w-full touch-manipulation bg-amber-700 text-lg text-white hover:bg-amber-600"
            disabled={sending}
            onClick={() => void sendCmd("initiative.next_turn")}
          >
            <SkipForward className="mr-2 h-6 w-6" />
            Prossimo turno
          </Button>

          {!torneoMode ? (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="h-14 touch-manipulation border-amber-700/50"
              disabled={sending}
              onClick={() => void sendCmd("initiative.toggle_timer")}
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
              onClick={() => void sendCmd("initiative.reset_turn_timer")}
            >
              Azzera timer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-10 touch-manipulation text-zinc-400"
              disabled={sending}
              onClick={() => void sendCmd("initiative.reset_round")}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset giro
            </Button>
          </div>
          ) : null}

          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Ordine · danni fatti e subiti
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
                      {entry.spellSlotsRemaining?.length ? (
                        <p className="text-[10px] text-violet-300/90">
                          Slot:{" "}
                          {entry.spellSlotsRemaining
                            .map((s) => `${s.count}×${s.level}°`)
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right text-[10px]">
                      <p className="text-orange-300">
                        Fatti <span className="text-sm font-bold tabular-nums">{entry.damageDealt}</span>
                      </p>
                      <p className="text-red-300/90">
                        Subiti <span className="text-sm font-bold tabular-nums">{entry.damageTaken ?? 0}</span>
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[9px] uppercase text-zinc-600">Danni fatti</p>
                  <div className="grid grid-cols-4 gap-1">
                    {([-5, -1, 1, 5] as const).map((delta) => (
                      <Button
                        key={`d-${delta}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 touch-manipulation border-orange-800/40 px-0 text-xs"
                        disabled={sending}
                        onClick={() =>
                          void sendCmd("initiative.adjust_damage", { entry_id: entry.id, delta })
                        }
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-[9px] uppercase text-zinc-600">Danni subiti</p>
                  <div className="grid grid-cols-4 gap-1">
                    {([-5, -1, 1, 5] as const).map((delta) => (
                      <Button
                        key={`t-${delta}`}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 touch-manipulation border-red-900/40 px-0 text-xs text-red-200/90"
                        disabled={sending}
                        onClick={() =>
                          void sendCmd("initiative.adjust_damage_taken", { entry_id: entry.id, delta })
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
