/** Punti Ki massimi per livello (PHB: — al 1°, poi uguale al livello da monaco). */
const KI_POINTS_BY_LEVEL: readonly number[] = [
  0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
];

export function kiPointsForLevel(level: number): number {
  const lvl = Math.max(1, Math.min(20, Math.floor(level || 1)));
  return KI_POINTS_BY_LEVEL[lvl] ?? 0;
}

export function kiPointsClassFeatureLine(level: number): string | null {
  const points = kiPointsForLevel(level);
  if (level < 2 || points <= 0) return null;
  return `• Punti Ki disponibili: ${points} (massimo al tuo livello; recupero al riposo breve o lungo con almeno 30 minuti di meditazione).`;
}
