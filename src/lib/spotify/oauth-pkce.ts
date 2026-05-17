/** PKCE + token exchange per Spotify (client pubblico, senza secret). */

export const SPOTIFY_PKCE_VERIFIER_KEY = "gm-spotify-pkce-verifier";
export const SPOTIFY_RETURN_PATH_KEY = "gm-spotify-return-path";
export const SPOTIFY_TOKENS_KEY = "gm-spotify-tokens";

export const SPOTIFY_SCOPES = "streaming user-read-email user-read-private";

export type SpotifyTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

export type StoredSpotifyTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function getSpotifyClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID?.trim();
  return id || null;
}

export function isSpotifyOAuthConfigured(): boolean {
  return Boolean(getSpotifyClientId());
}

export function getSpotifyRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/spotify/callback`;
}

export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function codeChallengeFromVerifier(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

export function readStoredTokens(): StoredSpotifyTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SPOTIFY_TOKENS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (typeof o !== "object" || o === null) return null;
    const rec = o as Record<string, unknown>;
    const access_token = typeof rec.access_token === "string" ? rec.access_token : "";
    const refresh_token = typeof rec.refresh_token === "string" ? rec.refresh_token : "";
    const expires_at = typeof rec.expires_at === "number" ? rec.expires_at : 0;
    if (!access_token || !refresh_token) return null;
    return { access_token, refresh_token, expires_at };
  } catch {
    return null;
  }
}

export function writeStoredTokens(tokens: StoredSpotifyTokens): void {
  sessionStorage.setItem(SPOTIFY_TOKENS_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens(): void {
  sessionStorage.removeItem(SPOTIFY_TOKENS_KEY);
}

export function tokensFromResponse(res: SpotifyTokenResponse): StoredSpotifyTokens {
  const refresh = res.refresh_token ?? "";
  return {
    access_token: res.access_token,
    refresh_token: refresh,
    expires_at: Date.now() + res.expires_in * 1000 - 60_000,
  };
}

export async function exchangeAuthorizationCode(code: string, verifier: string): Promise<StoredSpotifyTokens> {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error("spotify_not_configured");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: getSpotifyRedirectUri(),
    code_verifier: verifier,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`token_exchange_${res.status}`);
  const json = (await res.json()) as SpotifyTokenResponse;
  return tokensFromResponse(json);
}

export async function refreshAccessToken(refreshToken: string): Promise<StoredSpotifyTokens> {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error("spotify_not_configured");

  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`token_refresh_${res.status}`);
  const json = (await res.json()) as SpotifyTokenResponse;
  const next = tokensFromResponse(json);
  if (!json.refresh_token) next.refresh_token = refreshToken;
  return next;
}

export async function getValidAccessToken(): Promise<string | null> {
  let tokens = readStoredTokens();
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at) return tokens.access_token;
  try {
    tokens = await refreshAccessToken(tokens.refresh_token);
    writeStoredTokens(tokens);
    return tokens.access_token;
  } catch {
    clearStoredTokens();
    return null;
  }
}

export async function buildAuthorizeUrl(): Promise<string> {
  const clientId = getSpotifyClientId();
  if (!clientId) throw new Error("spotify_not_configured");

  const verifier = generateCodeVerifier();
  const challenge = await codeChallengeFromVerifier(verifier);
  sessionStorage.setItem(SPOTIFY_PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(SPOTIFY_RETURN_PATH_KEY, window.location.pathname + window.location.search);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getSpotifyRedirectUri(),
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function playPlaylistOnDevice(
  accessToken: string,
  deviceId: string,
  playlistId: string
): Promise<void> {
  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ context_uri: `spotify:playlist:${playlistId}` }),
    }
  );
  if (!res.ok && res.status !== 204) {
    throw new Error(`play_failed_${res.status}`);
  }
}

export async function transferPlaybackToDevice(accessToken: string, deviceId: string): Promise<void> {
  const res = await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`transfer_failed_${res.status}`);
  }
}
