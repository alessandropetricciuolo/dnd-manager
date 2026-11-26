/**
 * Shared Long-campaign helpers for Barber & Dragons Mobile.
 * Mirrors Web rules catalog labels, XP progression, Fantasy Calendar calculation,
 * Eldaria guide parsing, Wiki body extraction, and Mission rank/treasure formatting.
 */

export const ELDARIA_CAMPAIGN_ID = 'd9962add-4d55-42ef-bfd7-96eddfe49969';

export const ELDARIA_STARTER_WIKI_IDS = [
  '4adc79be-8bd8-45ff-ab8b-7268e81202c2', // Egida dell’Ordine
  '09f2d80c-d38f-40fc-aa4c-35b6faa8bc3b', // Portale di Portico
  'e8c0cf10-635d-4817-8fe0-084c74e0c8fa', // Cristallo di passaggio
] as const;

const LEGACY_COMPENDIUM = /^Compendio di Eldaria:\s*$/im;
const WELCOME_HEADING = /^## Benvenuto in Eldaria\s*$/im;
const LEGACY_RULE_HEADING =
  /^(?:\*\*)?(\[(?:Regola Zero|Progressione|Combattimento|Sopravvivenza|Equipaggiamento|Interazione|Sfida)\][^\n]+?)(?:\*\*)?$/gm;

export function getEldariaGuideSections(markdown: string): {
  rules: string;
  welcome: string | null;
} {
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const welcome = WELCOME_HEADING.exec(normalized);
  const remaining = welcome ? normalized.slice(0, welcome.index) : normalized;
  const rules = remaining.split(LEGACY_COMPENDIUM, 1)[0].trim();

  return {
    rules: rules.replace(LEGACY_RULE_HEADING, (_, heading: string) => `## ${heading}`),
    welcome: welcome ? normalized.slice(welcome.index + welcome[0].length).trim() : null,
  };
}

// ======================== RACE / SUBRACE / BACKGROUND CATALOG ========================

const RACE_LABELS: Record<string, string> = {
  elfo: 'Elfo',
  halfling: 'Halfling',
  nano: 'Nano',
  umano: 'Umano',
  dragonide: 'Dragonide',
  gnomo: 'Gnomo',
  mezzelfo: 'Mezzelfo',
  mezzorco: 'Mezzorco',
  tiefling: 'Tiefling',
  aarakocra: 'Aarakocra',
  aasimar: 'Aasimar',
  cangiante: 'Cangiante',
  centauro: 'Centauro',
  coboldo: 'Coboldo',
  duergar: 'Duergar',
  eladrin: 'Eladrin',
  elfo_mare: 'Elfo del mare',
  fata: 'Fata',
  firbolg: 'Firbolg',
  genasi: 'Genasi',
  githyanki: 'Githyanki',
  githzerai: 'Githzerai',
  gnomo_profondita: 'Gnomo delle profondità',
  goblin: 'Goblin',
  goliath: 'Goliath',
  hobgoblin: 'Hobgoblin',
  kenku: 'Kenku',
  leporidion: 'Leporidion',
  lucertoloide: 'Lucertoloide',
  minotauro: 'Minotauro',
  morfico: 'Morfico',
  orco: 'Orco',
  satiro: 'Satiro',
  shadar_kai: 'Shadar-kai',
  tabaxi: 'Tabaxi',
  tortuga: 'Tortuga',
  tritone: 'Tritone',
  urgoblin: 'Urgoblin',
  yuan_ti: 'Yuan-ti',
  forgiato: 'Forgiato',
  dhampir: 'Dhampir',
  rinato: 'Rinato',
  sangue_strigo: 'Sangue Strigo',
};

