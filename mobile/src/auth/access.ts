import type { UserRole } from '../types';

/** A role is valid only when read from the trusted profiles row. */
export function resolveTrustedProfileRole(value: unknown): UserRole | null {
  return value === 'player' || value === 'gm' || value === 'admin' ? value : null;
}

export function prepareLoginCredentials(email: string, password: string):
  | { email: string; password: string; error?: never }
  | { error: 'Inserisci il tuo indirizzo email.' | 'Inserisci la tua password.' } {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) return { error: 'Inserisci il tuo indirizzo email.' };
  if (!password) return { error: 'Inserisci la tua password.' };
  return { email: normalizedEmail, password };
}
