"use client";

import { useEffect, useState } from "react";
import { getLongCampaignCalendarState, saveLongCampaignCalendarBaseDate } from "@/app/campaigns/actions";
import { LongCalendarPanel } from "@/components/gm/long-calendar-panel";
import {
  DEFAULT_FANTASY_BASE_DATE,
  DEFAULT_FANTASY_CALENDAR_CONFIG,
  normalizeFantasyCalendarConfig,
  normalizeFantasyCalendarDate,
  type FantasyCalendarConfig,
  type FantasyCalendarDate,
} from "@/lib/long-calendar";

type LongCampaignCalendarSettingsProps = {
  campaignId: string;
};

export function LongCampaignCalendarSettings({ campaignId }: LongCampaignCalendarSettingsProps) {
  const [baseDate, setBaseDate] = useState<FantasyCalendarDate>(DEFAULT_FANTASY_BASE_DATE);
  const [config, setConfig] = useState<FantasyCalendarConfig>(DEFAULT_FANTASY_CALENDAR_CONFIG);

  useEffect(() => {
    let cancelled = false;
    getLongCampaignCalendarState(campaignId).then((result) => {
      if (cancelled || !result.success || !result.data) return;
      const normalizedConfig = normalizeFantasyCalendarConfig(result.data.config as never);
      setConfig(normalizedConfig);
      setBaseDate(normalizeFantasyCalendarDate(result.data.baseDate as never, normalizedConfig));
    });
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return (
    <LongCalendarPanel
      baseDate={baseDate}
      config={config}
      elapsedHours={0}
      onBaseDateChange={setBaseDate}
      onConfigChange={setConfig}
      onSave={() =>
        saveLongCampaignCalendarBaseDate(campaignId, {
          baseDate,
          months: config.months,
        })
      }
    />
  );
}