const SUBRACE_LABELS: Record<string, string> = {
  elfo_alto: 'Elfo alto',
  elfo_boschi: 'Elfo dei boschi',
  elfo_drow: 'Elfo oscuro (drow)',
  halfling_piedelesto: 'Halfling piedelesto',
  halfling_tozzo: 'Halfling tozzo',
  nano_colline: 'Nano delle colline',
  nano_montagne: 'Nano delle montagne',
  gnomo_foreste: 'Gnomo delle foreste',
  gnomo_rocce: 'Gnomo delle rocce',
  genasi_acqua: "Genasi dell'acqua",
  genasi_aria: "Genasi dell'aria",
  genasi_fuoco: 'Genasi del fuoco',
  genasi_terra: 'Genasi della terra',
};

const BACKGROUND_CATALOG: Record<string, { label: string; bookPrefix: string }> = {
  accolito: { label: 'Accolito', bookPrefix: 'PHB' },
  artigiano_gilda: { label: 'Artigiano di gilda', bookPrefix: 'PHB' },
  ciarlatano: { label: 'Ciarlatano', bookPrefix: 'PHB' },
  criminale: { label: 'Criminale', bookPrefix: 'PHB' },
  eremita: { label: 'Eremita', bookPrefix: 'PHB' },
  eroe_popolare: { label: 'Eroe popolare', bookPrefix: 'PHB' },
  forestiero: { label: 'Forestiero', bookPrefix: 'PHB' },
  intrattenitore: { label: 'Intrattenitore', bookPrefix: 'PHB' },
  nobile: { label: 'Nobile', bookPrefix: 'PHB' },
  sapiente: { label: 'Sapiente', bookPrefix: 'PHB' },
  soldato: { label: 'Soldato', bookPrefix: 'PHB' },
  tormentato: { label: 'Il tormentato', bookPrefix: 'Ravenloft' },
  investigatore: { label: 'Investigatore', bookPrefix: 'Ravenloft' },
};

function humanizeSlug(slug: string): string {
  const clean = slug.replace(/[_-]+/g, ' ').trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '';
}

export function resolveRaceAndSubraceLabels(args: {
  raceSlug?: string | null;
  subclassSlug?: string | null;
  sheetRaceLabel?: string | null;
  sheetSubraceLabel?: string | null;
}): { raceLabel: string | null; subraceLabel: string | null } {
  const rSlug = args.raceSlug?.trim() || null;
  const subSlug = args.subclassSlug?.trim() || null;
  const raceLabel =
    (rSlug && RACE_LABELS[rSlug]) ||
    (args.sheetRaceLabel?.trim() || null) ||
    (rSlug ? humanizeSlug(rSlug) : null);
  const subraceLabel =
    (subSlug && SUBRACE_LABELS[subSlug]) ||
    (args.sheetSubraceLabel?.trim() || null) ||
    (subSlug ? humanizeSlug(subSlug) : null);
  return { raceLabel, subraceLabel };
}

export function resolveBackgroundCatalogInfo(args: {
  backgroundSlug?: string | null;
  sheetBackgroundLabel?: string | null;
}): { label: string | null; bookPrefix: string | null; fullBadge: string | null } {
  const bSlug = args.backgroundSlug?.trim() || null;
  if (bSlug && BACKGROUND_CATALOG[bSlug]) {
    const entry = BACKGROUND_CATALOG[bSlug];
    return {
      label: entry.label,
      bookPrefix: entry.bookPrefix,
      fullBadge: `${entry.bookPrefix}: ${entry.label}`,
    };
  }
  const sheetBg = args.sheetBackgroundLabel?.trim() || null;
  if (sheetBg) {
    return { label: sheetBg, bookPrefix: null, fullBadge: sheetBg };
  }
  if (bSlug) {
    const label = humanizeSlug(bSlug);
    return { label, bookPrefix: null, fullBadge: label };
  }
  return { label: null, bookPrefix: null, fullBadge: null };
}

// ======================== XP & LEVEL PROGRESSION ========================

