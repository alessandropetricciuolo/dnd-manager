import type { Json } from "@/types/database.types";

export type FantasyCalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type FantasyCalendarMonth = {
  name: string;
  days: number;
};

export type FantasyCalendarConfig = {
  months: FantasyCalendarMonth[];
};

const MIN_MONTH_DAYS = 1;
const MAX_MONTH_DAYS = 400;
const MIN_MONTHS = 1;
const MAX_MONTHS = 24;

export const DEFAULT_FANTASY_CALENDAR_CONFIG: FantasyCalendarConfig = {
  months: [
    { name: "Luna del Gelo", days: 30 },
    { name: "Alba delle Ceneri", days: 30 },
    { name: "Pioggia Sottile", days: 30 },
    { name: "Sole Alto", days: 30 },
    { name: "Lame al Vento", days: 30 },
    { name: "Mietitura", days: 30 },
    { name: "Braci Lunghe", days: 30 },
    { name: "Nebbia Profonda", days: 30 },
    { name: "Ultima Torcia", days: 30 },
    { name: "Notte Infinita", days: 30 },
    { name: "Gelo Nero", days: 30 },
    { name: "Rinascita", days: 30 },
  ],
};

export const DEFAULT_FANTASY_BASE_DATE: FantasyCalendarDate = {
  year: 1,
  month: 1,
  day: 1,
};

function clampInt(value: unknown, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

function normalizeMonthName(value: unknown, fallback: string) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeMonthDays(value: unknown, fallback: number) {
  const int = clampInt(value, fallback);
  if (int < MIN_MONTH_DAYS) return MIN_MONTH_DAYS;
  if (int > MAX_MONTH_DAYS) return MAX_MONTH_DAYS;
  return int;
}

export function normalizeFantasyCalendarConfig(input: Json | null | undefined): FantasyCalendarConfig {
  const raw = (input && typeof input === "object" && !Array.isArray(input) ? input : null) as
    | { months?: unknown }
    | null;
  const monthsInput = Array.isArray(raw?.months) ? raw.months : [];
  const months = monthsInput
    .slice(0, MAX_MONTHS)
    .map((month, index) => {
      const safe = month && typeof month === "object" && !Array.isArray(month) ? (month as Record<string, unknown>) : {};
      return {
        name: normalizeMonthName(safe.name, `Mese ${index + 1}`),
        days: normalizeMonthDays(safe.days, 30),
      };
    })
    .filter((month) => month.days >= MIN_MONTH_DAYS);

  if (months.length < MIN_MONTHS) return DEFAULT_FANTASY_CALENDAR_CONFIG;
  return { months };
}

export function normalizeFantasyCalendarDate(
  input: Json | null | undefined,
  config: FantasyCalendarConfig
): FantasyCalendarDate {
  const raw = (input && typeof input === "object" && !Array.isArray(input) ? input : null) as
    | { year?: unknown; month?: unknown; day?: unknown }
    | null;
  const fallback = DEFAULT_FANTASY_BASE_DATE;
  const months = config.months.length;
  const year = Math.max(1, clampInt(raw?.year, fallback.year));
  const month = Math.min(months, Math.max(1, clampInt(raw?.month, fallback.month)));
  const monthDays = config.months[month - 1]?.days ?? 30;
  const day = Math.min(monthDays, Math.max(1, clampInt(raw?.day, fallback.day)));
  return { year, month, day };
}

export function toCalendarDateJson(date: FantasyCalendarDate): Json {
  return {
    year: date.year,
    month: date.month,
    day: date.day,
  };
}

function daysPerYear(config: FantasyCalendarConfig) {
  return config.months.reduce((sum, month) => sum + month.days, 0);
}

function dateToAbsoluteDay(date: FantasyCalendarDate, config: FantasyCalendarConfig) {
  const dpy = Math.max(1, daysPerYear(config));
  let dayInYear = 0;
  for (let i = 0; i < date.month - 1; i += 1) {
    dayInYear += config.months[i]?.days ?? 0;
  }
  dayInYear += Math.max(0, date.day - 1);
  return (Math.max(1, date.year) - 1) * dpy + dayInYear;
}

function absoluteDayToDate(dayIndex: number, config: FantasyCalendarConfig): FantasyCalendarDate {
  const dpy = Math.max(1, daysPerYear(config));
  const safeDayIndex = Math.max(0, Math.trunc(dayIndex));
  const year = Math.floor(safeDayIndex / dpy) + 1;
  let remaining = safeDayIndex % dpy;
  for (let i = 0; i < config.months.length; i += 1) {
    const monthDays = config.months[i].days;
    if (remaining < monthDays) {
      return {
        year,
        month: i + 1,
        day: remaining + 1,
      };
    }
    remaining -= monthDays;
  }
  return {
    year,
    month: config.months.length,
    day: config.months[config.months.length - 1].days,
  };
}

export function addHoursToFantasyDate(
  start: FantasyCalendarDate,
  hoursToAdd: number,
  config: FantasyCalendarConfig
): FantasyCalendarDate {
  const safeHours = Math.max(0, Math.trunc(hoursToAdd));
  const extraDays = Math.floor(safeHours / 24);
  const startAbsolute = dateToAbsoluteDay(start, config);
  return absoluteDayToDate(startAbsolute + extraDays, config);
}

export function deriveCharacterCalendarDate(args: {
  campaignBaseDate: FantasyCalendarDate;
  characterHours: number;
  config: FantasyCalendarConfig;
  anchorDate?: FantasyCalendarDate | null;
  anchorHours?: number | null;
}): FantasyCalendarDate {
  const safeCharacterHours = Math.max(0, Math.trunc(args.characterHours));
  const safeAnchorHours =
    args.anchorHours != null && Number.isFinite(args.anchorHours) ? Math.max(0, Math.trunc(args.anchorHours)) : null;
  if (args.anchorDate && safeAnchorHours != null) {
    const delta = Math.max(0, safeCharacterHours - safeAnchorHours);
    return addHoursToFantasyDate(args.anchorDate, delta, args.config);
  }
  return addHoursToFantasyDate(args.campaignBaseDate, safeCharacterHours, args.config);
}

export function formatFantasyDate(date: FantasyCalendarDate, config: FantasyCalendarConfig) {
  const monthLabel = config.months[date.month - 1]?.name ?? `Mese ${date.month}`;
  return `${date.day} ${monthLabel}, Anno ${date.year}`;
}
