"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

function matchRowLabel(m: TorneoMatchRow): string {
  if (m.label) return m.label;
  if (m.matchKind === "triello") return `Triello · ${m.teamAName}`;
  return `${m.teamAName} vs ${m.teamBName}`;
}

export function GmRemoteTorneoPanel({ publicId, token, sending, onSend }: Props) {
  const [matches, setMatches] = useState<TorneoMatchRow[]>([]);
  const [focusedMatchId, setFocusedMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    const id = window.setInterval(() => void refreshMeta(), 2000);
    return () => window.clearInterval(id);
  }, [refreshMeta]);

  const focusMatch = async (matchId: string) => {
    setFocusedMatchId(matchId);
    await onSend("torneo.focus_match", { match_id: matchId });
  };

  const withMatch = (payload: Record<string, unknown> = {}) => ({
    ...payload,
    match_id: focusedMatchId ?? undefined,
  });

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

      <GmRemoteInitiativePanel
        publicId={publicId}
        token={token}
        sending={sending}
        focusedMatchId={focusedMatchId}
        onSend={onSend}
        commandPayload={withMatch}
        torneoMode
      />
    </div>
  );
}
