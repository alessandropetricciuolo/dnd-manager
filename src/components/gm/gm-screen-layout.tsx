"use client";

import { GmScreenLegacyLayout } from "./gm-screen-legacy-layout";
import { GmScreenLongLayout } from "./gm-screen-long-layout";

type GmScreenLayoutProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  currentUserId: string;
  initialSessionId?: string | null;
  autoOpenDebrief?: boolean;
};

export function GmScreenLayout({
  campaignId,
  campaignType,
  currentUserId,
  initialSessionId,
  autoOpenDebrief,
}: GmScreenLayoutProps) {
  if (campaignType === "long") {
    return (
      <GmScreenLongLayout
        campaignId={campaignId}
        currentUserId={currentUserId}
        initialSessionId={initialSessionId}
        autoOpenDebrief={autoOpenDebrief}
      />
    );
  }

  return (
    <GmScreenLegacyLayout
      campaignId={campaignId}
      campaignType={campaignType}
      currentUserId={currentUserId}
      initialSessionId={initialSessionId}
      autoOpenDebrief={autoOpenDebrief}
    />
  );
}
