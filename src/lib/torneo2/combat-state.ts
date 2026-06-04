import type { CombatSpellSlots } from "@/lib/combat-spell-slots";
import { normalizeCombatSpellSlots } from "@/lib/combat-spell-slots";

/** Condizioni standard D&D 5e selezionabili per combattente. */
export const TORNEO2_CONDITIONS = [
  "Accecato",
  "Affascinato",
  "Assordato",
  "Avvelenato",
  "Incapacitato",
  "Invisibile",
  "Paralizzato",
  "Pietrificato",
  "Privo di sensi",
  "Prono",
  "Spaventato",
  "Stordito",
  "Trattenuto",
  "Afferrato",
  "Concentrazione",
  "Ispirazione",
] as const;

export type Torneo2Side = "a" | "b" | "ffa";

export type Torneo2DeathSaves = {
  success: number;
  fail: number;
  stable: boolean;
};

export type Torneo2Combatant = {
  /** Id univoco nel match. */
  id: string;
  /** campaign_characters.id (null per PNG/custom). */
  characterId: string | null;
  name: string;
  side: Torneo2Side;
  teamId: string | null;
  teamName: string | null;
  teamColor: string | null;
  portraitUrl: string | null;
  characterClass: string | null;
  armorClass: number;
  hp: number;
  maxHp: number;
  initiative: number;
  damageDealt: number;
  damageTaken: number;
  conditions: string[];
  deathSaves: Torneo2DeathSaves;
  isDead: boolean;
  noteText: string;
  usedReaction: boolean;
  usedBonus: boolean;
  spellSlots?: CombatSpellSlots;
};

export type Torneo2CombatState = {
  combatants: Torneo2Combatant[];
  currentTurnIndex: number;
  roundNumber: number;
};

export function emptyTorneo2CombatState(): Torneo2CombatState {
  return { combatants: [], currentTurnIndex: 0, roundNumber: 1 };
}

function toFiniteInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toCleanString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function sanitizeDeathSaves(raw: unknown): Torneo2DeathSaves {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const success = Math.min(3, Math.max(0, toFiniteInt(obj.success, 0)));
  const fail = Math.min(3, Math.max(0, toFiniteInt(obj.fail, 0)));
  return { success, fail, stable: obj.stable === true };
}

function sanitizeConditions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const s = toCleanString(item).trim();
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

export function sanitizeTorneo2Combatant(raw: unknown): Torneo2Combatant | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const id = toCleanString(obj.id).trim();
  const name = toCleanString(obj.name).trim();
  if (!id || !name) return null;

  const sideRaw = toCleanString(obj.side, "ffa");
  const side: Torneo2Side = sideRaw === "a" || sideRaw === "b" ? sideRaw : "ffa";

  const maxHp = Math.max(0, toFiniteInt(obj.maxHp, 0));
  const hp = Math.max(0, Math.min(maxHp > 0 ? maxHp : Number.MAX_SAFE_INTEGER, toFiniteInt(obj.hp, maxHp)));

  return {
    id,
    characterId: obj.characterId ? toCleanString(obj.characterId) : null,
    name,
    side,
    teamId: obj.teamId ? toCleanString(obj.teamId) : null,
    teamName: obj.teamName ? toCleanString(obj.teamName) : null,
    teamColor: obj.teamColor ? toCleanString(obj.teamColor) : null,
    portraitUrl: obj.portraitUrl ? toCleanString(obj.portraitUrl) : null,
    characterClass: obj.characterClass ? toCleanString(obj.characterClass) : null,
    armorClass: Math.max(0, toFiniteInt(obj.armorClass, 10)),
    hp,
    maxHp,
    initiative: toFiniteInt(obj.initiative, 0),
    damageDealt: Math.max(0, toFiniteInt(obj.damageDealt, 0)),
    damageTaken: Math.max(0, toFiniteInt(obj.damageTaken, 0)),
    conditions: sanitizeConditions(obj.conditions),
    deathSaves: sanitizeDeathSaves(obj.deathSaves),
    isDead: obj.isDead === true,
    noteText: toCleanString(obj.noteText, ""),
    usedReaction: obj.usedReaction === true,
    usedBonus: obj.usedBonus === true,
    spellSlots: normalizeCombatSpellSlots(obj.spellSlots as CombatSpellSlots | undefined),
  };
}

export function sanitizeTorneo2CombatState(raw: unknown): Torneo2CombatState {
  if (!raw || typeof raw !== "object") return emptyTorneo2CombatState();
  const obj = raw as Record<string, unknown>;
  const combatants = Array.isArray(obj.combatants)
    ? obj.combatants
        .map((c) => sanitizeTorneo2Combatant(c))
        .filter((c): c is Torneo2Combatant => c !== null)
    : [];
  const roundNumber = Math.max(1, toFiniteInt(obj.roundNumber, 1));
  const maxIndex = Math.max(0, combatants.length - 1);
  const currentTurnIndex = combatants.length
    ? Math.min(maxIndex, Math.max(0, toFiniteInt(obj.currentTurnIndex, 0)))
    : 0;
  return { combatants, currentTurnIndex, roundNumber };
}

/** Firma stabile per capire se lo stato è cambiato in modo significativo (evita salvataggi inutili). */
export function torneo2CombatSignature(state: Torneo2CombatState): string {
  return JSON.stringify({
    t: state.currentTurnIndex,
    r: state.roundNumber,
    c: state.combatants.map((c) => [
      c.id,
      c.hp,
      c.maxHp,
      c.armorClass,
      c.initiative,
      c.damageDealt,
      c.damageTaken,
      c.conditions.join(","),
      c.deathSaves.success,
      c.deathSaves.fail,
      c.deathSaves.stable ? 1 : 0,
      c.isDead ? 1 : 0,
      c.noteText,
      c.usedReaction ? 1 : 0,
      c.usedBonus ? 1 : 0,
      JSON.stringify(c.spellSlots ?? null),
    ]),
  });
}

export function torneo2CombatStatesEqual(a: Torneo2CombatState, b: Torneo2CombatState): boolean {
  return torneo2CombatSignature(a) === torneo2CombatSignature(b);
}

/** Somma danni inflitti per lato (scoreboard squadre). */
export function torneo2DamageBySide(state: Torneo2CombatState): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const c of state.combatants) {
    if (c.side === "a") a += c.damageDealt;
    else if (c.side === "b") b += c.damageDealt;
  }
  return { a, b };
}

/** Combattenti ancora vivi (hp > 0 e non marcati morti) per lato. */
export function torneo2AliveBySide(state: Torneo2CombatState): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const c of state.combatants) {
    const alive = !c.isDead && c.hp > 0;
    if (!alive) continue;
    if (c.side === "a") a += 1;
    else if (c.side === "b") b += 1;
  }
  return { a, b };
}
