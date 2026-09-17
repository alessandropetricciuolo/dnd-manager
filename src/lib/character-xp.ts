export type CharacterXpSyncStatus = "synced" | "mismatch" | "unassigned";

export type CharacterXpResolution = {
  currentXp: number;
  memberXp: number | null;
  syncStatus: CharacterXpSyncStatus;
};

function normalizeXp(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

/**
 * Resolves the value exposed by the character sheet.
 * currentXp is always canonical; memberXp is compatibility/audit metadata only.
 */
export function resolveCharacterXp(input: {
  currentXp: number | null | undefined;
  memberXp: number | null | undefined;
  assignedTo: string | null | undefined;
}): CharacterXpResolution {
  const currentXp = normalizeXp(input.currentXp);
  const memberXp = input.assignedTo ? normalizeXp(input.memberXp) : null;
  return {
    currentXp,
    memberXp,
    syncStatus: !input.assignedTo ? "unassigned" : memberXp === currentXp ? "synced" : "mismatch",
  };
}

export function formatXpConfirmationLabel(input: {
  characterName: string | null | undefined;
  xpAwarded: number;
  xpAfter: number | null | undefined;
}): string {
  const label = input.characterName?.trim() || "Personaggio non assegnato";
  const award = normalizeXp(input.xpAwarded);
  const after = input.xpAfter == null ? "?" : String(normalizeXp(input.xpAfter));
  return `${label}: +${award} EXP (totale ${after})`;
}
