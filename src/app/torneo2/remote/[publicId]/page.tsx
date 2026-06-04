"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  computeTorneo2TimerView,
  formatTorneo2Time,
  startTimerPatch,
  togglePauseTimerPatch,
  type Torneo2TimerState,
} from "@/lib/torneo2/timer";
import {
  sanitizeTorneo2CombatState,
  type Torneo2CombatState,
} from "@/lib/torneo2/combat-state";
import { cn } from "@/lib/utils";

type RemoteMatch = {
  matchId: string;
  station: number | null;
  label: string;
  status: string;
  seq: number;
  combat: Torneo2CombatState;
  timer: Torneo2TimerState;
};

const POLL_MS = 2000;

function getRemoteOrigin(): string {
  try {
    let id = sessionStorage.getItem("torneo2-remote-origin");
    if (!id) {
      id = `remote-${crypto.randomUUID().slice(0, 8)}`;
      sessionStorage.setItem("torneo2-remote-origin", id);
    }
    return id;
  } catch {
    return "remote";
  }
}

export default function Torneo2RemotePage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params?.publicId ?? "";
  const [token, setToken] = useState<string | null>(null);
  const [matches, setMatches] = useState<RemoteMatch[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const originRef = useRef<string>("");
  if (!originRef.current && typeof window !== "undefined") originRef.current = getRemoteOrigin();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    const m = hash.match(/t=([^&]+)/);
    if (m) setToken(decodeURIComponent(m[1]));
    else setError("Token mancante nel link.");
  }, []);

  const fetchState = useCallback(async () => {
    if (!token || !publicId) return;
    try {
      const res = await fetch(`/api/torneo2-remote/${publicId}/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Errore.");
        return;
      }
      setError(null);
      const list: RemoteMatch[] = (data.matches ?? []).map((m: RemoteMatch) => ({
        ...m,
        combat: sanitizeTorneo2CombatState(m.combat),
      }));
      setMatches(list);
      setActiveMatchId((prev) => prev ?? list[0]?.matchId ?? null);
    } catch {
      setError("Connessione non riuscita.");
    }
  }, [token, publicId]);

  useEffect(() => {
    if (!token) return;
    void fetchState();
    const id = window.setInterval(() => void fetchState(), POLL_MS);
    return () => window.clearInterval(id);
  }, [token, fetchState]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const active = useMemo(
    () => matches.find((m) => m.matchId === activeMatchId) ?? null,
    [matches, activeMatchId]
  );

  const sendCombat = useCallback(
    async (matchId: string, next: Torneo2CombatState) => {
      // Ottimistico
      setMatches((prev) => prev.map((m) => (m.matchId === matchId ? { ...m, combat: next } : m)));
      if (!token) return;
      await fetch(`/api/torneo2-remote/${publicId}/combat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, match_id: matchId, state: next, origin: originRef.current }),
      });
    },
    [token, publicId]
  );

  const sendTimer = useCallback(
    async (matchId: string, patch: Partial<Torneo2TimerState>) => {
      setMatches((prev) =>
        prev.map((m) => (m.matchId === matchId ? { ...m, timer: { ...m.timer, ...patch } } : m))
      );
      if (!token) return;
      await fetch(`/api/torneo2-remote/${publicId}/timer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, match_id: matchId, patch }),
      });
    },
    [token, publicId]
  );

  const advanceTurn = (dir: 1 | -1) => {
    if (!active || active.combat.combatants.length === 0) return;
    let idx = active.combat.currentTurnIndex + dir;
    let round = active.combat.roundNumber;
    if (idx >= active.combat.combatants.length) {
      idx = 0;
      round += 1;
    } else if (idx < 0) {
      idx = active.combat.combatants.length - 1;
      round = Math.max(1, round - 1);
    }
    void sendCombat(active.matchId, { ...active.combat, currentTurnIndex: idx, roundNumber: round });
  };

  const changeHp = (combatantId: string, delta: number) => {
    if (!active) return;
    const next = {
      ...active.combat,
      combatants: active.combat.combatants.map((c) =>
        c.id === combatantId
          ? {
              ...c,
              hp: Math.max(0, Math.min(c.maxHp > 0 ? c.maxHp : 9999, c.hp + delta)),
              damageTaken: delta < 0 ? c.damageTaken - delta : c.damageTaken,
            }
          : c
      ),
    };
    void sendCombat(active.matchId, next);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-center text-zinc-300">
        <p>{error}</p>
      </div>
    );
  }

  const view = active ? computeTorneo2TimerView(active.timer, now) : null;
  const current = active?.combat.combatants[active.combat.currentTurnIndex] ?? null;

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-zinc-950 p-4 text-zinc-100">
      <h1 className="text-center text-sm font-bold uppercase tracking-widest text-amber-400">
        Telecomando Torneo 2.0
      </h1>

      {matches.length > 1 ? (
        <div className="flex gap-2">
          {matches.map((m) => (
            <Button
              key={m.matchId}
              type="button"
              size="sm"
              variant={m.matchId === activeMatchId ? "default" : "outline"}
              className="h-9 flex-1 text-xs"
              onClick={() => setActiveMatchId(m.matchId)}
            >
              Tavolo {m.station ?? "?"}
            </Button>
          ))}
        </div>
      ) : null}

      {!active ? (
        <p className="mt-10 text-center text-sm text-zinc-500">
          Nessun incontro attivo. Avvia un incontro dalla console.
        </p>
      ) : (
        <>
          <p className="text-center text-base font-semibold">{active.label}</p>
          <p className="text-center text-xs text-zinc-500">Round {active.combat.roundNumber}</p>

          {/* Timer */}
          {active.timer.timer_mode !== "none" && view ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "text-6xl font-black tabular-nums",
                  view.expired ? "text-red-500" : view.running ? "text-amber-300" : "text-zinc-300"
                )}
              >
                {formatTorneo2Time(view.remainingSec)}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-16"
                  onClick={() =>
                    void sendTimer(
                      active.matchId,
                      togglePauseTimerPatch(active.timer, Date.now(), new Date().toISOString())
                    )
                  }
                >
                  {view.running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-16"
                  onClick={() =>
                    void sendTimer(
                      active.matchId,
                      startTimerPatch(`Turno ${active.combat.roundNumber}`, new Date().toISOString())
                    )
                  }
                >
                  <RotateCcw className="h-5 w-5" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* Turni */}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-14 flex-1 gap-1" onClick={() => advanceTurn(-1)}>
              <ChevronLeft className="h-5 w-5" /> Prec.
            </Button>
            <Button
              type="button"
              className="h-14 flex-1 gap-1 bg-amber-700 hover:bg-amber-600"
              onClick={() => advanceTurn(1)}
            >
              Turno succ. <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Combattente di turno */}
          {current ? (
            <div className="rounded-lg border border-amber-700/40 bg-amber-950/20 p-3">
              <p className="text-center text-lg font-bold">{current.name}</p>
              <p className="mb-2 text-center text-xs text-zinc-400">{current.teamName ?? ""}</p>
              <div className="flex items-center justify-center gap-2">
                <Button type="button" variant="outline" className="h-12 w-12" onClick={() => changeHp(current.id, -5)}>
                  <Minus className="h-5 w-5" />5
                </Button>
                <Button type="button" variant="outline" className="h-12 w-12" onClick={() => changeHp(current.id, -1)}>
                  <Minus className="h-5 w-5" />
                </Button>
                <span className="min-w-[5rem] text-center text-2xl font-bold tabular-nums">
                  {current.hp}/{current.maxHp}
                </span>
                <Button type="button" variant="outline" className="h-12 w-12" onClick={() => changeHp(current.id, 1)}>
                  <Plus className="h-5 w-5" />
                </Button>
                <Button type="button" variant="outline" className="h-12 w-12" onClick={() => changeHp(current.id, 5)}>
                  <Plus className="h-5 w-5" />5
                </Button>
              </div>
            </div>
          ) : null}

          {/* Lista combattenti */}
          <ul className="space-y-1">
            {active.combat.combatants.map((c, idx) => (
              <li
                key={c.id}
                className={cn(
                  "flex items-center gap-2 rounded px-2 py-1.5 text-sm",
                  idx === active.combat.currentTurnIndex ? "bg-amber-950/40" : "bg-zinc-900/60",
                  (c.isDead || c.hp <= 0) && "opacity-50"
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: c.teamColor ?? "#94a3b8" }}
                />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <Button type="button" size="sm" variant="outline" className="h-8 w-8 px-0" onClick={() => changeHp(c.id, -1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[3.5rem] text-center tabular-nums">
                  {c.hp}/{c.maxHp}
                </span>
                <Button type="button" size="sm" variant="outline" className="h-8 w-8 px-0" onClick={() => changeHp(c.id, 1)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