export const DND_5E_XP_THRESHOLDS: number[] = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export interface LevelProgressInfo {
  calculatedLevel: number;
  nextLevelXp: number | null;
  progressPercent: number;
  hasLevelUp: boolean;
}

export function calculateMobileLevelProgress(
  currentXp: number | null | undefined,
  storedLevel: number | null | undefined,
): LevelProgressInfo {
  const xp = typeof currentXp === 'number' && Number.isFinite(currentXp)
    ? Math.max(0, Math.floor(currentXp))
    : 0;

  let calculatedLevel = 1;
  for (let i = DND_5E_XP_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (xp >= DND_5E_XP_THRESHOLDS[i]) {
      calculatedLevel = i + 1;
      break;
    }
  }

  const maxLevel = DND_5E_XP_THRESHOLDS.length;
  const effStored = typeof storedLevel === 'number' && storedLevel >= 1 ? storedLevel : 1;
  if (calculatedLevel >= maxLevel) {
    return {
      calculatedLevel: maxLevel,
      nextLevelXp: null,
      progressPercent: 100,
      hasLevelUp: calculatedLevel > effStored,
    };
  }

  const currentThreshold = DND_5E_XP_THRESHOLDS[calculatedLevel - 1];
  const nextThreshold = DND_5E_XP_THRESHOLDS[calculatedLevel];
  const span = nextThreshold - currentThreshold;
  const gained = xp - currentThreshold;
  const progressPercent = span > 0 ? Math.min(100, Math.max(0, (gained / span) * 100)) : 100;

  return {
    calculatedLevel,
    nextLevelXp: nextThreshold,
    progressPercent,
    hasLevelUp: calculatedLevel > effStored,
  };
}

// ======================== FANTASY CALENDAR (LONG CAMPAIGNS) ========================

export interface FantasyCalendarDate {
  year: number;
  month: number;
  day: number;
}

export interface FantasyCalendarMonth {
  name: string;
  days: number;
}

export interface FantasyCalendarConfig {
  months: FantasyCalendarMonth[];
}

export const DEFAULT_FANTASY_CALENDAR_CONFIG: FantasyCalendarConfig = {
  months: [
    { name: 'Luna del Gelo', days: 30 },
    { name: 'Alba delle Ceneri', days: 30 },
    { name: 'Pioggia Sottile', days: 30 },
    { name: 'Sole Alto', days: 30 },
    { name: 'Lame al Vento', days: 30 },
    { name: 'Mietitura', days: 30 },
    { name: 'Braci Lunghe', days: 30 },
    { name: 'Nebbia Profonda', days: 30 },
    { name: 'Ultima Torcia', days: 30 },
    { name: 'Notte Infinita', days: 30 },
    { name: 'Gelo Nero', days: 30 },
    { name: 'Rinascita', days: 30 },
  ],
};

export const DEFAULT_FANTASY_BASE_DATE: FantasyCalendarDate = { year: 1, month: 1, day: 1 };

function clampInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.trunc(value);
}

export function normalizeFantasyCalendarConfig(input: unknown): FantasyCalendarConfig {
  const raw = input && typeof input === 'object' && !Array.isArray(input)
    ? (input as { months?: unknown })
    : null;
  const monthsInput = Array.isArray(raw?.months) ? raw!.months : [];
  const months = monthsInput
    .slice(0, 24)
    .map((m, idx) => {
      const safe = m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
      const name = typeof safe.name === 'string' && safe.name.trim() ? safe.name.trim() : `Mese ${idx + 1}`;
      const days = Math.min(400, Math.max(1, clampInt(safe.days, 30)));
      return { name, days };
    });
  return months.length >= 1 ? { months } : DEFAULT_FANTASY_CALENDAR_CONFIG;
}

