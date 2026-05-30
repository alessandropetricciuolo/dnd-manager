"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { computeMatchTimerView, formatTimerMmSs } from "@/lib/torneo/match-timer";
import type { InitiativeRemoteSnapshot } from "@/lib/gm-remote/initiative-commands";
import { GmRemoteInitiativePanel } from "./gm-remote-initiative-panel";

type TorneoMatchRow = {
  id: string;
  label: string | null;
  status: string;
  teamAName: string;
  teamBName: string;
  bracketRound: number | null;
  matchKind: string;
};

type Props = {
  publicId: string;
  token: string;
  sending: boolean;
  onSend: (type: string, payload?: Record<string, unknown>) => Promise<void>;
};

async function fetchTorneoMatches(publicId: string, token: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${origin}/api/gm-remote/${publicId}/torneo-matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    matches?: TorneoMatchRow[];
    focusedMatchId?: string | null;
    error?: string;
  };
  if (!res.ok || !j.ok || !Array.isArray(j.matches)) return null;
  return { matches: j.matches, focusedMatchId: j.focusedMatchId ?? null };
}

async function fetchMatchState(publicId: string, token: string, matchId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${origin}/api/gm-remote/${publicId}/match-state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, match_id: matchId }),
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    snapshot?: InitiativeRemoteSnapshot | null;
    timer?: {
      timer_round_label: string | null;
      timer_duration_sec: number | null;
      timer_started_at: string | null;
      timer_paused_at: string | null;
    };
  };
  if (!res.ok || !j.ok) return null;
  return { snapshot: j.snapshot ?? null, timer: j.timer ?? null };
}

function matchRowLabel(m: TorneoMatchRow): string {
  if (m.label) return m.label;
  if (m.matchKind === "triello") return `Triello · ${m.teamAName}`;
  return `${m.teamAName} vs ${m.teamBName}`;
}

export function GmRemoteTorneoPanel({ publicId, token, sending, onSend }: Props) {
  const [matches, setMatches] = useState<TorneoMatchRow[]>([]);
  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);
  const [timerFields, setTimerFields] = useState<{
    timer_round_label: string | null;
    timer_duration_sec: number | null;
    timer_started_at: string | null;
    timer_paused_at: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const refreshMeta = useCallback(async () => {
    const data = await fetchTorneoMatches(publicId, token);
    if (data) {
      setMatches(data.matches);
      setFocusedMatchId((prev) => data.focusedMatchId ?? prev ?? data.matches[0]?.id ?? null);
    }
    setLoading(false);
  }, [publicId, token]);

  useEffect(() => {
    void refreshMeta();
    const id = window.setInterval(() => void refreshMeta(), 5000);
    return () => window.clearInterval(id);
  }, [refreshMeta]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!focusedMatchId) {
      setTimerFields(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const data = await fetchMatchState(publicId, token, focusedMatchId);
      if (cancelled || !data?.timer) return;
      setTimerFields(data.timer);
    })();
    const id = window.setInterval(() => {
      void fetchMatchState(publicId, token, focusedMatchId).then((data) => {
        if (!cancelled && data?.timer) setTimerFields(data.timer);
      });
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [publicId, token, focusedMatchId]);

  const focusMatch = async (matchId: string) => {
    setFocusedMatchId(matchId);
    await onSend("torneo.focus_match", { match_id: matchId });
  };

  const withMatch = (payload: Record<string, unknown> = {}) => ({
    ...payload,
    match_id: focusedMatchId ?? undefined,
  });

  const timerView = timerFields ? computeMatchTimerView(timerFields, now) : null;

  if (loading) {
    return (
      <div className="flex justify-center py-8 text-zinc-400">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-violet-900/45 bg-zinc-900/50 p-4">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-violet-300/90">
          Incontro controllato
        </p>
        <ul className="max-h-40 space-y-1.5 overflow-y-auto">
          {matches.map((m) => {
            const active = m.id === focusedMatchId;
            return (
              <li key={m.id}>
                <Button
                  type="button"
                  variant={active ? "default" : "outline"}
                  className={cn(
                    "h-auto min-h-10 w-full touch-manipulation flex-col items-start gap-0 py-2 text-left",
                    active && "bg-violet-700 hover:bg-violet-600"
                  )}
                  disabled={sending}
                  onClick={() => void focusMatch(m.id)}
                >
                  <span className="w-full truncate text-sm">{matchRowLabel(m)}</span>
                  <span className="w-full truncate text-[10px] opacity-70">
                    {m.status === "active" ? "In corso" : m.status === "completed" ? "Completato" : "In attesa"}
                  </span>
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      {focusedMatchId && timerView ? (
        <section className="rounded-xl border border-amber-900/40 bg-zinc-900/50 p-4">
          <p className="mb-2 flex items-center justify-center gap-2 text-center text-xs font-medium uppercase tracking-wide text-amber-200/90">
            <Timer className="h-3.5 w-3.5" />
            Megatimer incontro
          </p>
          <p className="text-center font-mono text-3xl font-bold tabular-nums text-amber-100">
            {formatTimerMmSs(timerView.remainingSec)}
          </p>
          <p className="mt-1 text-center text-[10px] text-zinc-500">{timerView.roundLabel}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              className="h-11 touch-manipulation"
              disabled={sending}
              onClick={() => void onSend("torneo.timer_start", withMatch({ duration_sec: 300, round_label: "Round 1" }))}
            >
              <Play className="mr-1.5 h-4 w-4" />
              Avvia 5m
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-11 touch-manipulation"
              disabled={sending}
              onClick={() => void onSend("torneo.timer_pause", withMatch())}
            >
              <Pause className="mr-1.5 h-4 w-4" />
              Pausa
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-10 col-span-2 touch-manipulation"
              disabled={sending}
              onClick={() => void onSend("torneo.timer_reset", withMatch({ duration_sec: 300, round_label: "Round 1" }))}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset timer
            </Button>
          </div>
        </section>
      ) : null}

      <GmRemoteInitiativePanel
        publicId={publicId}
        token={token}
        sending={sending}
        focusedMatchId={focusedMatchId}
        onSend={onSend}
        commandPayload={withMatch}
      />
    </div>
  );
}
