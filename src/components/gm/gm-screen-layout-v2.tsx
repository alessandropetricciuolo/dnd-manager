"use client";

import type { CampaignType } from "@/lib/campaign-type";
import { isLongCampaignType, isTorneoCampaignType } from "@/lib/campaign-type";
import { GmScreenLegacyLayoutV2 } from "./gm-screen-legacy-layout-v2";
import { GmScreenLongLayoutV2 } from "./gm-screen-long-layout-v2";
import { GmScreenTorneoLayout } from "./gm-screen-torneo-layout";

type GmScreenLayoutV2Props = {
  campaignId: string;
  campaignType?: CampaignType | null;
  currentUserId: string;
  initialSessionId?: string | null;
  autoOpenDebrief?: boolean;
};

/** GM Screen 2.0 — griglia modulare (Long/Legacy). Torneo riusa lo shell dedicato. */
export function GmScreenLayoutV2({
  campaignId,
  campaignType,
  currentUserId,
  initialSessionId,
  autoOpenDebrief,
}: GmScreenLayoutV2Props) {
  if (isLongCampaignType(campaignType)) {
    return (
      <GmScreenLongLayoutV2
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
    <GmScreenLegacyLayoutV2
      campaignId={campaignId}
      campaignType={campaignType}
      currentUserId={currentUserId}
      initialSessionId={initialSessionId}
      autoOpenDebrief={autoOpenDebrief}
    />
  );
}
