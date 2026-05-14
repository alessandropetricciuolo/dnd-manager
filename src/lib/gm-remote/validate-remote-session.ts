import { timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashGmRemoteToken } from "@/lib/gm-remote/hash-token";

export type ValidGmRemoteSession = {
  campaign_id: string;
  token_hash: string;
  revoked_at: string | null;
  expires_at: string;
};

export function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * Valida public_id + token contro gm_remote_sessions (hash).
 * Usato da API telecomando (comandi, elenco Spotify, …).
 */
export async function validateGmRemoteSession(
  publicId: string,
  plainToken: string
): Promise<{ ok: true; session: ValidGmRemoteSession } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient() as SupabaseClient<any>;
  const { data: sess, error: se } = await admin
    .from("gm_remote_sessions")
    .select("token_hash, campaign_id, revoked_at, expires_at")
    .eq("public_id", publicId)
    .maybeSingle();

  if (se || !sess) {
    return { ok: false, error: "session_not_found" };
  }
  if (sess.revoked_at) {
    return { ok: false, error: "session_revoked" };
  }
  const exp = Date.parse(sess.expires_at);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return { ok: false, error: "session_expired" };
  }
  const expectedHash = hashGmRemoteToken(plainToken);
  if (!timingSafeEqualHex(expectedHash, sess.token_hash)) {
    return { ok: false, error: "invalid_token" };
  }
  return { ok: true, session: sess as ValidGmRemoteSession };
}
