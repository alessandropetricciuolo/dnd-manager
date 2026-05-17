"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSfxPadIconComponent } from "@/lib/gm-audio-forge/sfx-pad-icons";
import { createDefaultSfxPad } from "@/lib/gm-audio-forge/types";
import {
  parseSfxPadRemoteSnapshot,
  toSfxPadRemoteSnapshot,
  type SfxPadRemoteSnapshot,
} from "@/lib/gm-remote/sfx-pad-snapshot";
import { cn } from "@/lib/utils";

type Props = {
  publicId: string;
  token: string;
  sending: boolean;
  onSend: (type: string, payload?: Record<string, unknown>) => Promise<void>;
};

async function fetchSfxPadSnapshot(publicId: string, token: string): Promise<SfxPadRemoteSnapshot | null> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const res = await fetch(`${origin}/api/gm-remote/${publicId}/sfx-pad-state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    snapshot?: SfxPadRemoteSnapshot | null;
  };
  if (!res.ok || !j.ok) return null;
  return parseSfxPadRemoteSnapshot(j.snapshot ?? null);
}

export function GmRemoteSfxPadPanel({ publicId, token, sending, onSend }: Props) {
  const [snapshot, setSnapshot] = useState<SfxPadRemoteSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await fetchSfxPadSnapshot(publicId, token);
    setSnapshot(next);
    setLoading(false);
  }, [publicId, token]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const slots = useMemo(() => {
    if (snapshot?.slots?.length === 12) return snapshot.slots;
    return toSfxPadRemoteSnapshot(createDefaultSfxPad()).slots;
  }, [snapshot]);

  return (
    <div>
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">Pad SFX</p>
      {loading && !snapshot ? (
        <div className="flex justify-center py-6 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => {
            const Icon = getSfxPadIconComponent(slot.iconKey);
            return (
              <Button
                key={slot.slotIndex}
                type="button"
                variant="outline"
                title={slot.etichetta || `Tasto ${slot.slotIndex + 1}`}
                aria-label={slot.etichetta || `Effetto sonoro ${slot.slotIndex + 1}`}
                className={cn(
                  "h-14 min-w-0 touch-manipulation border-amber-800/45 bg-zinc-900/70 px-0 text-amber-100/90",
                  "hover:border-amber-600/50 hover:bg-zinc-800/80"
                )}
                disabled={sending}
                onClick={() => void onSend("audio.sfx_pad_slot", { slot_index: slot.slotIndex })}
              >
                <Icon className="h-7 w-7 shrink-0 text-amber-400" />
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
