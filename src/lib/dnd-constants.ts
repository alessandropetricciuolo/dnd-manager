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

