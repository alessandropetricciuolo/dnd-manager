import { createHash, randomBytes } from "crypto";

function remotePepper(): string {
  return (
    process.env.GM_REMOTE_TOKEN_PEPPER ??
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 48) ??
    "dev-gm-remote-pepper"
  );
}

export function hashGmRemoteToken(plainToken: string): string {
  return createHash("sha256").update(`${remotePepper()}:${plainToken}`, "utf8").digest("hex");
}

export function generateGmRemotePlainToken(): string {
  return randomBytes(32).toString("base64url");
}
