import {
  PHB_FIGHTING_STYLE_OPTIONS,
  filterWarlockInvocationsForLevel,
  warlockInvocationsKnown,
  WARLOCK_PACT_OPTIONS,
} from "@/lib/sheet-generator/class-choice-catalog";

function stableHashNonNegative(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickDeterministic<T>(items: T[], seed: string): T | null {
  if (!items.length) return null;
  const idx = stableHashNonNegative(seed) % items.length;
  return items[idx] ?? null;
}

function pickDeterministicMany<T>(items: T[], count: number, seed: string): T[] {
  if (count <= 0 || !items.length) return [];
  const out: T[] = [];
  const start = stableHashNonNegative(seed) % items.length;
  for (let i = 0; i < items.length && out.length < count; i += 1) {
    const idx = (start + i) % items.length;
    out.push(items[idx]);
  }
  return out;
}

export function fightingStyleSheetSeed(input: {
  characterName?: string | null;
  classLabel: string;
  raceSlug: string;
  subraceSlug: string | null;
  backgroundSlug: string;
  classSubclass: string | null;
  level: number;
}): string {
  return [
    input.classLabel,
    input.characterName?.trim() ?? "",
    input.raceSlug,
    input.subraceSlug ?? "",
    input.backgroundSlug,
    input.classSubclass ?? "",
    String(input.level),
  ].join("|");
}

export function warlockBuildSeed(input: {
  characterName?: string | null;
  raceSlug: string;
  subraceSlug: string | null;
  backgroundSlug: string;
  classSubclass: string | null;
  level: number;
}): string {
  return [
    "Warlock",
    input.characterName?.trim() ?? "",
    input.raceSlug,
    input.subraceSlug ?? "",
    input.backgroundSlug,
    input.classSubclass ?? "",
    String(input.level),
  ].join("|");
}

export function pickDefaultFightingStyle(seed: string): string {
  const styles = [...PHB_FIGHTING_STYLE_OPTIONS];
  const picked = pickDeterministic(styles, `${seed}|phb-stile-combattimento`);
  return picked ?? styles[0]!;
}

export function pickDefaultWarlockPact(seed: string): string {
  const picked = pickDeterministic([...WARLOCK_PACT_OPTIONS], `${seed}|pact`);
  return picked?.name ?? WARLOCK_PACT_OPTIONS[0]!.name;
}

export function pickDefaultWarlockInvocations(
  seed: string,
  level: number,
  pactName: string
): string[] {
  const targetCount = Math.max(2, warlockInvocationsKnown(level));
  const available = filterWarlockInvocationsForLevel(level, pactName);
  const picked = pickDeterministicMany(available, targetCount, `${seed}|invocations`);
  return picked.map((p) => p.name);
}

export { stableHashNonNegative, pickDeterministic, pickDeterministicMany };
