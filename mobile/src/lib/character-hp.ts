export interface HpDeltaOutcome {
  hitPoints: number;
  tempHp?: number;
}

/**
 * Applies a healing (+) or damage (-) delta to current HP and temporary HP
 * following D&D 5e rules: damage consumes temp HP before current HP.
 */
export function computeQuickHpOutcome(
  currentHp: number,
  maxHp: number,
  tempHp: number,
  delta: number
): HpDeltaOutcome {
  if (delta < 0 && tempHp > 0) {
    const damage = Math.abs(delta);
    if (tempHp >= damage) {
      return {
        hitPoints: currentHp,
        tempHp: tempHp - damage,
      };
    }
    const remainingDamage = damage - tempHp;
    return {
      hitPoints: Math.max(0, currentHp - remainingDamage),
      tempHp: 0,
    };
  }

  return {
    hitPoints: Math.max(0, Math.min(maxHp, currentHp + delta)),
  };
}
