import type { createSupabaseServerClient } from "@/utils/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Sincronizza i permessi selettivi per un'entità (mappa o wiki).
 * Elimina le righe esistenti per (campaign_id, entity_type, entity_id) e inserisce una riga per ogni user_id.
 */
export async function syncEntityPermissions(
  supabase: SupabaseClient,
  campaignId: string,
  entityType: "map" | "wiki",
  entityId: string,
  userIds: string[]
): Promise<{ error: Error | null }> {
  const { error: deleteError } = await supabase
    .from("entity_permissions")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId);

  if (deleteError) {
    return { error: deleteError as unknown as Error };
  }

  if (userIds.length === 0) {
    return { error: null };
  }

  const rows = userIds.map((user_id) => ({
    campaign_id: campaignId,
    user_id,
    entity_type: entityType,
    entity_id: entityId,
  }));

  const { error: insertError } = await supabase.from("entity_permissions").insert(rows);
  if (insertError) {
    return { error: insertError as unknown as Error };
  }
  return { error: null };
}

/**
 * Parse allowed_user_ids da form (JSON array o comma-separated).
 */
export function parseAllowedUserIds(formData: FormData, key: string): string[] {
  const raw = formData.get(key);
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as unknown[];
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Parse allowed_party_ids da form (JSON array o comma-separated). */
export function parseAllowedPartyIds(formData: FormData, key: string): string[] {
  const raw = formData.get(key);
  if (!raw || typeof raw !== "string") return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as unknown[];
      return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
}

/** Espande gli ID gruppo in ID giocatore (campaign_members.player_id). */
export async function resolveAllowedUserIdsFromParties(
  supabase: SupabaseClient,
  campaignId: string,
  partyIds: string[]
): Promise<string[]> {
  if (partyIds.length === 0) return [];
  const { data, error } = await supabase
    .from("campaign_members")
    .select("player_id")
    .eq("campaign_id", campaignId)
    .in("party_id", partyIds);
  if (error || !data?.length) return [];
  return [...new Set(data.map((row) => row.player_id as string).filter(Boolean))];
}
