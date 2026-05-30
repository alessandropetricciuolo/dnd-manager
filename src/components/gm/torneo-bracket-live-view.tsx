"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { getTorneoSetupAction } from "@/app/campaigns/torneo-actions";
import { TorneoBracketBoard } from "@/components/gm/torneo-bracket-board";
import { TorneoTabelloneToolbar } from "@/components/gm/torneo-tabellone-toolbar";
import type { TorneoMatchWithTeams } from "@/lib/torneo/types";
import { cn } from "@/lib/utils";

type Props = {
  campaignId: string;
  initialMatches: TorneoMatchWithTeams[];
  variant?: "compact" | "display";
  showToolbar?: boolean;
  className?: string;
};

export function TorneoBracketLiveView({
  campaignId,
  initialMatches,
  variant = "display",
  showToolbar = true,
  className,
}: Props) {
  const [matches, setMatches] = useState(initialMatches);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const res = await getTorneoSetupAction(campaignId);
    if (res.success && res.data) setMatches(res.data.matches);
  }, [campaignId]);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`torneo-bracket-${campaignId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "torneo_matches",
            filter: `campaign_id=eq.${campaignId}`,
          },
          () => {
            setSyncing(true);
            void refresh().finally(() => setSyncing(false));
          }
        )
        .subscribe();
    })();

    const pollId = window.setInterval(() => void refresh(), 15_000);

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [campaignId, refresh]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {showToolbar ? (
        <div className="shrink-0 border-b border-violet-900/30 px-4 py-3">
          <TorneoTabelloneToolbar campaignId={campaignId} />
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-auto">
        {syncing ? (
          <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-violet-800/50 bg-zinc-950/90 px-3 py-1 text-[10px] text-violet-300">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aggiornamento…
          </div>
        ) : null}
        <TorneoBracketBoard matches={matches} variant={variant} className="min-h-full" />
      </div>
    </div>
  );
}
