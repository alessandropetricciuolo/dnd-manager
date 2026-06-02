"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { GmRemoteInitiativePanel } from "./gm-remote-initiative-panel";
import { cn } from "@/lib/utils";

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
    station1MatchId?: string | null;
    station2MatchId?: string | null;
    error?: string;
  };
  if (!res.ok || !j.ok || !Array.isArray(j.matches)) return null;
  return {
    matches: j.matches,
    focusedMatchId: j.focusedMatchId ?? null,
    station1MatchId: j.station1MatchId ?? null,
    station2MatchId: j.station2MatchId ?? null,
  };
}

function matchRowLabel(m: TorneoMatchRow): string {
  if (m.label) return m.label;
  if (m.matchKind === "triello") return `Triello · ${m.teamAName}`;
  return `${m.teamAName} vs ${m.teamBName}`;
}

function TorneoStationRemote({
  station,
  match,
  publicId,
  token,
  sending,
  onSend,
}: {
  station: 1 | 2;
  match: TorneoMatchRow | null;
  publicId: string;
  token: string;
  sending: boolean;
  onSend: (type: string, payload?: Record<string, unknown>) => Promise<void>;
}) {
  const commandPayload = useCallback(
    (base?: Record<string, unknown>) => ({
      ...base,
      match_id: match?.id,
    }),
    [match?.id]
  );

  if (!match) {
    return (
      <section
        className={cn(
          "rounded-xl border border-dashed p-4 text-center",
          station === 1 ? "border-violet-900/40 bg-zinc-900/30" : "border-amber-900/40 bg-zinc-900/30"
        )}
      >
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            station === 1 ? "text-violet-300/80" : "text-amber-300/80"
          )}
        >
          Tavolo {station}
        </p>
        <p className="mt-2 text-xs text-zinc-500">Nessun incontro caricato sul GM screen.</p>
      </section>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-lg border px-3 py-2 text-center",
          station === 1 ? "border-violet-800/50 bg-violet-950/25" : "border-amber-800/50 bg-amber-950/25"
        )}
      >
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-widest",
            station === 1 ? "text-violet-300/90" : "text-amber-300/90"
          )}
        >
          Tavolo {station} · Megatimer dedicato
        </p>
        <p className="mt-1 truncate text-sm font-medium text-zinc-100">{matchRowLabel(match)}</p>
        <p className="text-[10px] text-zinc-500">
          {match.status === "active" ? "In corso" : match.status === "completed" ? "Completato" : "In preparazione"}
        </p>
      </div>
      <GmRemoteInitiativePanel
        publicId={publicId}
        token={token}
        sending={sending}
        focusedMatchId={match.id}
        onSend={onSend}
        commandPayload={commandPayload}
        torneoMode
      />
    </div>
  );
}

export function GmRemoteTorneoPanel({ publicId, token, sending, onSend }: Props) {
  const [matches, setMatches] = useState<TorneoMatchRow[]>([]);
  const [station1MatchId, setStation1MatchId] = useState<string | null>(null);
  const [station2MatchId, setStation2MatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMeta = useCallback(async () => {
    const data = await fetchTorneoMatches(publicId, token);
    if (data) {
      setMatches(data.matches);
      setStation1MatchId(data.station1MatchId);
      setStation2MatchId(data.station2MatchId);
    }
    setLoading(false);
  }, [publicId, token]);

  useEffect(() => {
    void refreshMeta();
    const id = window.setInterval(() => void refreshMeta(), 2000);
    return () => window.clearInterval(id);
  }, [refreshMeta]);

  const station1Match = useMemo(
    () => (station1MatchId ? matches.find((m) => m.id === station1MatchId) ?? null : null),
    [matches, station1MatchId]
  );
  const station2Match = useMemo(
    () => (station2MatchId ? matches.find((m) => m.id === station2MatchId) ?? null : null),
    [matches, station2MatchId]
  );

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
      <p className="text-center text-[11px] text-zinc-500">
        Due tavoli indipendenti: ogni sezione controlla il proprio incontro e il proprio megatimer.
      </p>
      <TorneoStationRemote
        station={1}
        match={station1Match}
        publicId={publicId}
        token={token}
        sending={sending}
        onSend={onSend}
      />
      <TorneoStationRemote
        station={2}
        match={station2Match}
        publicId={publicId}
        token={token}
        sending={sending}
        onSend={onSend}
      />
    </div>
  );
}
