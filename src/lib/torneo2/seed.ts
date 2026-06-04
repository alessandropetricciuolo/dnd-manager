import { spellSlotsForCharacter } from "@/lib/combat-spell-slots";
import {
  emptyTorneo2CombatState,
  type Torneo2Combatant,
  type Torneo2CombatState,
  type Torneo2Side,
} from "@/lib/torneo2/combat-state";
import type { Torneo2Match, Torneo2Participant, Torneo2Team, Torneo2TeamMember } from "@/lib/torneo2/types";

function memberToCombatant(
  member: Torneo2TeamMember,
  side: Torneo2Side,
  team: { id: string; name: string; color: string } | null
): Torneo2Combatant {
  const maxHp = member.hitPoints ?? 0;
  return {
    id: `c-${member.characterId}`,
    characterId: member.characterId,
    name: member.name,
    side,
    teamId: team?.id ?? null,
    teamName: team?.name ?? null,
    teamColor: team?.color ?? null,
    portraitUrl: member.imageUrl ?? null,
    characterClass: member.characterClass ?? null,
    armorClass: member.armorClass ?? 10,
    hp: maxHp,
    maxHp,
    initiative: 0,
    damageDealt: 0,
    damageTaken: 0,
    conditions: [],
    deathSaves: { success: 0, fail: 0, stable: false },
    isDead: false,
    noteText: "",
    usedReaction: false,
    usedBonus: false,
    spellSlots: spellSlotsForCharacter({
      rules_snapshot: member.rulesSnapshot,
      character_class: member.characterClass,
      class_subclass: member.classSubclass,
      level: member.level,
    }),
  };
}

/** Mappa characterId -> membro (con dati PG) attraverso tutte le squadre. */
export function buildMemberIndex(teams: Torneo2Team[]): Map<string, { member: Torneo2TeamMember; team: Torneo2Team }> {
  const idx = new Map<string, { member: Torneo2TeamMember; team: Torneo2Team }>();
  for (const team of teams) {
    for (const member of team.members) {
      idx.set(member.characterId, { member, team });
    }
  }
  return idx;
}

/**
 * Costruisce lo stato combattimento iniziale per un incontro.
 * - team: membri squadra A (lato a) + squadra B (lato b).
 * - final_ffa: i partecipanti individuali (lato ffa).
 */
export function buildTorneo2CombatSeed(
  match: Torneo2Match,
  teams: Torneo2Team[],
  participants: Torneo2Participant[]
): Torneo2CombatState {
  const base = emptyTorneo2CombatState();

  if (match.kind === "final_ffa") {
    const idx = buildMemberIndex(teams);
    const combatants: Torneo2Combatant[] = [];
    const ordered = [...participants].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const p of ordered) {
      if (!p.characterId) continue;
      const found = idx.get(p.characterId);
      if (!found) continue;
      combatants.push(memberToCombatant(found.member, "ffa", found.team));
    }
    return { ...base, combatants };
  }

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const teamA = match.teamAId ? teamById.get(match.teamAId) ?? null : null;
  const teamB = match.teamBId ? teamById.get(match.teamBId) ?? null : null;
  const combatants: Torneo2Combatant[] = [];
  if (teamA) {
    for (const m of teamA.members) combatants.push(memberToCombatant(m, "a", teamA));
  }
  if (teamB) {
    for (const m of teamB.members) combatants.push(memberToCombatant(m, "b", teamB));
  }
  return { ...base, combatants };
}

/** Insieme degli characterId attesi nel roster del match (per validare snapshot salvati). */
export function rosterCharacterIdsForMatch(
  match: Torneo2Match,
  teams: Torneo2Team[],
  participants: Torneo2Participant[]
): string[] {
  if (match.kind === "final_ffa") {
    return participants.map((p) => p.characterId).filter((id): id is string => !!id);
  }
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const ids: string[] = [];
  for (const teamId of [match.teamAId, match.teamBId]) {
    if (!teamId) continue;
    const team = teamById.get(teamId);
    if (!team) continue;
    for (const m of team.members) ids.push(m.characterId);
  }
  return ids;
}
