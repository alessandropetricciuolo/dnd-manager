/** Livelli autonomia AI (0–4). Fase 4: massimo Livello 2 (esecuzione con conferma GM). */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export const CURRENT_MAX_AUTONOMY: AutonomyLevel = 2;

export function canProposeDrafts(level: AutonomyLevel = CURRENT_MAX_AUTONOMY): boolean {
  return level >= 1;
}

export function canExecuteWithApproval(level: AutonomyLevel = CURRENT_MAX_AUTONOMY): boolean {
  return level >= 2;
}

export function canExecuteWithoutApproval(_level: AutonomyLevel = CURRENT_MAX_AUTONOMY): boolean {
  return false;
}

export function assertCanProposeDrafts(): void {
  if (CURRENT_MAX_AUTONOMY < 1) {
    throw new Error("L'AI è in modalità sola lettura (Livello 0).");
  }
}

export function assertCanExecuteWithApproval(): void {
  if (CURRENT_MAX_AUTONOMY < 2) {
    throw new Error("Esecuzione proposte AI non ancora abilitata (richiesto Livello 2).");
  }
}

/** @deprecated usa assertCanProposeDrafts */
export function assertDraftOnlyMode(): void {
  assertCanProposeDrafts();
}
