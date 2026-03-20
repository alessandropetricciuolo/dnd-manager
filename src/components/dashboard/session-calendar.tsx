"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";
import { it } from "date-fns/locale";
import { formatSessionInRome, SESSION_DISPLAY_TIMEZONE } from "@/lib/session-datetime";
import { formatInTimeZone } from "date-fns-tz";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const CAMPAIGN_TYPE_COLORS: Record<string, string> = {
  oneshot: "bg-blue-500",
  quest: "bg-purple-500",
  long: "bg-orange-500",
};

const PLACEHOLDER_IMAGE = "https://placehold.co/80x48/1e293b/10b981/png?text=Campagna";

export type SessionForCalendar = {
  id: string;
  campaign_id: string;
  scheduled_at: string;
  title: string | null;
  campaign_name: string;
  campaign_type: "oneshot" | "quest" | "long" | null;
  campaign_image_url: string | null;
  dm_name: string | null;
  max_players: number;
  signup_count: number;
  status: string;
};

type SessionCalendarProps = {
  sessions: SessionForCalendar[];
};

function SessionHoverCard({
  session,
  children,
}: {
  session: SessionForCalendar;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    leaveTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, []);

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  const start = parseISO(session.scheduled_at);
  const endTime = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const timeFmt = "HH:mm";

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {open && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-1 w-64 -translate-x-1/2 rounded-lg border border-barber-gold/30 bg-barber-dark p-3 shadow-xl"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <div className="flex gap-2">
            {session.campaign_image_url && (
              <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-slate-800">
                <Image
                  src={session.campaign_image_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                  unoptimized
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-300">
                {session.campaign_name}
              </p>
              <p className="truncate text-sm font-semibold text-slate-50">
                {session.title || "Sessione"}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {formatSessionInRome(session.scheduled_at, timeFmt, { locale: it })} –{" "}
            {formatInTimeZone(endTime, SESSION_DISPLAY_TIMEZONE, timeFmt, { locale: it })}
          </p>
          {session.dm_name && (
            <p className="text-xs text-slate-400">DM: {session.dm_name}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {session.signup_count}/{session.max_players} posti
          </p>
          <Link
            href={`/campaigns/${session.campaign_id}`}
            className="mt-2 block text-center text-xs font-medium text-barber-gold hover:underline"
          >
            Vai alla campagna →
          </Link>
        </div>
      )}
    </div>
  );
}

export function SessionCalendar({ sessions }: SessionCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getSessionsForDay = (day: Date) =>
    sessions.filter((s) => {
      try {
        const sessionYmd = formatInTimeZone(s.scheduled_at, SESSION_DISPLAY_TIMEZONE, "yyyy-MM-dd");
        const cellYmd = formatInTimeZone(day, SESSION_DISPLAY_TIMEZONE, "yyyy-MM-dd");
        return sessionYmd === cellYmd;
      } catch {
        return false;
      }
    });

  return (
    <div className="w-full min-w-0 rounded-xl border border-barber-gold/40 bg-barber-dark/90 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-barber-gold/30 p-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-barber-paper">
          <CalendarIcon className="h-5 w-5 text-barber-gold" />
          Calendario sessioni
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-barber-paper/80 hover:bg-barber-gold/20 hover:text-barber-paper"
            onClick={() => setCurrentDate((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium text-slate-200">
            {format(currentDate, "MMMM yyyy", { locale: it })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-barber-paper/80 hover:bg-barber-gold/20 hover:text-barber-paper"
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-slate-400">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-px">
          {days.map((day) => {
            const daySessions = getSessionsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const firstSession = daySessions[0];
            const hasSessions = daySessions.length > 0;
            const typeColor =
              firstSession && (CAMPAIGN_TYPE_COLORS[firstSession.campaign_type ?? ""] ?? "bg-slate-500");

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "relative min-h-[72px] sm:min-h-[80px] rounded border border-barber-gold/20 bg-barber-dark/80 p-1",
                  !isCurrentMonth && "opacity-50",
                  hasSessions && "bg-barber-gold/20 sm:bg-transparent",
                  hasSessions && typeColor === "bg-blue-500" && "!bg-blue-500/30 sm:!bg-transparent",
                  hasSessions && typeColor === "bg-purple-500" && "!bg-purple-500/30 sm:!bg-transparent",
                  hasSessions && typeColor === "bg-orange-500" && "!bg-orange-500/30 sm:!bg-transparent",
                  hasSessions && typeColor === "bg-slate-500" && "!bg-slate-500/30 sm:!bg-transparent"
                )}
              >
                {hasSessions && firstSession && (
                  <Link
                    href={`/campaigns/${firstSession.campaign_id}`}
                    className="absolute inset-0 z-0 rounded border-0"
                    aria-label={`${daySessions.length} sessione/i il ${format(day, "d MMMM", { locale: it })}: ${firstSession.campaign_name}`}
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 inline-flex h-6 w-6 items-center justify-center rounded text-xs",
                    isDayToday && "bg-barber-gold/30 font-semibold text-barber-gold",
                    isCurrentMonth && !isDayToday && "text-slate-300",
                    !isCurrentMonth && "text-slate-500"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="relative z-10 mt-0.5 flex flex-col gap-0.5">
                  {daySessions.slice(0, 3).map((session) => {
                    const sessionTypeColor =
                      CAMPAIGN_TYPE_COLORS[session.campaign_type ?? ""] ?? "bg-slate-500";
                    return (
                      <SessionHoverCard key={session.id} session={session}>
                        <span
                          className={cn(
                            "block h-2 w-2 shrink-0 rounded-full sm:h-auto sm:w-full sm:truncate sm:rounded sm:px-1.5 sm:py-1 sm:text-[10px] sm:font-medium sm:text-white md:text-xs",
                            "max-sm:pointer-events-none",
                            sessionTypeColor
                          )}
                          title={`${session.campaign_name} – ${session.title || "Sessione"}`}
                        >
                          <span className="hidden sm:inline">
                            {session.title || session.campaign_name}
                          </span>
                        </span>
                      </SessionHoverCard>
                    );
                  })}
                  {daySessions.length > 3 && (
                    <span className="relative z-10 text-[10px] text-slate-500">
                      +{daySessions.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
