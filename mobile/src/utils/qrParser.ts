export interface ParsedGmRemoteQr {
  publicId: string;
  token?: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = 'https://www.barberanddragons.com';

/**
 * Extracts publicId, token and baseUrl from a scanned QR code or pasted link.
 *
 * Expected format from GM screen:
 * `${window.location.origin}/gm-remote/j/${publicId}#t=${plainToken}`
 */
export function parseGmRemoteQr(
  scannedText: string,
  fallbackBaseUrl: string = DEFAULT_BASE_URL
): ParsedGmRemoteQr | null {
  const trimmed = scannedText?.trim() || '';
  if (!trimmed) return null;

  let baseUrl = fallbackBaseUrl;
  let publicId = '';
  let token = '';

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      baseUrl = url.origin;

      // Extract publicId from pathname e.g. /gm-remote/j/<uuid>
      const pathMatch = url.pathname.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
      if (pathMatch) {
        publicId = pathMatch[1];
      }

      // Hash fragment e.g. #t=<token>
      if (url.hash) {
        const hashStr = url.hash.replace(/^#/, '');
        if (hashStr.startsWith('t=')) {
          token = decodeURIComponent(hashStr.slice(2));
        } else {
          const match = hashStr.match(/(?:^|&)t=([^&]+)/);
          if (match) {
            token = decodeURIComponent(match[1]);
          }
        }
      }

      // Query param fallback ?t=<token>
      if (!token && url.searchParams.has('t')) {
        token = url.searchParams.get('t') || '';
      }
    } else {
      // Non-URL format (e.g. pasted <uuid>#t=<token>)
      if (trimmed.includes('#t=')) {
        const [left, right] = trimmed.split('#t=');
        token = decodeURIComponent(right || '').trim();
        const uuidMatch = left.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
        publicId = uuidMatch ? uuidMatch[1] : left.trim();
      } else {
        const uuidMatch = trimmed.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
        publicId = uuidMatch ? uuidMatch[1] : trimmed;
      }
    }
  } catch {
    // Basic regex fallback if URL constructor fails
    const uuidMatch = trimmed.match(/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/);
    if (uuidMatch) {
      publicId = uuidMatch[1];
    }
    if (trimmed.includes('#t=')) {
      token = decodeURIComponent(trimmed.split('#t=')[1] || '').trim();
    }
  }

  if (!publicId) return null;

  return {
    publicId,
    token: token || undefined,
    baseUrl: baseUrl.replace(/\/+$/, ''),
  };
}
