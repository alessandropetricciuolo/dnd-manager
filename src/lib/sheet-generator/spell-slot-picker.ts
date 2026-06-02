import { getSpellCombatTierScore } from "@/lib/sheet-generator/spell-combat-tier";
import {
  filterTorneoCombatSpells,
  isTorneoHardBlockedSpell,
} from "@/lib/sheet-generator/spell-torneo-combat";
import { sortKeyForPick } from "@/lib/sheet-generator/wizard-arcane-school";

export type SpellPickEntry = { name: string; level: number };

export type SpellPickOptions = {
  wizardSchoolKey?: string | null;
  getSpellSchool?: (name: string) => string | null;
};

/** Classi che «conoscono» un numero fisso di incantesimi (non preparati giornalmente). */
const KNOWN_SPELL_CLASSES = new Set(["Bardo", "Stregone", "Warlock", "Ranger"]);

/** Minimo di incantesimi di 1° livello sulla scheda stregone (PHB: pool L1 ampio, utile in torneo). */
export const SORCERER_MIN_LEVEL1_SPELLS = 2;

function spellKey(e: SpellPickEntry): string {
  return `${e.level}:${e.name.toLocaleLowerCase("it")}`;
}

/** Quanti incantesimi di livello L possono comparire in scheda rispetto agli slot disponibili. */
export function spellCapPerLevel(
  spellSlots: Record<number, number>,
  classLabel: string
): Map<number, number> {
  const isKnown = KNOWN_SPELL_CLASSES.has(classLabel);
  const caps = new Map<number, number>();

  for (let lvl = 1; lvl <= 9; lvl += 1) {
    const slots = spellSlots[lvl] ?? 0;
    if (slots <= 0) continue;

    if (classLabel === "Warlock") {
      caps.set(lvl, Math.max(1, Math.min(slots + 1, 4)));
    } else {
      // Regola generale: al massimo 1 incantesimo in più degli slot di quel livello (2 slot L3 → max 3 spell L3).
      caps.set(lvl, Math.max(1, slots + 1));
    }
  }

  return caps;
}

function sortCandidates(
  pool: SpellPickEntry[],
  powerPlayer: boolean,
  pickOptions?: SpellPickOptions
): SpellPickEntry[] {
  const schoolKey = pickOptions?.wizardSchoolKey ?? null;
  const getSpellSchool = pickOptions?.getSpellSchool ?? (() => null);
  return [...pool].sort((a, b) => {
    if (schoolKey) {
      const sa = sortKeyForPick(a, powerPlayer, schoolKey, getSpellSchool);
      const sb = sortKeyForPick(b, powerPlayer, schoolKey, getSpellSchool);
      if (sb !== sa) return sb - sa;
    } else if (powerPlayer) {
      const ta = getSpellCombatTierScore(a.name);
      const tb = getSpellCombatTierScore(b.name);
      if (tb !== ta) return tb - ta;
    } else if (a.level !== b.level) {
      return a.level - b.level;
    }
    if (a.level !== b.level) return b.level - a.level;
    return a.name.localeCompare(b.name, "it");
  });
}

function countAtLevel(picked: SpellPickEntry[], level: number): number {
  return picked.filter((p) => p.level === level).length;
}

/**
 * Seleziona incantesimi di livello ≥1 rispettando gli slot e (se power player) la tier list combattimento.
 */
export function pickLeveledSpellsSlotAware(
  entries: SpellPickEntry[],
  count: number,
  maxLevel: number,
  spellSlots: Record<number, number>,
  classLabel: string,
  powerPlayer: boolean,
  pickOptions?: SpellPickOptions
): SpellPickEntry[] {
  if (count <= 0) return [];

  const pool = entries.filter((e) => e.level >= 1 && e.level <= maxLevel);
  if (!pool.length) return [];

  const caps = spellCapPerLevel(spellSlots, classLabel);
  const picked: SpellPickEntry[] = [];
  const seen = new Set<string>();

  const tryAdd = (e: SpellPickEntry): boolean => {
    const key = spellKey(e);
    if (seen.has(key)) return false;
    const cap = caps.get(e.level);
    if (cap != null && countAtLevel(picked, e.level) >= cap) return false;
    seen.add(key);
    picked.push(e);
    return true;
  };

  // 1) Almeno un incantesimo per ogni livello con slot (dal più basso al più alto per varietà).
  for (let lvl = 1; lvl <= maxLevel; lvl += 1) {
    if (!caps.has(lvl) || picked.length >= count) continue;
    const atLevel = sortCandidates(
      pool.filter((e) => e.level === lvl && !seen.has(spellKey(e))),
      powerPlayer,
      pickOptions
    );
    for (const e of atLevel) {
      if (tryAdd(e)) break;
    }
  }

  // 2) Riempi fino a count rispettando i cap per livello.
  let guard = 0;
  while (picked.length < count && guard < count * 20) {
    guard += 1;
    const remaining = pool.filter((e) => !seen.has(spellKey(e)));
    const eligible = remaining.filter((e) => {
      const cap = caps.get(e.level);
      if (cap == null) return false;
      return countAtLevel(picked, e.level) < cap;
    });
    if (!eligible.length) break;
    const sorted = sortCandidates(eligible, powerPlayer, pickOptions);
    if (!tryAdd(sorted[0]!)) break;
  }

  // 3) Se la lista è ancora corta, riempi rispettando i cap per livello.
  if (picked.length < count) {
    for (const e of sortCandidates(
      pool.filter((x) => !seen.has(spellKey(x))),
      powerPlayer,
      pickOptions
    )) {
      if (picked.length >= count) break;
      tryAdd(e);
    }
  }

  return picked.slice(0, count);
}

