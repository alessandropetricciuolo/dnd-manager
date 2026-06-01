import { extractPhbSpellMarkdown } from "@/lib/server/phb-spell-excerpt";
import { spellCapPerLevel, type SpellPickEntry } from "@/lib/sheet-generator/spell-slot-picker";
import { getSpellCombatTierScore } from "@/lib/sheet-generator/spell-combat-tier";

/** Chiave normalizzata scuola arcana (es. «divinazione»). */
export function normalizeArcaneSchoolKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/^scuola di\s+/i, "")
    .replace(/\s+/g, " ");
}

/** Da sottoclasse mago PHB («Scuola di Divinazione»). */
export function parseWizardArcaneSchoolKey(classSubclass: string | null | undefined): string | null {
  const sub = (classSubclass ?? "").trim();
  if (!sub) return null;
  const m = sub.match(/^scuola\s+di\s+(.+)$/i);
  if (m?.[1]) return normalizeArcaneSchoolKey(m[1]);
  return null;
}

/** Estrae la scuola dal sottotitolo PHB (*Divinazione di 3° livello*). */
export function parseSpellSchoolKeyFromMarkdown(md: string): string | null {
  if (!md.trim()) return null;
  const head = md.replace(/\r/g, "").split("\n").slice(0, 12).join("\n");
  const m =
    head.match(/\*\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*?)\s+di\s+\d+°\s+livello\s*\*/i) ??
    head.match(/(?:^|\n)\s*\*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]*?)\s+di\s+\d+°\s+livello/i);
  if (!m?.[1]) return null;
  return normalizeArcaneSchoolKey(m[1]);
}

/** 60% scuola scelta (arrotondato per eccesso), 40% altre scuole. */
export function wizardSchoolSpellTargets(total: number): { school: number; other: number } {
  const safe = Math.max(0, Math.floor(total));
  if (safe === 0) return { school: 0, other: 0 };
  const school = Math.min(safe, Math.ceil(safe * 0.6));
  return { school, other: safe - school };
}

export function createSpellSchoolLookup(): {
  getSpellSchool: (spellName: string) => string | null;
} {
  const cache = new Map<string, string | null>();
  return {
    getSpellSchool(spellName: string): string | null {
      const key = spellName.trim().toLocaleLowerCase("it");
      if (cache.has(key)) return cache.get(key) ?? null;
      const md = extractPhbSpellMarkdown(spellName);
      const school = parseSpellSchoolKeyFromMarkdown(md);
      cache.set(key, school);
      return school;
    },
  };
}

function spellEntryKey(e: SpellPickEntry): string {
  return `${e.level}:${e.name.toLocaleLowerCase("it")}`;
}

function sortKeyForPick(
  e: SpellPickEntry,
  powerPlayer: boolean,
  wizardSchoolKey: string | null,
  getSpellSchool: (name: string) => string | null
): number {
  let score = powerPlayer ? getSpellCombatTierScore(e.name) : e.level * 10;
  if (wizardSchoolKey && getSpellSchool(e.name) === wizardSchoolKey) {
    score += 120;
  }
  return score;
}

function worstIndex(
  spells: SpellPickEntry[],
  match: (e: SpellPickEntry) => boolean
): number {
  let replaceIdx = -1;
  let worst = Infinity;
  for (let i = 0; i < spells.length; i += 1) {
    const e = spells[i]!;
    if (!match(e)) continue;
    const tier = getSpellCombatTierScore(e.name);
    if (tier < worst) {
      worst = tier;
      replaceIdx = i;
    }
  }
  return replaceIdx;
}

function bestCandidate(
  pool: SpellPickEntry[],
  seen: Set<string>,
  wantSchool: boolean,
  wizardSchoolKey: string,
  getSpellSchool: (name: string) => string | null,
  powerPlayer: boolean
): SpellPickEntry | null {
  const candidates = pool
    .filter((e) => e.level >= 1 && !seen.has(spellEntryKey(e)))
    .filter((e) => {
      const isSchool = getSpellSchool(e.name) === wizardSchoolKey;
      return wantSchool ? isSchool : !isSchool;
    })
    .sort(
      (a, b) =>
        sortKeyForPick(b, powerPlayer, wizardSchoolKey, getSpellSchool) -
        sortKeyForPick(a, powerPlayer, wizardSchoolKey, getSpellSchool)
    );
  return candidates[0] ?? null;
}

/**
 * Bilancia il grimorio: ~60% scuola scelta (ceil), ~40% altre scuole.
 */
