const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]$/i,
];

function isPrivateLikeHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h) return true;
  if (h.endsWith(".local")) return true;
  return PRIVATE_HOST_PATTERNS.some((rx) => rx.test(h));
}

export function parseSafeExternalUrl(
  raw: string,
  options?: {
    allowedProtocols?: string[];
    allowedHosts?: string[];
  }
): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const u = new URL(value);
    const protocols = options?.allowedProtocols ?? ["https:"];
    if (!protocols.includes(u.protocol)) return null;
    if (u.username || u.password) return null;
    if (isPrivateLikeHostname(u.hostname)) return null;
    if (options?.allowedHosts?.length) {
      const host = u.hostname.toLowerCase();
      const allowed = options.allowedHosts.some((h) => host === h || host.endsWith(`.${h}`));
      if (!allowed) return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}

export function isSafeTelegramProxyPath(raw: string): boolean {
  const value = raw.trim();
  return /^\/api\/tg-image\/[A-Za-z0-9_%:.-]+$/.test(value);
}
