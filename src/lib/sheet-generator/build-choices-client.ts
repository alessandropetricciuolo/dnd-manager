import type {
  BuildChoiceSlot,
  CharacterBuildOverrides,
} from "@/lib/sheet-generator/build-choices-types";
import { filterWarlockInvocationsForLevel } from "@/lib/sheet-generator/class-choice-catalog";
import type { SkillKey } from "@/lib/sheet-generator/types";

export function overridesFromSlots(slots: BuildChoiceSlot[]): CharacterBuildOverrides {
  const overrides: CharacterBuildOverrides = {};
  const skills: SkillKey[] = [];
  const cantrips: string[] = [];
  const spells: string[] = [];
  const invocations: string[] = [];
  const enemies: string[] = [];
  const terrains: string[] = [];

  for (const s of slots) {
    if (!s.value) continue;
    if (s.id.startsWith("skill-")) skills.push(s.value as SkillKey);
    else if (s.id.startsWith("cantrip-")) cantrips.push(s.value);
    else if (s.id.startsWith("spell-")) spells.push(s.value);
    else if (s.id === "fighting-style") overrides.fightingStyle = s.value;
    else if (s.id === "warlock-pact") overrides.warlockPact = s.value;
    else if (s.id.startsWith("invocation-")) invocations.push(s.value);
    else if (s.id.startsWith("favored-enemy-")) enemies.push(s.value);
    else if (s.id.startsWith("favored-terrain-")) terrains.push(s.value);
  }

  if (skills.length) overrides.classSkills = skills.slice(0, 2);
  if (cantrips.length) overrides.cantrips = cantrips;
  if (spells.length) overrides.spells = spells;
  if (invocations.length) overrides.warlockInvocations = invocations;
  if (enemies.length) overrides.favoredEnemies = enemies;
  if (terrains.length) overrides.favoredTerrains = terrains;
  return overrides;
}

/** Applica override utente agli slot (es. cambio patto → filtra suppliche). */
export function applySlotChange(
  slots: BuildChoiceSlot[],
  slotId: string,
  newValue: string,
  level: number
): BuildChoiceSlot[] {
  const next = slots.map((s) => (s.id === slotId ? { ...s, value: newValue } : s));

  if (slotId === "warlock-pact") {
    const invOptions = filterWarlockInvocationsForLevel(level, newValue).map((o) => ({
      value: o.name,
      label: o.name,
      meta: o.summary,
    }));
    return next.map((s) => {
      if (s.id.startsWith("invocation-")) {
        const stillValid = invOptions.some((o) => o.value === s.value);
        return {
          ...s,
          options: invOptions,
          value: stillValid ? s.value : invOptions[0]?.value ?? "",
        };
      }
      return s;
    });
  }

  return next;
}

export function slotsToOverrides(slots: BuildChoiceSlot[]): CharacterBuildOverrides {
  return overridesFromSlots(slots);
}