/**
 * Garantisce almeno {@link SORCERER_MIN_LEVEL1_SPELLS} incantesimi di 1° livello per lo stregone.
 */
export function ensureSorcererMinLevel1Spells(
  picked: SpellPickEntry[],
  pool: SpellPickEntry[],
  maxLevel: number,
  spellSlots: Record<number, number>,
  maxTotal: number,
  powerPlayer: boolean,
  pickOptions?: SpellPickOptions
): SpellPickEntry[] {
  if (maxTotal <= 0) return picked;

  const caps = spellCapPerLevel(spellSlots, "Stregone");
  const capL1 = caps.get(1) ?? maxTotal;
  const goal = Math.min(SORCERER_MIN_LEVEL1_SPELLS, capL1, maxTotal);

  const poolL1 = pool.filter((e) => e.level === 1 && e.level <= maxLevel);
  if (poolL1.length < goal) return picked;

  let out = [...picked];

  const tryAddL1 = (insert: SpellPickEntry): boolean => {
    if (out.some((p) => spellKey(p) === spellKey(insert))) return false;
    if (countAtLevel(out, 1) >= capL1) return false;
    if (out.filter((e) => e.level >= 1).length >= maxTotal) return false;
    out.push(insert);
    return true;
  };

  while (countAtLevel(out, 1) < goal) {
    const candidates = sortCandidates(
      poolL1.filter((e) => !out.some((p) => spellKey(p) === spellKey(e))),
      powerPlayer,
      pickOptions
    );
    if (!candidates.length) break;
    const insert = candidates[0]!;
    if (tryAddL1(insert)) continue;

    let replaceIdx = -1;
    let replaceRank = -1;
    for (let i = 0; i < out.length; i += 1) {
      const e = out[i]!;
      if (e.level < 2) continue;
      const tier = getSpellCombatTierScore(e.name);
      const rank = e.level * 100 - tier;
      if (rank > replaceRank) {
        replaceRank = rank;
        replaceIdx = i;
      }
    }
    if (replaceIdx < 0) break;
    out[replaceIdx] = insert;
  }

  return out;
}

/** Rimuove incantesimi in eccesso rispetto al cap per livello (tier più bassi per primi). */
export function enforceSpellLevelCaps(
  picked: SpellPickEntry[],
  spellSlots: Record<number, number>,
  classLabel: string,
  maxTotal: number
): SpellPickEntry[] {
  const caps = spellCapPerLevel(spellSlots, classLabel);
  let out = [...picked];

  const trimLevel = (lvl: number) => {
    const cap = caps.get(lvl);
    if (cap == null) return;
    while (out.filter((e) => e.level === lvl).length > cap) {
      let worstIdx = -1;
      let worst = Infinity;
      for (let i = 0; i < out.length; i += 1) {
        if (out[i]!.level !== lvl) continue;
        const tier = getSpellCombatTierScore(out[i]!.name);
        if (tier < worst) {
          worst = tier;
          worstIdx = i;
        }
      }
      if (worstIdx < 0) break;
      out = out.filter((_, i) => i !== worstIdx);
    }
  };

  for (let lvl = 1; lvl <= 9; lvl += 1) trimLevel(lvl);
  return out.slice(0, maxTotal);
}

export function pickCantripsSlotAware(
  entries: SpellPickEntry[],
  count: number,
  powerPlayer: boolean,
  pickOptions?: SpellPickOptions
): SpellPickEntry[] {
  if (count <= 0) return [];
  const pool = entries.filter((e) => e.level === 0);
  if (!pool.length) return [];
  const sorted = sortCandidates(pool, powerPlayer, pickOptions);
  const picked: SpellPickEntry[] = [];
  const seen = new Set<string>();
  for (const e of sorted) {
    if (picked.length >= count) break;
    const key = e.name.toLocaleLowerCase("it");
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(e);
  }
  return picked;
}

function mergeCantripPicks(primary: SpellPickEntry[], extra: SpellPickEntry[], count: number): SpellPickEntry[] {
  const seen = new Set(primary.map((e) => e.name.toLocaleLowerCase("it")));
  const out = [...primary];
  for (const e of extra) {
    if (out.length >= count) break;
    const key = e.name.toLocaleLowerCase("it");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * Seleziona i trucchetti richiesti dalla classe. In torneo privilegia il pool combattimento;
 * se non bastano, completa con trucchetti orientati al combattimento dall’intera lista.
 */
export function pickCantripsForSheet(
  allEntries: SpellPickEntry[],
  count: number,
  torneoMode: boolean,
  combatPriority: boolean,
  pickOptions?: SpellPickOptions
): SpellPickEntry[] {
  if (count <= 0) return [];
  const allCantrips = allEntries.filter((e) => e.level === 0);
  if (!allCantrips.length) return [];

  if (!torneoMode) {
    return pickCantripsSlotAware(allCantrips, count, combatPriority, pickOptions);
  }

  const torneoCantrips = filterTorneoCombatSpells(allCantrips);
  const fromTorneo = pickCantripsSlotAware(
    torneoCantrips.length ? torneoCantrips : allCantrips,
    count,
    combatPriority,
    pickOptions
  );
  if (fromTorneo.length >= count) return fromTorneo;

  const fillPool = allCantrips.filter((e) => !isTorneoHardBlockedSpell(e.name));
  const fill = pickCantripsSlotAware(fillPool, count, true, pickOptions);
  return mergeCantripPicks(fromTorneo, fill, count);
}
