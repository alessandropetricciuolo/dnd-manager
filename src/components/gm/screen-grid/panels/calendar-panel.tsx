"use client";

import { LongCalendarPanel } from "@/components/gm/long-calendar-panel";
import { useGmScreenLongStateOptional } from "@/components/gm/gm-screen-long-state";

export function CalendarPanel() {
  const long = useGmScreenLongStateOptional();
  if (!long) {
    return <p className="text-xs text-zinc-500">Calendario disponibile nelle campagne Long.</p>;
  }

  return (
    <LongCalendarPanel
      baseDate={long.calendarBaseDate}
      config={long.calendarConfig}
      elapsedHours={long.elapsedHours}
      onBaseDateChange={long.setCalendarBaseDate}
      onConfigChange={long.setCalendarConfig}
      onSave={long.saveCalendarSettings}
    />
  );
}
