import type { SupabaseClient } from "@supabase/supabase-js";

export type AiAssistantV2Role = "gm" | "admin";

export type PilotAccessRow = {
  campaign_id: string | null;
  enabled: boolean;
};

export type PilotEntitlement =
  | { ok: true; via: "admin" | "global" | "campaign" }
  | { ok: false; error: string };

/** Pure, fail-closed pilot entitlement resolver. A campaign-specific row wins
 * over a global row so an administrator can explicitly disable one campaign. */
export function resolvePilotEntitlement(
  role: string | null | undefined,
  globalAccess: Pick<PilotAccessRow, "enabled"> | null,
  campaignAccess: Pick<PilotAccessRow, "enabled"> | null
): PilotEntitlement {
  if (role === "admin") return { ok: true, via: "admin" };
  if (role !== "gm") return { ok: false, error: "Solo GM e Admin possono usare l'Assistente GM v2." };
  if (campaignAccess) {
    return campaignAccess.enabled
      ? { ok: true, via: "campaign" }
      : { ok: false, error: "Il pilot Assistente v2 non è abilitato per questa campagna." };
  }
  return globalAccess?.enabled
    ? { ok: true, via: "global" }
    : { ok: false, error: "Il pilot Assistente v2 non è abilitato per questo utente." };
}

/** Must run before any privileged retrieval, provider invocation or pilot write. */
export async function checkAiAssistantV2PilotAccess(
  admin: SupabaseClient,
  input: { userId: string; role: AiAssistantV2Role; campaignId: string | null }
): Promise<PilotEntitlement> {
  if (input.role === "admin") return { ok: true, via: "admin" };
  const { data, error } = await admin
    .from("ai_assistant_pilot_access")
    .select("campaign_id, enabled")
    .eq("user_id", input.userId)
    .or(`campaign_id.is.null,campaign_id.eq.${input.campaignId ?? "00000000-0000-0000-0000-000000000000"}`);
  if (error) return { ok: false, error: "Non è stato possibile verificare l'accesso al pilot." };
  const rows = (data ?? []) as PilotAccessRow[];
  return resolvePilotEntitlement(
    input.role,
    rows.find((row) => row.campaign_id === null) ?? null,
    input.campaignId ? rows.find((row) => row.campaign_id === input.campaignId) ?? null : null
  );
}
