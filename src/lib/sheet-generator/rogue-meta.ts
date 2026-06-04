/** Dadi Attacco Furtivo per livello (PHB, colonna tabella Ladro). */
const SNEAK_ATTACK_D6_BY_LEVEL: readonly number[] = [
  0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
];

export function sneakAttackDiceForLevel(level: number): number {
  const lvl = Math.max(1, Math.min(20, Math.floor(level || 1)));
  return SNEAK_ATTACK_D6_BY_LEVEL[lvl] ?? 0;
}

export function sneakAttackClassFeatureLine(level: number): string | null {
  const dice = sneakAttackDiceForLevel(level);
  if (dice <= 0) return null;
  return `• Attacco Furtivo: ${dice}d6 danni extra (1 volta per turno al livello attuale).`;
}