function canAddAtLevel(
  spells: SpellPickEntry[],
  spell: SpellPickEntry,
  caps: Map<number, number>
): boolean {
  const cap = caps.get(spell.level);
  if (cap == null) return false;
  return spells.filter((e) => e.level === spell.level).length < cap;
}

export function balanceWizardArcaneSchoolSpells(
  picked: SpellPickEntry[],
  pool: SpellPickEntry[],
  wizardSchoolKey: string,
  targetCount: number,
  getSpellSchool: (name: string) => string | null,
  powerPlayer = true,
  spellSlots?: Record<number, number>,
  classLabel?: string
): SpellPickEntry[] {
  if (!wizardSchoolKey || targetCount <= 0 || !pool.length) return picked.slice(0, targetCount);

  const caps =
    spellSlots && classLabel ? spellCapPerLevel(spellSlots, classLabel) : new Map<number, number>();

  const out = picked.slice(0, targetCount);
  const seen = new Set(out.map(spellEntryKey));

  const tryInsert = (spells: SpellPickEntry[], insert: SpellPickEntry | null): boolean => {
    if (!insert || seen.has(spellEntryKey(insert))) return false;
    if (caps.size && !canAddAtLevel(spells, insert, caps)) return false;
    seen.add(spellEntryKey(insert));
    spells.push(insert);
    return true;
  };

  while (out.length < targetCount) {
    const insert =
      bestCandidate(pool, seen, true, wizardSchoolKey, getSpellSchool, powerPlayer) ??
      bestCandidate(pool, seen, false, wizardSchoolKey, getSpellSchool, powerPlayer);
    if (!tryInsert(out, insert)) break;
  }

  const { school: targetSchool, other: targetOther } = wizardSchoolSpellTargets(out.length);

  const isSchoolSpell = (e: SpellPickEntry) => getSpellSchool(e.name) === wizardSchoolKey;
  const schoolCount = () => out.filter(isSchoolSpell).length;

  const tryReplace = (replaceIdx: number, insert: SpellPickEntry | null): boolean => {
    if (replaceIdx < 0 || !insert || seen.has(spellEntryKey(insert))) return false;
    const removed = out[replaceIdx]!;
    if (caps.size && removed.level !== insert.level) {
      const without = out.filter((_, i) => i !== replaceIdx);
      if (!canAddAtLevel(without, insert, caps)) return false;
    }
    seen.delete(spellEntryKey(removed));
    out[replaceIdx] = insert;
    seen.add(spellEntryKey(insert));
    return true;
  };

  const candidatesOfSchool = (wantSchool: boolean) =>
    pool
      .filter((e) => e.level >= 1 && !seen.has(spellEntryKey(e)))
      .filter((e) => {
        const isSchool = getSpellSchool(e.name) === wizardSchoolKey;
        return wantSchool ? isSchool : !isSchool;
      })
      .sort(
        (a, b) =>
          sortKeyForPick(b, powerPlayer, wizardSchoolKey, getSpellSchool) -
          sortKeyForPick(a, powerPlayer, wizardSchoolKey, getSpellSchool)
      );

  while (schoolCount() > targetSchool) {
    const replaceIdx = worstIndex(out, isSchoolSpell);
    if (replaceIdx < 0) break;
    let swapped = false;
    for (const insert of candidatesOfSchool(false)) {
      if (tryReplace(replaceIdx, insert)) {
        swapped = true;
        break;
      }
    }
    if (!swapped) break;
  }

  while (schoolCount() < targetSchool) {
    const replaceIdx = worstIndex(out, (e) => !isSchoolSpell(e));
    if (replaceIdx < 0) break;
    let swapped = false;
    for (const insert of candidatesOfSchool(true)) {
      if (tryReplace(replaceIdx, insert)) {
        swapped = true;
        break;
      }
    }
    if (!swapped) break;
  }

  while (out.length < targetCount) {
    const needSchool = schoolCount() < targetSchool;
    const options = candidatesOfSchool(needSchool);
    let added = false;
    for (const insert of options.length ? options : candidatesOfSchool(!needSchool)) {
      if (tryInsert(out, insert)) {
        added = true;
        break;
      }
    }
    if (!added) break;
  }

  return out.slice(0, targetCount);
}

/** @deprecated Usa balanceWizardArcaneSchoolSpells */
export function ensureWizardArcaneSchoolSpells(
  picked: SpellPickEntry[],
  pool: SpellPickEntry[],
  wizardSchoolKey: string,
  targetCount: number,
  getSpellSchool: (name: string) => string | null
): SpellPickEntry[] {
  return balanceWizardArcaneSchoolSpells(picked, pool, wizardSchoolKey, targetCount, getSpellSchool, true);
}

export { sortKeyForPick };
