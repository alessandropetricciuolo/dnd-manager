/** Punti stregoneria massimi per livello (PHB: — al 1°, poi colonna tabella Stregone). */
const SORCERY_POINTS_BY_LEVEL: readonly number[] = [
  0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15,
];

export function sorceryPointsForLevel(level: number): number {
  const lvl = Math.max(1, Math.min(20, Math.floor(level || 1)));
  return SORCERY_POINTS_BY_LEVEL[lvl] ?? 0;
}

export function sorceryPointsClassFeatureLine(level: number): string | null {
  const points = sorceryPointsForLevel(level);
  if (level < 2 || points <= 0) return null;
  return `• Punti stregoneria disponibili: ${points} (massimo al tuo livello; recupero al riposo lungo).`;
}
