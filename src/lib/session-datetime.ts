/**
 * Date/orari sessioni: fuso unico Europe/Rome (creazione form + visualizzazione).
 * Il DB resta TIMESTAMPTZ (UTC); qui convertiamo da/per l’orario “di calendario” italiano.
 */

import type { Locale } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const SESSION_DISPLAY_TIMEZONE = "Europe/Rome";

/**
 * Converte data (yyyy-MM-dd) + ora (HH:mm o HH:mm:ss) del form GM
 * nell’istante UTC corretto (come se fossero ora locale a Roma).
 */
export function sessionFormLocalToUtcIso(dateStr: string, timeStr: string): string {
  const date = dateStr.trim();
  const time = timeStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data non valida: atteso yyyy-MM-dd.");
  }
  const [y, mo, d] = date.split("-").map(Number);
  const timeParts = time.split(":").map((p) => parseInt(p, 10));
  const h = timeParts[0];
  const mi = timeParts[1] ?? 0;
  const se = timeParts[2] ?? 0;
  if ([y, mo, d, h, mi, se].some((n) => Number.isNaN(n))) {
    throw new Error("Data o orario non validi.");
  }
  const wall = new Date(y, mo - 1, d, h, mi, se, 0);
  if (Number.isNaN(wall.getTime())) {
    throw new Error("Data o orario non validi.");
  }
  return fromZonedTime(wall, SESSION_DISPLAY_TIMEZONE).toISOString();
}

/** Inizio del giorno (mezzanotte) a Roma, come Date UTC. */
export function startOfRomeDayFromInstant(input: Date | string): Date {
  const iso = typeof input === "string" ? input : input.toISOString();
  const ymd = formatInTimeZone(iso, SESSION_DISPLAY_TIMEZONE, "yyyy-MM-dd");
  return fromZonedTime(`${ymd}T00:00:00`, SESSION_DISPLAY_TIMEZONE);
}

export function formatSessionInRome(
  scheduledAtIso: string,
  formatStr: string,
  options?: { locale?: Locale }
): string {
  return formatInTimeZone(scheduledAtIso, SESSION_DISPLAY_TIMEZONE, formatStr, options);
}