export function normalizeFantasyCalendarDate(
  input: unknown,
  config: FantasyCalendarConfig,
): FantasyCalendarDate {
  const raw = input && typeof input === 'object' && !Array.isArray(input)
    ? (input as { year?: unknown; month?: unknown; day?: unknown })
    : null;
  const monthsCount = config.months.length;
  const year = Math.max(1, clampInt(raw?.year, DEFAULT_FANTASY_BASE_DATE.year));
  const month = Math.min(monthsCount, Math.max(1, clampInt(raw?.month, DEFAULT_FANTASY_BASE_DATE.month)));
  const monthDays = config.months[month - 1]?.days ?? 30;
  const day = Math.min(monthDays, Math.max(1, clampInt(raw?.day, DEFAULT_FANTASY_BASE_DATE.day)));
  return { year, month, day };
}

function dateToAbsoluteDay(date: FantasyCalendarDate, config: FantasyCalendarConfig): number {
  const dpy = Math.max(1, config.months.reduce((sum, m) => sum + m.days, 0));
  let dayInYear = 0;
  for (let i = 0; i < date.month - 1; i += 1) {
    dayInYear += config.months[i]?.days ?? 0;
  }
  dayInYear += Math.max(0, date.day - 1);
  return (Math.max(1, date.year) - 1) * dpy + dayInYear;
}

function absoluteDayToDate(dayIndex: number, config: FantasyCalendarConfig): FantasyCalendarDate {
  const dpy = Math.max(1, config.months.reduce((sum, m) => sum + m.days, 0));
  const safeDayIndex = Math.max(0, Math.trunc(dayIndex));
  const year = Math.floor(safeDayIndex / dpy) + 1;
  let remaining = safeDayIndex % dpy;
  for (let i = 0; i < config.months.length; i += 1) {
    const monthDays = config.months[i].days;
    if (remaining < monthDays) {
      return { year, month: i + 1, day: remaining + 1 };
    }
    remaining -= monthDays;
  }
  return {
    year,
    month: config.months.length,
    day: config.months[config.months.length - 1]?.days ?? 30,
  };
}

export function resolveMobileCharacterCalendar(args: {
  campaignCalendarConfig?: unknown;
  campaignBaseDate?: unknown;
  timeOffsetHours?: number | null;
  calendarAnchorDate?: unknown;
  calendarAnchorHours?: number | null;
  calendarCurrentDate?: unknown;
}): { dateLabel: string; hours: number } {
  const config = normalizeFantasyCalendarConfig(args.campaignCalendarConfig);
  const baseDate = normalizeFantasyCalendarDate(args.campaignBaseDate, config);
  const safeHours =
    typeof args.timeOffsetHours === 'number' && Number.isFinite(args.timeOffsetHours)
      ? Math.max(0, Math.trunc(args.timeOffsetHours))
      : 0;
  const anchorDate = args.calendarAnchorDate
    ? normalizeFantasyCalendarDate(args.calendarAnchorDate, config)
    : null;
  const anchorHours =
    typeof args.calendarAnchorHours === 'number' && Number.isFinite(args.calendarAnchorHours)
      ? Math.max(0, Math.trunc(args.calendarAnchorHours))
      : null;

  let date: FantasyCalendarDate;
  if (anchorDate && anchorHours !== null) {
    const deltaDays = Math.floor(Math.max(0, safeHours - anchorHours) / 24);
    date = absoluteDayToDate(dateToAbsoluteDay(anchorDate, config) + deltaDays, config);
  } else if (args.campaignBaseDate || safeHours > 0) {
    const extraDays = Math.floor(safeHours / 24);
    date = absoluteDayToDate(dateToAbsoluteDay(baseDate, config) + extraDays, config);
  } else if (args.calendarCurrentDate) {
    date = normalizeFantasyCalendarDate(args.calendarCurrentDate, config);
  } else {
    date = baseDate;
  }

  const monthLabel = config.months[date.month - 1]?.name ?? `Mese ${date.month}`;
  return {
    dateLabel: `${date.day} ${monthLabel}, Anno ${date.year}`,
    hours: safeHours,
  };
}

