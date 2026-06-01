import { getSpellCombatTierScore } from "@/lib/sheet-generator/spell-combat-tier";

export type SpellPickEntry = { name: string; level: number };

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
      // Conosciuti al livello del patto: non riempire tutta la lista col massimo livello slot.
      caps.set(lvl, Math.max(1, Math.min(slots + 1, 4)));
    } else if (isKnown) {
      // Es. lv 5 con 2 slot L3 → al massimo 2 incantesimi L3 conosciuti.
      caps.set(lvl, Math.max(1, slots));
    } else {
      // Preparati: più flessibilità, ma non tutti al massimo livello.
      caps.set(lvl, Math.max(2, slots + 1));
    }
  }

  return caps;
}

function sortCandidates(
  pool: SpellPickEntry[],
  powerPlayer: boolean
): SpellPickEntry[] {
  return [...pool].sort((a, b) => {
    if (powerPlayer) {
      const ta = getSpellCombatTierScore(a.name);
      const tb = getSpellCombatTierScore(b.name);
      if (tb !== ta) return tb - ta;
    } else {
      if (a.level !== b.level) return a.level - b.level;
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
  powerPlayer: boolean
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
      powerPlayer
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
    const sorted = sortCandidates(eligible, powerPlayer);
    if (!tryAdd(sorted[0]!)) break;
  }

  // 3) Se mancano slot (liste corte), rilassa i cap del livello più basso disponibile.
  if (picked.length < count) {
    for (const e of sortCandidates(pool.filter((x) => !seen.has(spellKey(x))), powerPlayer)) {
      if (picked.length >= count) break;
      const key = spellKey(e);
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(e);
    }
  }

  return picked.slice(0, count);
}

export function pickCantripsSlotAware(
  entries: SpellPickEntry[],
  count: number,
  powerPlayer: boolean
): SpellPickEntry[] {
  if (count <= 0) return [];
  const pool = entries.filter((e) => e.level === 0);
  if (!pool.length) return [];
  const sorted = sortCandidates(pool, powerPlayer);
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
