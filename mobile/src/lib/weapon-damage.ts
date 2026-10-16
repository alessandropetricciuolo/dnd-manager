import type { AbilityKey, DieType } from "../types";

const DAMAGE_ABILITIES: Record<string, AbilityKey> = {
  FOR: "str", DES: "dex", COS: "con", INT: "int", SAG: "wis", CAR: "cha",
};

export type WeaponDamageRoll = {
  diceCount: number;
  die: DieType;
  modifier: number;
};

export function parseWeaponDamage(
  formula: string,
  abilities: Partial<Record<AbilityKey, number>> = {},
  abilityMods: Partial<Record<AbilityKey, number>> = {},
): WeaponDamageRoll | null {
  const match = formula.trim().match(/^(\d*)d(20|12|10|8|6|4|2)(?:\s*([+-])\s*(\d+|FOR|DES|COS|INT|SAG|CAR))?$/i);
  if (!match) return null;

  let modifier = 0;
  if (match[3] && match[4]) {
    const token = match[4].toUpperCase();
    if (/^\d+$/.test(token)) {
      modifier = Number.parseInt(token, 10) * (match[3] === "-" ? -1 : 1);
    } else {
      const key = DAMAGE_ABILITIES[token];
      const score = abilities[key];
      const value = abilityMods[key] ?? (typeof score === "number" ? Math.floor((score - 10) / 2) : undefined);
      if (value === undefined) return null;
      modifier = value * (match[3] === "-" ? -1 : 1);
    }
  }

  const diceCount = Number.parseInt(match[1] || "1", 10);
  if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > 20) return null;
  return { diceCount, die: `d${match[2]}` as DieType, modifier };
}
