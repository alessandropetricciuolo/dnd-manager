import type { Json } from "@/types/database.types";
import {
  DEFAULT_FANTASY_BASE_DATE,
  DEFAULT_FANTASY_CALENDAR_CONFIG,
  deriveCharacterCalendarDate,
  normalizeFantasyCalendarConfig,
  normalizeFantasyCalendarDate,
  toCalendarDateJson,
} from "@/lib/long-calendar";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

type Admin = ReturnType<typeof createSupabaseAdminClient>;

export type SessionHourUpdate = {
  character_id: string;
  expected_hours: number;
  next_hours: number;
  calendar_current_date: Json;
};

export async function buildSessionHourPlan(
  admin: Admin,
  campaignId: string,
  attendance: Record<string, "attended" | "absent">,
  elapsedHours: number
): Promise<{ updates: SessionHourUpdate[]; calendarConfig: Json | null; calendarBaseDate: Json | null }> {
  const hours = Math.max(0, Math.floor(elapsedHours));
  const presentIds = Object.entries(attendance)
    .filter(([, status]) => status === "attended")
    .map(([id]) => id);
  if (hours === 0 || presentIds.length === 0) {
    return { updates: [], calendarConfig: null, calendarBaseDate: null };
  }

  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("long_calendar_config,long_calendar_base_date")
    .eq("id", campaignId)
    .single();
  if (campaignError || !campaign) throw new Error("Calendario della campagna non leggibile.");
  const { data: characters, error: charactersError } = await admin
    .from("campaign_characters")
    .select("id,time_offset_hours,calendar_anchor_date,calendar_anchor_hours")
    .eq("campaign_id", campaignId)
    .in("assigned_to", presentIds);
  if (charactersError) throw new Error("Ore dei personaggi non leggibili.");

  const calendar = campaign as unknown as {
    long_calendar_config: Json | null;
    long_calendar_base_date: Json | null;
  };
  const characterRows = (characters ?? []) as unknown as Array<{
    id: string;
    time_offset_hours: number | null;
    calendar_anchor_date: Json | null;
    calendar_anchor_hours: number | null;
  }>;

  const config = normalizeFantasyCalendarConfig(calendar.long_calendar_config ?? DEFAULT_FANTASY_CALENDAR_CONFIG);
  const baseDate = normalizeFantasyCalendarDate(calendar.long_calendar_base_date ?? DEFAULT_FANTASY_BASE_DATE, config);
  const updates = characterRows.map((character) => {
    const expectedHours = character.time_offset_hours ?? 0;
    const nextHours = expectedHours + hours;
    const anchorDate = character.calendar_anchor_date
      ? normalizeFantasyCalendarDate(character.calendar_anchor_date, config)
      : null;
    const calendarDate = deriveCharacterCalendarDate({
      campaignBaseDate: baseDate,
      characterHours: nextHours,
      config,
      anchorDate,
      anchorHours: character.calendar_anchor_hours,
    });
    return {
      character_id: character.id,
      expected_hours: expectedHours,
      next_hours: nextHours,
      calendar_current_date: toCalendarDateJson(calendarDate),
    };
  });
  return {
    updates,
    calendarConfig: calendar.long_calendar_config,
    calendarBaseDate: calendar.long_calendar_base_date,
  };
}