// ======================== WIKI & MISSION HELPERS ========================

export function extractWikiEntityBody(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'string') return content.trim();
  if (typeof content === 'object' && !Array.isArray(content)) {
    const rec = content as Record<string, unknown>;
    for (const key of ['body', 'text', 'description', 'summary', 'notes']) {
      if (typeof rec[key] === 'string' && (rec[key] as string).trim()) {
        return (rec[key] as string).trim();
      }
    }
  }
  return '';
}

export function extractWikiEntitySnippet(content: unknown): string {
  if (!content) return '';
  if (typeof content === 'object' && !Array.isArray(content)) {
    const rec = content as Record<string, unknown>;
    if (typeof rec.description === 'string' && rec.description.trim()) {
      return rec.description.trim();
    }
    if (typeof rec.summary === 'string' && rec.summary.trim()) {
      return rec.summary.trim();
    }
  }
  return extractWikiEntityBody(content)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

export function resolveTelegramOrImageUrl(
  imageUrl: string | null | undefined,
  telegramFallbackId?: string | null,
): string | null {
  const baseUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
  const trimmed = imageUrl?.trim();
  if (trimmed) {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${baseUrl}${path}`;
  }
  const tg = telegramFallbackId?.trim();
  if (tg) {
    return `${baseUrl}/api/tg-image/${encodeURIComponent(tg)}`;
  }
  return null;
}

export function formatMissionRankMeta(gradeRaw: string | null | undefined): {
  rank: string;
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
} {
  const g = (gradeRaw ?? 'D').trim().toUpperCase();
  if (g === 'S' || g.includes('LEGGEND') || g.includes('LETALE')) {
    return {
      rank: g.length <= 2 ? g : 'S',
      label: 'Rango S · Leggendario',
      color: '#FDE047',
      borderColor: '#F59E0B',
      bgColor: 'rgba(245, 158, 11, 0.2)',
    };
  }
  if (g === 'A' || g.includes('DIFFICILE') || g.includes('ELITE')) {
    return {
      rank: g.length <= 2 ? g : 'A',
      label: 'Rango A · Elite',
      color: '#FDA4AF',
      borderColor: '#F43F5E',
      bgColor: 'rgba(244, 63, 94, 0.2)',
    };
  }
  if (g === 'B' || g.includes('MEDIA')) {
    return {
      rank: g.length <= 2 ? g : 'B',
      label: 'Rango B · Esperto',
      color: '#93C5FD',
      borderColor: '#3B82F6',
      bgColor: 'rgba(59, 130, 246, 0.2)',
    };
  }
  if (g === 'C') {
    return {
      rank: 'C',
      label: 'Rango C · Avanzato',
      color: '#FCD34D',
      borderColor: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.2)',
    };
  }
  return {
    rank: g.length === 1 ? g : 'D',
    label: `Rango ${g.length === 1 ? g : 'D'} · Base`,
    color: '#D6D3D1',
    borderColor: '#78716C',
    bgColor: 'rgba(120, 113, 108, 0.2)',
  };
}

export function formatMissionTreasureLabel(mission: {
  paga?: string | null;
  treasure_gp?: number | null;
  treasure_sp?: number | null;
  treasure_cp?: number | null;
}): string {
  const parts: string[] = [];
  if ((mission.treasure_gp ?? 0) > 0) parts.push(`${mission.treasure_gp} MO`);
  if ((mission.treasure_sp ?? 0) > 0) parts.push(`${mission.treasure_sp} MA`);
  if ((mission.treasure_cp ?? 0) > 0) parts.push(`${mission.treasure_cp} MR`);
  const coinsStr = parts.join(' · ');
  const pagaStr = mission.paga?.trim() || '';
  if (pagaStr && coinsStr) return `${pagaStr} (${coinsStr})`;
  if (pagaStr) return pagaStr;
  if (coinsStr) return coinsStr;
  return 'Ricompensa d’onore';
}
