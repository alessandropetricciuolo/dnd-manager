export const DND_5E_XP_THRESHOLDS: number[] = [
  0,
  300,
  900,
  2700,
  6500,
  14000,
  23000,
  34000,
  48000,
  64000,
  85000,
  100000,
  120000,
  140000,
  165000,
  195000,
  225000,
  265000,
  305000,
  355000,
];

/**
 * Tabella Grado di Sfida (GS) → Punti Esperienza (PE) per mostri D&D 5e (wiki).
 */
export const CHALLENGE_RATING_TO_XP: Record<string, number> = {
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1000,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "30": 135000,
};

/** Opzioni GS per select (ordine dropdown). */
export const CHALLENGE_RATING_OPTIONS: { value: string; label: string; xp: number }[] = [
  { value: "1/8", label: "1/8 — 25 PE", xp: 25 },
  { value: "1/4", label: "1/4 — 50 PE", xp: 50 },
  { value: "1/2", label: "1/2 — 100 PE", xp: 100 },
  { value: "1", label: "1 — 200 PE", xp: 200 },
  { value: "2", label: "2 — 450 PE", xp: 450 },
  { value: "3", label: "3 — 700 PE", xp: 700 },
  { value: "4", label: "4 — 1.000 PE", xp: 1000 },
  { value: "5", label: "5 — 1.800 PE", xp: 1800 },
  { value: "6", label: "6 — 2.300 PE", xp: 2300 },
  { value: "7", label: "7 — 2.900 PE", xp: 2900 },
  { value: "8", label: "8 — 3.900 PE", xp: 3900 },
  { value: "9", label: "9 — 5.000 PE", xp: 5000 },
  { value: "10", label: "10 — 5.900 PE", xp: 5900 },
  { value: "11", label: "11 — 7.200 PE", xp: 7200 },
  { value: "12", label: "12 — 8.400 PE", xp: 8400 },
  { value: "13", label: "13 — 10.000 PE", xp: 10000 },
  { value: "14", label: "14 — 11.500 PE", xp: 11500 },
  { value: "15", label: "15 — 13.000 PE", xp: 13000 },
  { value: "16", label: "16 — 15.000 PE", xp: 15000 },
  { value: "17", label: "17 — 18.000 PE", xp: 18000 },
  { value: "18", label: "18 — 20.000 PE", xp: 20000 },
  { value: "19", label: "19 — 22.000 PE", xp: 22000 },
  { value: "20", label: "20 — 25.000 PE", xp: 25000 },
  { value: "21", label: "21 — 33.000 PE", xp: 33000 },
  { value: "22", label: "22 — 41.000 PE", xp: 41000 },
  { value: "23", label: "23 — 50.000 PE", xp: 50000 },
  { value: "24", label: "24 — 62.000 PE", xp: 62000 },
  { value: "30", label: "30 — 135.000 PE", xp: 135000 },
];

/** PE per un dato GS (es. "2", "1/4"). */
export function getXpFromChallengeRating(cr: string): number | undefined {
  if (cr == null || typeof cr !== "string") return undefined;
  return CHALLENGE_RATING_TO_XP[cr.trim()];
}

export type LevelProgress = {
  /** Livello attuale calcolato dai PE (1-20). */
  level: number;
  /** PE totali necessari per raggiungere il prossimo livello (null se già al 20). */
  nextLevelXp: number | null;
  /** Percentuale di avanzamento verso il prossimo livello (0-100). */
  progressPercent: number;
};

/** Calcola livello, PE al prossimo livello e progress percentuale dati i PE correnti. */
export function calculateLevelProgress(currentXp: number): LevelProgress {
  const xp = Number.isFinite(currentXp) ? Math.max(0, Math.floor(currentXp)) : 0;

  // Trova il livello più alto tale che xp >= soglia
  let level = 1;
  for (let i = DND_5E_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= DND_5E_XP_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const maxLevel = DND_5E_XP_THRESHOLDS.length;
  if (level >= maxLevel) {
    return {
      level: maxLevel,
      nextLevelXp: null,
      progressPercent: 100,
    };
  }

  const currentThreshold = DND_5E_XP_THRESHOLDS[level - 1];
  const nextThreshold = DND_5E_XP_THRESHOLDS[level];
  const span = nextThreshold - currentThreshold;
  const gainedInLevel = xp - currentThreshold;
  const progressPercent =
    span > 0 ? Math.min(100, Math.max(0, (gainedInLevel / span) * 100)) : 100;

  return {
    level,
    nextLevelXp: nextThreshold,
    progressPercent,
  };
}

