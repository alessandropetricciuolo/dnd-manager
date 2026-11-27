import type { UserRole } from '../types';

/** A role is valid only when read from the trusted profiles row. */
export function resolveTrustedProfileRole(value: unknown): UserRole | null {
  return value === 'player' || value === 'gm' || value === 'admin' ? value : null;
}

/** Read only Supabase app_metadata, which an account cannot edit. */
export function getReviewCampaignId(appMetadata: unknown): string | null {
  if (typeof appMetadata !== 'object' || appMetadata === null) return null;
  const value = (appMetadata as Record<string, unknown>).review_gm_campaign_id;
  return typeof value === 'string' &&
    /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

export function isReviewCampaignOwner(
  role: unknown,
  userId: string,
  reviewCampaignId: string | null,
  campaign: { id: string; gm_id: string | null; is_public: boolean } | null,
): boolean {
  return role === 'player' && reviewCampaignId !== null &&
    campaign?.id === reviewCampaignId && campaign.gm_id === userId && campaign.is_public === false;
}

export function prepareLoginCredentials(email: string, password: string):
  | { email: string; password: string; error?: never }
  | { error: 'Inserisci il tuo indirizzo email.' | 'Inserisci la tua password.' } {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) return { error: 'Inserisci il tuo indirizzo email.' };
  if (!password) return { error: 'Inserisci la tua password.' };
  return { email: normalizedEmail, password };
}
