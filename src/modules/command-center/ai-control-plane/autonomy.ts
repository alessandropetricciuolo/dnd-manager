/** Livelli autonomia AI (0–4). Fase 3: massimo Livello 1 (bozze). */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4;

export const CURRENT_MAX_AUTONOMY: AutonomyLevel = 1;

export function canProposeDrafts(level: AutonomyLevel = CURRENT_MAX_AUTONOMY): boolean {
  return level >= 1;
}

export function canExecuteWithoutApproval(_level: AutonomyLevel = CURRENT_MAX_AUTONOMY): boolean {
  return false;
}

export function assertDraftOnlyMode(): void {
  if (CURRENT_MAX_AUTONOMY < 1) {
    throw new Error("L'AI è in modalità sola lettura (Livello 0).");
  }
  if (CURRENT_MAX_AUTONOMY >= 2) {
    throw new Error("Configurazione autonomia non valida per Fase 3.");
  }
}
