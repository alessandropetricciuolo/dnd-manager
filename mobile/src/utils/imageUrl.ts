/**
 * Image URL resolver for Barber & Dragons Mobile.
 * Handles relative web API paths (/api/tg-image/..., /uploads/...)
 * and Google Drive thumbnail / public web URLs.
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const baseUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${path}`;
}
