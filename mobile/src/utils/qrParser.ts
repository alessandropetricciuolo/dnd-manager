export interface ParsedGmRemoteQr {
  publicId: string;
  token?: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = 'https://www.barberanddragons.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function decode(value: string): string | null {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return null;
  }
}

function safeOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    const localHost = /^(localhost|127\.0\.0\.1)$/.test(parsed.hostname);
    const trustedHost = parsed.hostname === 'barberanddragons.com' || parsed.hostname.endsWith('.barberanddragons.com');
    const localHttp = parsed.protocol === 'http:' && localHost;
    if ((!trustedHost && !localHost) || (parsed.protocol !== 'https:' && !localHttp)) return null;
    return parsed.origin.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/** Parses a GM remote QR URL or a manually entered public ID. */
export function parseGmRemoteQr(
  scannedText: string,
  fallbackBaseUrl: string = DEFAULT_BASE_URL
): ParsedGmRemoteQr | null {
  const trimmed = scannedText?.trim() || '';
  if (!trimmed) return null;

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      if (url.username || url.password) return null;
      const baseUrl = safeOrigin(url.origin);
      if (!baseUrl) return null;
      const match = url.pathname.match(/^\/gm-remote\/j\/([0-9a-f-]{36})\/?$/i);
      const publicId = match?.[1] || '';
      if (!UUID.test(publicId)) return null;

      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const tokenRaw = hash.get('t') || url.searchParams.get('t') || '';
      const token = decode(tokenRaw);
      if (!token) return null;

      return { publicId, token, baseUrl };
    }

    // Manual entry accepts a UUID with an optional token in the legacy #t= form.
    const [idPart, ...hashParts] = trimmed.split('#');
    const publicId = idPart.trim();
    if (!UUID.test(publicId)) return null;
    const hashText = hashParts.join('#');
    const parsedHash = new URLSearchParams(hashText);
    const rawToken = parsedHash.get('t') || hashText.replace(/^t=/, '').split('&')[0];
    const token = hashText ? decode(rawToken) || undefined : undefined;
    const baseUrl = safeOrigin(fallbackBaseUrl);
    if (!baseUrl) return null;
    return { publicId, token, baseUrl };
  } catch {
    return null;
  }
}
