import {
  createCipheriv, createDecipheriv, createPrivateKey, randomBytes, sign,
} from "node:crypto";

const APPLE_ISSUER = "https://appleid.apple.com";
const NATIVE_APPLE_CLIENT_ID = "com.barberanddragons.mobile";

function getAppleConfiguration() {
  const teamId = process.env.APPLE_SIGNIN_TEAM_ID?.trim();
  const keyId = process.env.APPLE_SIGNIN_KEY_ID?.trim();
  const privateKey = process.env.APPLE_SIGNIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const encryptionKey = Buffer.from(process.env.APPLE_SIGNIN_TOKEN_KEY ?? "", "base64url");

  if (!teamId || !keyId || !privateKey || encryptionKey.length !== 32) return null;
  try {
    const signingKey = createPrivateKey(privateKey);
    if (signingKey.asymmetricKeyType !== "ec" || signingKey.asymmetricKeyDetails?.namedCurve !== "prime256v1") return null;
    return { teamId, keyId, signingKey, encryptionKey };
  } catch {
    return null;
  }
}

export function isAppleSignInConfigured(): boolean {
  return Boolean(getAppleConfiguration());
}

function appleClientSecret(config: NonNullable<ReturnType<typeof getAppleConfiguration>>): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: config.keyId })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({
    iss: config.teamId, iat: now, exp: now + 300, aud: APPLE_ISSUER, sub: NATIVE_APPLE_CLIENT_ID,
  })).toString("base64url");
  const data = `${header}.${claims}`;
  const signature = sign("sha256", Buffer.from(data), {
    key: config.signingKey, dsaEncoding: "ieee-p1363",
  });
  return `${data}.${signature.toString("base64url")}`;
}

function encryptAppleToken(token: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptAppleToken(value: string, key: Buffer): string {
  const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", key, iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString("utf8");
}

async function requestApple(
  endpoint: "token" | "revoke",
  config: NonNullable<ReturnType<typeof getAppleConfiguration>>,
  fields: Record<string, string>,
) {
  return fetch(`${APPLE_ISSUER}/auth/${endpoint}`, {
    method: "POST",
    body: new URLSearchParams({
      client_id: NATIVE_APPLE_CLIENT_ID,
      client_secret: appleClientSecret(config),
      ...fields,
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
}

export function readAppleIdentityClaims(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      aud?: unknown; iss?: unknown; sub?: unknown; email?: unknown; email_verified?: unknown;
    };
    if (claims.iss !== APPLE_ISSUER || claims.aud !== NATIVE_APPLE_CLIENT_ID || typeof claims.sub !== "string" || !claims.sub) return null;
    const emailVerified = claims.email_verified === true || claims.email_verified === "true";
    return {
      subject: claims.sub,
      verifiedEmail: emailVerified && typeof claims.email === "string" ? claims.email : null,
    };
  } catch {
    return null;
  }
}

export async function exchangeAppleAuthorizationCode(code: string) {
  const config = getAppleConfiguration();
  if (!config) return null;
  const response = await requestApple("token", config, { code, grant_type: "authorization_code" });
  if (!response.ok) return null;
  const result = await response.json() as { id_token?: unknown; refresh_token?: unknown };
  if (typeof result.id_token !== "string" || typeof result.refresh_token !== "string" || !result.refresh_token) return null;

  // This token comes directly from Apple's HTTPS token endpoint. Supabase
  // independently verifies the native ID token and nonce before issuing a session.
  const claims = readAppleIdentityClaims(result.id_token);
  if (!claims) return null;
  return {
    ...claims,
    encryptedRefreshToken: encryptAppleToken(result.refresh_token, config.encryptionKey),
  };
}

export async function revokeAppleAuthorization(encryptedToken: string): Promise<boolean> {
  const config = getAppleConfiguration();
  if (!config) return false;
  const token = decryptAppleToken(encryptedToken, config.encryptionKey);
  const response = await requestApple("revoke", config, { token, token_type_hint: "refresh_token" });
  return response.ok;
}
