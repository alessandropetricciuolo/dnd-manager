"use client";

import { useEffect, useRef } from "react";
import { publishGmRemoteSfxPadSnapshot } from "@/app/campaigns/gm-remote-actions";
import { toSfxPadRemoteSnapshot, type SfxPadRemoteSnapshot } from "@/lib/gm-remote/sfx-pad-snapshot";
import type { SfxPadConfig } from "@/lib/gm-audio-forge/types";

type Props = {
  campaignId: string;
  sessionPublicId: string | null;
  sfxPad: SfxPadConfig;
};

export function GmRemoteSfxPadPublisher({ campaignId, sessionPublicId, sfxPad }: Props) {
  const lastPublishedRef = useRef<string>("");

  useEffect(() => {
    if (!sessionPublicId) return;

    const snapshot: SfxPadRemoteSnapshot = toSfxPadRemoteSnapshot(sfxPad);
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastPublishedRef.current) return;

    const timer = window.setTimeout(() => {
      void publishGmRemoteSfxPadSnapshot(campaignId, sessionPublicId, snapshot).then((res) => {
        if (res.success) {
          lastPublishedRef.current = serialized;
        }
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [campaignId, sessionPublicId, sfxPad]);

  return null;
}
