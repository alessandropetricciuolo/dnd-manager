"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { getTorneo2SetupAction } from "@/app/campaigns/torneo2-actions";
import { Torneo2Standings } from "@/components/gm/torneo2/torneo2-standings";
import type { Torneo2Setup } from "@/lib/torneo2/types";

type Props = {
  campaignId: string;
  initialSetup: Torneo2Setup;
};

export function Torneo2BoardClient({ campaignId, initialSetup }: Props) {
  const [setup, setSetup] = useState<Torneo2Setup>(initialSetup);

  const refresh = async () => {
    const res = await getTorneo2SetupAction(campaignId);
    if (res.success && res.data) setSetup(res.data);
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`torneo2-board-${campaignId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "torneo2_matches", filter: `campaign_id=eq.${campaignId}` },
          () => {
            void refresh();
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100">
      <Torneo2Standings campaignId={campaignId} setup={setup} className="mx-auto max-w-3xl" />
    </div>
  );
}
