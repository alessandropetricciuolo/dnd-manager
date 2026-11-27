"use server";

import { getReviewCampaignId, isReviewCampaignOwner } from "../../../mobile/src/auth/access";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateGmRemotePlainToken, hashGmRemoteToken } from "@/lib/gm-remote/hash-token";
import {
  parseInitiativeRemoteSnapshot,
  type InitiativeRemoteSnapshot,
} from "@/lib/gm-remote/initiative-commands";
import {
  parseSfxPadRemoteSnapshot,
  type SfxPadRemoteSnapshot,
} from "@/lib/gm-remote/sfx-pad-snapshot";

type GmResult<T = void> = { success: true; data?: T } | { success: false; error: string };

const SESSION_TTL_HOURS = 6;

type RemoteAccess = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
};

async function ensureGmRemoteAccess(campaignId: string): Promise<GmResult<RemoteAccess>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Non autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "gm" || profile?.role === "admin") {
    return { success: true, data: { supabase, userId: user.id } };
  }
  const reviewCampaignId = getReviewCampaignId(user.app_metadata);
  if (profile?.role !== "player" || campaignId !== reviewCampaignId) {
    return { success: false, error: "Non autorizzato." };
  }
  const { data: campaign } = await supabase.from("campaigns")
    .select("id, gm_id, is_public").eq("id", campaignId).maybeSingle();
  if (!isReviewCampaignOwner(profile.role, user.id, reviewCampaignId, campaign)) {
    return { success: false, error: "Non autorizzato." };
  }
  return { success: true, data: { supabase, userId: user.id } };
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
  const check = await ensureGmRemoteAccess(campaignId);
  if (!check.success) return check;
  const { supabase, userId } = check.data!;

  const plainToken = generateGmRemotePlainToken();
  const tokenHash = hashGmRemoteToken(plainToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();

  const { data, error } = await supabase
    .from("gm_remote_sessions")
    .insert({
      campaign_id: campaignId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: userId,
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
  const check = await ensureGmRemoteAccess(campaignId);
  if (!check.success) return check;
  const { supabase } = check.data!;

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

/** Pubblica lo snapshot initiative per il telecomando collegato. */
export async function publishGmRemoteInitiativeSnapshot(
  campaignId: string,
  publicId: string,
  snapshot: InitiativeRemoteSnapshot
): Promise<GmResult> {
  const check = await ensureGmRemoteAccess(campaignId);
  if (!check.success) return check;
  const { supabase } = check.data!;

  const parsed = parseInitiativeRemoteSnapshot(snapshot);
  if (!parsed) {
    return { success: false, error: "Snapshot non valido." };
  }

  const { error } = await supabase
    .from("gm_remote_sessions")
    .update({ initiative_snapshot: parsed as unknown as Record<string, unknown> })
    .eq("campaign_id", campaignId)
    .eq("public_id", publicId)
    .is("revoked_at", null);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}

/** Pubblica icone ed etichette pad SFX per il telecomando collegato. */
export async function publishGmRemoteSfxPadSnapshot(
  campaignId: string,
  publicId: string,
  snapshot: SfxPadRemoteSnapshot
): Promise<GmResult> {
  const check = await ensureGmRemoteAccess(campaignId);
  if (!check.success) return check;
  const { supabase } = check.data!;

  const parsed = parseSfxPadRemoteSnapshot(snapshot);
  if (!parsed) {
    return { success: false, error: "Snapshot pad non valido." };
  }

  const { error } = await supabase
    .from("gm_remote_sessions")
    .update({ sfx_pad_snapshot: parsed as unknown as Record<string, unknown> })
    .eq("campaign_id", campaignId)
    .eq("public_id", publicId)
    .is("revoked_at", null);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
