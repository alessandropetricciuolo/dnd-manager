"use client";

import { LongTimePanel } from "@/components/gm/long-time-panel";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";

export function TimePanel({ compact = true }: { compact?: boolean }) {
  const long = useGmScreenLongStateOptional();
  if (!long) {
    return <p className="text-xs text-zinc-500">Pannello tempo disponibile nelle campagne Long.</p>;
  }
  return <LongTimePanel elapsedHours={long.elapsedHours} onChange={long.setElapsedHours} compact={compact} />;
}
