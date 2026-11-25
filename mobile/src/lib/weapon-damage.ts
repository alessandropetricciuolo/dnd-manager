import type { AbilityKey, DieType } from "../types";

const DAMAGE_ABILITIES: Record<string, AbilityKey> = {
  FOR: "str",
  DES: "dex",
  COS: "con",
  INT: "int",
  SAG: "wis",
  CAR: "cha",
  STR: "str",
  DEX: "dex",
  CON: "con",
  WIS: "wis",
  CHA: "cha",
};

export type WeaponDamageRoll = {
  diceCount: number;
  die: DieType;
  modifier: number;
};

function resolveTokenValue(
  tokenRaw: string,
  abilities: Partial<Record<AbilityKey, number>>,
  abilityMods: Partial<Record<AbilityKey, number>>,
): number | null {
  const token = tokenRaw.toUpperCase();
  if (/^\d+$/.test(token)) {
    return Number.parseInt(token, 10);
  }
  const key = DAMAGE_ABILITIES[token];
  if (!key) return null;
  const score = abilities[key];
  const value = abilityMods[key] ?? (typeof score === "number" ? Math.floor((score - 10) / 2) : undefined);
  return value === undefined ? null : value;
}

/**
 * Parses weapon damage strings including versatile ("1d8+3 / 1d10+3", "1d8+3 (1d10+3)"),
 * extra numeric/ability modifiers ("1d8+FOR+1"), and trailing damage-type words ("1d8+3 taglienti").
 */
export function parseWeaponDamage(
  formula: string,
  abilities: Partial<Record<AbilityKey, number>> = {},
  abilityMods: Partial<Record<AbilityKey, number>> = {},
): WeaponDamageRoll | null {
  const primarySegment = formula
    .split("/")[0]!
    .replace(/\([^)]*\)/g, " ")
    .trim();

  const dieMatch = primarySegment.match(/^(\d*)d(20|12|10|8|6|4|2)\b/i);
  if (!dieMatch) return null;

  const diceCount = Number.parseInt(dieMatch[1] || "1", 10);
  if (!Number.isInteger(diceCount) || diceCount < 1 || diceCount > 20) return null;

  let modifier = 0;
  let rest = primarySegment.slice(dieMatch[0].length).trim();

  while (rest.length > 0) {
    if (/^[+-]/.test(rest)) {
      const modMatch = rest.match(/^([+-])\s*(\d+(?!d\d)|FOR|DES|COS|INT|SAG|CAR|STR|DEX|CON|WIS|CHA)\b/i);
      if (!modMatch) return null;
      const sign = modMatch[1] === "-" ? -1 : 1;
      const val = resolveTokenValue(modMatch[2]!, abilities, abilityMods);
      if (val === null) return null;
      modifier += sign * val;
      rest = rest.slice(modMatch[0].length).trim();
      continue;
    }
    if (/^[a-zàèéìòù'\s]+$/i.test(rest)) {
      break;
    }
    return null;
  }

  return {
    diceCount,
    die: `d${dieMatch[2]}` as DieType,
    modifier,
  };
}
