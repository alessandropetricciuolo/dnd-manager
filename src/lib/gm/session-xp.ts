import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import type { InitiativeEntry } from "@/components/gm/initiative-tracker";

export type PerCharacterState = {
  present?: boolean;
  plus: number;
  minus: number;
  customXp: number | null;
};

export type StoredXpState = {
  version: 2;
  extraXpManual: number;
  bankedMonsterXp: number;
  perCharacter: Record<string, PerCharacterState>;
};

type InitiativeStorageEntry = Pick<
  InitiativeEntry,
  "entityId" | "type" | "hp" | "exp" | "isDead"
>;
type AttendanceMap = Record<string, "attended" | "absent">;
const XP_STEP = 50;
function defaultPerCharacterState(): PerCharacterState {
  return { plus: 0, minus: 0, customXp: null, present: true };
}
function isMonsterDead(entry: InitiativeStorageEntry | InitiativeEntry) {
  if (entry.type !== "monster" && entry.type !== "custom") return false;
  return entry.isDead === true || entry.hp <= 0;
}

export function computeSessionXpAwards({
  characters,
  attendance,
  xpState,
  initiativeEntries,
}: {
  characters: CampaignCharacterRow[];
  attendance?: AttendanceMap;
  xpState: StoredXpState;
  initiativeEntries?: InitiativeEntry[];
}) {
  const deadMonsterXp = monsterXp(initiativeEntries ?? []);

  const totalBaseXp =
    deadMonsterXp +
    Math.max(0, Math.trunc(xpState.extraXpManual || 0)) +
    Math.max(0, Math.trunc(xpState.bankedMonsterXp || 0));
  const presentCharacters = characters.filter((character) => {
    if (attendance && character.assigned_to) {
      return attendance[character.assigned_to] !== "absent";
    }
    return (xpState.perCharacter[character.id]?.present ?? true) === true;
  });

  const basePerPlayer =
    presentCharacters.length > 0
      ? Math.floor(totalBaseXp / presentCharacters.length)
      : 0;
  const finalXpByCharacterId: Record<string, number> = {};

  for (const character of characters) {
    const state =
      xpState.perCharacter[character.id] ?? defaultPerCharacterState();
    const isPresent =
      attendance && character.assigned_to
        ? attendance[character.assigned_to] !== "absent"
        : (state.present ?? true);
    if (!isPresent) {
      finalXpByCharacterId[character.id] = 0;
      continue;
    }
    const delta = (state.plus - state.minus) * XP_STEP;
    const computed = Math.max(0, basePerPlayer + delta);
    finalXpByCharacterId[character.id] =
      state.customXp != null && Number.isFinite(state.customXp)
        ? Math.max(0, Math.trunc(state.customXp))
        : computed;
  }

  return {
    deadMonsterXp,
    totalBaseXp,
    basePerPlayer,
    finalXpByCharacterId,
    awards: characters
      .filter((character) => character.assigned_to)
      .map((character) => ({
        playerId: character.assigned_to as string,
        xp: finalXpByCharacterId[character.id] ?? 0,
      }))
      .filter((award) => attendance?.[award.playerId] !== "absent"),
  };
}

export function monsterXp(entries: InitiativeEntry[]) {
  return entries.reduce(
    (total, entry) =>
      total +
      (isMonsterDead(entry) ? Math.max(0, Math.trunc(entry.exp ?? 0)) : 0),
    0,
  );
}
