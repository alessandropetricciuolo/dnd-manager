"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarOpenEventQuickActions } from "@/components/dashboard/calendar-open-event-quick-actions";
import { createOpenCalendarEvent, createSession } from "@/app/campaigns/actions";
import { toast } from "sonner";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

/**
 * Mappatura "metalli" coerente col brand:
 * - oneshot → bronzo (entry level, sessione singola)
 * - quest   → rosso barber (mid-tier, mini-storia)
 * - long    → oro barber (top-tier, esperienza completa con lore)
 *
 * Sostituisce blue/purple/orange (palette generica) con accenti che parlano
 * la lingua del brand e veicolano una progressione narrativa.
 */
const CAMPAIGN_TYPE_COLORS: Record<string, string> = {
  oneshot: "bg-amber-700",
  quest: "bg-barber-red",
  long: "bg-barber-gold",
};

const PLACEHOLDER_IMAGE = "https://placehold.co/80x48/1c1917/fbbf24/png?text=Campagna";
const ENABLE_DAY_DRAWER = process.env.NEXT_PUBLIC_DASHBOARD_CALENDAR_DAY_DRAWER !== "0";

export type SessionForCalendar = {
  id: string;
  campaign_id: string | null;
  scheduled_at: string;
  title: string | null;
  notes: string | null;
  dm_id: string | null;
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
  isGmOrAdmin?: boolean;
  gmAdminUsers?: { id: string; label: string }[];
  defaultDmId?: string | null;
  campaignOptions?: { id: string; name: string }[];
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
          {session.campaign_id ? (
            <Link
              href={`/campaigns/${session.campaign_id}`}
              className="mt-2 block text-center text-xs font-medium text-barber-gold hover:underline"
            >
              Vai alla campagna →
            </Link>
          ) : (
            <p className="mt-2 text-center text-xs text-slate-500">
              Campagna da assegnare · iscriviti dalla dashboard
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionCalendar({
  sessions,
  isGmOrAdmin = false,
  gmAdminUsers = [],
  defaultDmId = null,
  campaignOptions = [],
}: SessionCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [createMode, setCreateMode] = useState<"open" | "campaign" | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createDmId, setCreateDmId] = useState<string>(defaultDmId ?? "");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  useEffect(() => {
    if (selectedDay) {
      setCreateMode(null);
      setIsCreating(false);
      setCreateDmId(defaultDmId ?? "");
      setSelectedCampaignId("");
    }
  }, [selectedDay, defaultDmId]);

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

  const selectedDaySessions = selectedDay ? getSessionsForDay(selectedDay) : [];
  const selectedDayLabel = selectedDay ? format(selectedDay, "EEEE d MMMM", { locale: it }) : "";

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
                {!ENABLE_DAY_DRAWER && hasSessions && firstSession && firstSession.campaign_id && (
                  <Link
                    href={`/campaigns/${firstSession.campaign_id}`}
                    className="absolute inset-0 z-0 rounded border-0"
                    aria-label={`${daySessions.length} sessione/i il ${format(day, "d MMMM", { locale: it })}: ${firstSession.campaign_name}`}
                  />
                )}
                {ENABLE_DAY_DRAWER && (hasSessions || isGmOrAdmin) && (
                  <button
                    type="button"
                    className="absolute inset-0 z-0 rounded border-0"
                    onClick={() => setSelectedDay(day)}
                    aria-label={`Apri sessioni del ${format(day, "d MMMM", { locale: it })}`}
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

      <Sheet open={selectedDay != null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <SheetContent side="right" className="w-full border-barber-gold/30 bg-barber-dark text-barber-paper sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-barber-paper">
              Sessioni del giorno
            </SheetTitle>
            <p className="text-sm text-slate-300">{selectedDayLabel}</p>
          </SheetHeader>
          {isGmOrAdmin && selectedDay ? (
            <div className="mt-4 rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-barber-gold/90">
                Crea dal calendario
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={createMode === "open" ? "default" : "outline"}
                  className={cn(
                    createMode === "open"
                      ? "bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                      : "border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
                  )}
                  onClick={() => setCreateMode("open")}
                  disabled={isCreating}
                >
                  Evento senza campagna
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={createMode === "campaign" ? "default" : "outline"}
                  className={cn(
                    createMode === "campaign"
                      ? "bg-barber-red text-barber-paper hover:bg-barber-red/90"
                      : "border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
                  )}
                  onClick={() => setCreateMode("campaign")}
                  disabled={isCreating}
                >
                  Sessione di campagna
                </Button>
              </div>

              {createMode === "open" ? (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedDay || isCreating) return;
                    const fd = new FormData(e.currentTarget);
                    fd.set("date", format(selectedDay, "yyyy-MM-dd"));
                    if (createDmId) fd.set("dm_id", createDmId);
                    setIsCreating(true);
                    try {
                      const res = await createOpenCalendarEvent(fd);
                      if (res.success) {
                        toast.success(res.message);
                        setCreateMode(null);
                        (e.currentTarget as HTMLFormElement).reset();
                        router.refresh();
                      } else {
                        toast.error(res.message);
                      }
                    } catch {
                      toast.error("Errore durante la creazione evento.");
                    } finally {
                      setIsCreating(false);
                    }
                  }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="day-create-open-time" className="text-xs text-barber-paper/80">Orario</Label>
                      <Input
                        id="day-create-open-time"
                        name="time"
                        type="time"
                        defaultValue="20:00"
                        className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper"
                        disabled={isCreating}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="day-create-open-max" className="text-xs text-barber-paper/80">Max</Label>
                      <Input
                        id="day-create-open-max"
                        name="max_players"
                        type="number"
                        min={1}
                        max={20}
                        defaultValue={6}
                        className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <Input
                    name="title"
                    placeholder="Titolo (opzionale)"
                    className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper"
                    disabled={isCreating}
                  />
                  <Input
                    name="location"
                    placeholder="Luogo / note (opzionale)"
                    className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper"
                    disabled={isCreating}
                  />
                  {gmAdminUsers.length > 0 ? (
                    <Select value={createDmId || undefined} onValueChange={setCreateDmId} disabled={isCreating}>
                      <SelectTrigger className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper">
                        <SelectValue placeholder="Dungeon Master" />
                      </SelectTrigger>
                      <SelectContent className="border-barber-gold/30 bg-barber-dark">
                        {gmAdminUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-barber-paper">
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                    disabled={isCreating}
                  >
                    {isCreating ? "Creazione..." : "Crea evento"}
                  </Button>
                </form>
              ) : null}

              {createMode === "campaign" ? (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedDay || isCreating) return;
                    if (!selectedCampaignId) {
                      toast.error("Seleziona una campagna.");
                      return;
                    }
                    const fd = new FormData(e.currentTarget);
                    fd.set("date", format(selectedDay, "yyyy-MM-dd"));
                    if (createDmId) fd.set("dm_id", createDmId);
                    setIsCreating(true);
                    try {
                      const res = await createSession(selectedCampaignId, fd);
                      if (res.success) {
                        toast.success(res.message);
                        setCreateMode(null);
                        setSelectedCampaignId("");
                        (e.currentTarget as HTMLFormElement).reset();
                        router.refresh();
                      } else {
                        toast.error(res.message);
                      }
                    } catch {
                      toast.error("Errore durante la creazione sessione.");
                    } finally {
                      setIsCreating(false);
                    }
                  }}
                >
                  <Select value={selectedCampaignId || undefined} onValueChange={setSelectedCampaignId} disabled={isCreating}>
                    <SelectTrigger className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper">
                      <SelectValue placeholder="Scegli campagna" />
                    </SelectTrigger>
                    <SelectContent className="border-barber-gold/30 bg-barber-dark">
                      {campaignOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-barber-paper">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="day-create-campaign-time" className="text-xs text-barber-paper/80">Orario</Label>
                      <Input
                        id="day-create-campaign-time"
                        name="time"
                        type="time"
                        defaultValue="20:00"
                        className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper"
                        disabled={isCreating}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="day-create-campaign-max" className="text-xs text-barber-paper/80">Max</Label>
                      <Input
                        id="day-create-campaign-max"
                        name="max_players"
                        type="number"
                        min={1}
                        max={20}
                        defaultValue={6}
                        className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <Input
                    name="location"
                    placeholder="Luogo / note (opzionale)"
                    className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper"
                    disabled={isCreating}
                  />
                  {gmAdminUsers.length > 0 ? (
                    <Select value={createDmId || undefined} onValueChange={setCreateDmId} disabled={isCreating}>
                      <SelectTrigger className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper">
                        <SelectValue placeholder="Dungeon Master" />
                      </SelectTrigger>
                      <SelectContent className="border-barber-gold/30 bg-barber-dark">
                        {gmAdminUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-barber-paper">
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  {campaignOptions.length === 0 ? (
                    <p className="text-xs text-amber-200/80">
                      Nessuna campagna disponibile: crea o assegna una campagna prima di pianificare sessioni.
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full bg-barber-red text-barber-paper hover:bg-barber-red/90"
                    disabled={isCreating || campaignOptions.length === 0}
                  >
                    {isCreating ? "Creazione..." : "Crea sessione"}
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 space-y-3">
            {selectedDaySessions.length === 0 ? (
              <p className="text-sm text-slate-400">Nessuna sessione pianificata.</p>
            ) : (
              selectedDaySessions.map((session) => (
                <div key={session.id}>
                  {session.campaign_id ? (
                    <Link
                      href={`/campaigns/${session.campaign_id}`}
                      className="block rounded-lg border border-barber-gold/20 bg-barber-dark/70 p-3 hover:bg-barber-gold/10"
                      onClick={() => setSelectedDay(null)}
                    >
                      <p className="text-xs text-slate-400">{session.campaign_name}</p>
                      <p className="mt-0.5 text-sm font-semibold text-barber-paper">
                        {session.title || "Sessione"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatSessionInRome(session.scheduled_at, "HH:mm", { locale: it })} · {session.signup_count}/{session.max_players} posti
                      </p>
                    </Link>
                  ) : (
                    <div className="rounded-lg border border-barber-gold/20 bg-barber-dark/70 p-3">
                      <p className="text-xs text-amber-200/90">{session.campaign_name}</p>
                      <p className="mt-0.5 text-sm font-semibold text-barber-paper">
                        {session.title || "Sessione"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatSessionInRome(session.scheduled_at, "HH:mm", { locale: it })} · {session.signup_count}/{session.max_players} posti
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Iscrizione da &quot;Sessioni disponibili&quot; sotto nel dashboard.
                      </p>
                      {isGmOrAdmin ? (
                        <CalendarOpenEventQuickActions
                          session={{
                            id: session.id,
                            title: session.title,
                            scheduled_at: session.scheduled_at,
                            notes: session.notes,
                            signup_count: session.signup_count,
                            max_players: session.max_players,
                            dm_id: session.dm_id,
                          }}
                          gmAdminUsers={gmAdminUsers}
                          defaultDmId={defaultDmId}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
