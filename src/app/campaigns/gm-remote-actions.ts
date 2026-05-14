"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateGmRemotePlainToken, hashGmRemoteToken } from "@/lib/gm-remote/hash-token";

type GmResult<T = void> = { success: true; data?: T } | { success: false; error: string };

const SESSION_TTL_HOURS = 6;

async function ensureGmOrAdmin(): Promise<GmResult<Awaited<ReturnType<typeof createSupabaseServerClient>>>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Non autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { success: false, error: "Non autorizzato." };
  }
  return { success: true, data: supabase };
}

export type GmRemoteSessionCreated = {
  publicId: string;
  plainToken: string;
  expiresAt: string;
};

/**
 * Crea sessione pairing: il token in chiaro va mostrato una sola volta (QR / link con #fragment).
 */
export async function createGmRemoteSession(campaignId: string): Promise<GmResult<GmRemoteSessionCreated>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sessione non valida." };

  const plainToken = generateGmRemotePlainToken();
  const tokenHash = hashGmRemoteToken(plainToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("gm_remote_sessions")
    .insert({
      campaign_id: campaignId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: user.id,
    })
    .select("public_id, expires_at")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Errore creazione sessione." };
  }

  return {
    success: true,
    data: {
      publicId: data.public_id,
      plainToken,
      expiresAt: data.expires_at,
    },
  };
}

export async function revokeGmRemoteSession(campaignId: string, publicId: string): Promise<GmResult> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const { error } = await supabase
    .from("gm_remote_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("public_id", publicId);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
