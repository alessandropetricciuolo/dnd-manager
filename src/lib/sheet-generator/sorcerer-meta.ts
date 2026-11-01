/** Punti stregoneria massimi per livello (PHB: — al 1°, poi colonna tabella Stregone). */
export function sorceryPointsForLevel(level: number): number {
  const lvl = Math.max(1, Math.min(20, Math.floor(level || 1)));
  if (lvl < 2) return 0;
  return lvl;
}

export function sorceryPointsClassFeatureLine(level: number): string | null {
  const points = sorceryPointsForLevel(level);
  if (level < 2 || points <= 0) return null;
  return `• Punti stregoneria disponibili: ${points} (massimo al tuo livello; recupero al riposo lungo).`;
}
