"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { SESSION_LIVE_CHARACTER_TABLE, type SessionLiveProjection } from "../../../mobile/src/lib/session-live";

export function useSessionLiveCharacter(characterId: string, onEnd: () => void) {
  const [row, setRow] = useState<SessionLiveProjection | null>(null);
  const [stale, setStale] = useState(false);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useEffect(() => {
    const db = createSupabaseBrowserClient();
    let open = true;
    let request = 0;
    let wasLive = false;
    const refresh = async () => {
      const revision = ++request;
      const { data, error } = await db.from(SESSION_LIVE_CHARACTER_TABLE).select("character_id,active,resources")
        .eq("character_id", characterId).eq("active", true).maybeSingle();
      if (!open || revision !== request) return;
      if (error) {
        setStale(true);
        return;
      }
      setRow(data as SessionLiveProjection | null);
      setStale(false);
      if (!data && wasLive) onEndRef.current();
      wasLive = Boolean(data);
    };
    const filter = { schema: "public", table: SESSION_LIVE_CHARACTER_TABLE, filter: `character_id=eq.${characterId}` };
    const channel = db.channel(`session-live-web-sheet:${characterId}`)
      .on("postgres_changes", { ...filter, event: "INSERT" }, () => void refresh())
      .on("postgres_changes", { ...filter, event: "UPDATE" }, () => void refresh())
      .subscribe((status) => {
        if (!open) return;
        if (status === "SUBSCRIBED") void refresh();
        else if (status !== "CLOSED") setStale(true);
      });
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    // Revocation prevents the player from receiving the subsequent row change.
    const poll = window.setInterval(onVisible, 15_000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    void refresh();
    return () => {
      open = false;
      window.clearInterval(poll);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      void db.removeChannel(channel);
    };
  }, [characterId]);

  return { resources: row?.character_id === characterId ? row.resources : null, stale };
}
