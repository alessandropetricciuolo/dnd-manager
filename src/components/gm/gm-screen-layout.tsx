"use client";

import type { CampaignType } from "@/lib/campaign-type";
import { isLongCampaignType, isTorneoCampaignType } from "@/lib/campaign-type";
import { GmScreenLegacyLayout } from "./gm-screen-legacy-layout";
import { GmScreenLongLayout } from "./gm-screen-long-layout";
import { GmScreenTorneoLayout } from "./gm-screen-torneo-layout";

type GmScreenLayoutProps = {
  campaignId: string;
  campaignType?: CampaignType | null;
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
  if (isLongCampaignType(campaignType)) {
    return (
      <GmScreenLongLayout
        campaignId={campaignId}
        currentUserId={currentUserId}
        initialSessionId={initialSessionId}
        autoOpenDebrief={autoOpenDebrief}
      />
    );
  }

  if (isTorneoCampaignType(campaignType)) {
    return (
      <GmScreenTorneoLayout
        campaignId={campaignId}
        currentUserId={currentUserId}
        initialSessionId={initialSessionId}
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
