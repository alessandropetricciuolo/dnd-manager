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

  // Regola fissa Stregone: mantieni sempre una base di almeno 2 incantesimi di 1° livello.
  if (classLabel === "Stregone") {
    const firstLevelTarget = Math.min(2, count);
    const firstLevelSpells = sortCandidates(
      pool.filter((e) => e.level === 1),
      powerPlayer,
      pickOptions
    );
    for (const e of firstLevelSpells) {
      if (countAtLevel(picked, 1) >= firstLevelTarget) break;
      tryAdd(e);
    }
  }

  // 1) Almeno un incantesimo per ogni altro livello con slot (dal più basso al più alto per varietà).
  for (let lvl = 1; lvl <= maxLevel; lvl += 1) {
    if (!caps.has(lvl) || picked.length >= count) continue;
    if (countAtLevel(picked, lvl) > 0) continue;
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

export function ensureLeveledSpellPicked(
  picked: SpellPickEntry[],
  pool: SpellPickEntry[],
  spellName: string,
  maxLevel: number,
  spellSlots: Record<number, number>,
  classLabel: string,
  maxTotal: number
): SpellPickEntry[] {
  const targetKey = spellName.trim().toLocaleLowerCase("it");
  const out = picked.slice(0, maxTotal);
  if (out.some((e) => e.name.toLocaleLowerCase("it") === targetKey)) return out;

  const insert = pool.find(
    (e) => e.level >= 1 && e.level <= maxLevel && e.name.toLocaleLowerCase("it") === targetKey
  );
  if (!insert) return out;

  const caps = spellCapPerLevel(spellSlots, classLabel);
  const cap = caps.get(insert.level);
  const countAtInsertLevel = () => countAtLevel(out, insert.level);
  if (out.length < maxTotal && (cap == null || countAtInsertLevel() < cap)) {
    return [...out, insert].slice(0, maxTotal);
  }

  let replaceIdx = -1;
  let worstScore = Infinity;
  const mustReplaceSameLevel = cap != null && countAtInsertLevel() >= cap;
  for (let i = 0; i < out.length; i += 1) {
    const candidate = out[i]!;
    if (candidate.name.toLocaleLowerCase("it") === targetKey) continue;
    if (mustReplaceSameLevel && candidate.level !== insert.level) continue;
    const score = getSpellCombatTierScore(candidate.name);
    if (score < worstScore) {
      worstScore = score;
      replaceIdx = i;
    }
  }

  if (replaceIdx < 0) return out;
  const next = [...out];
  next[replaceIdx] = insert;
  return next.slice(0, maxTotal);
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
