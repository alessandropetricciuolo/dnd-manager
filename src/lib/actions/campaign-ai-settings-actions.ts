"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { Json } from "@/types/database.types";
import { isValidWikiManualBookKey, type WikiManualBookKey } from "@/lib/manual-book-catalog";

async function assertCanManageCampaign(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string
): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "gm" || profile?.role === "admin") return true;
  const { data: campaign } = await supabase.from("campaigns").select("gm_id").eq("id", campaignId).single();
  return campaign?.gm_id === user.id;
}

function normalizeKeys(keys: unknown): WikiManualBookKey[] {
  if (!Array.isArray(keys)) return [];
  const out: WikiManualBookKey[] = [];
  for (const k of keys) {
    if (typeof k === "string" && isValidWikiManualBookKey(k) && !out.includes(k)) {
      out.push(k);
    }
  }
  return out;
}

/**
 * Aggiorna solo `excluded_manual_book_keys` dentro `ai_context`, preservando le altre chiavi JSON.
 */
export async function updateCampaignExcludedManualBooksAction(
  campaignId: string,
  excludedKeys: string[]
): Promise<{ success: true } | { success: false; message: string }> {
  if (!campaignId?.trim()) {
    return { success: false, message: "Campagna non valida." };
  }
  const normalized = normalizeKeys(excludedKeys);

  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await assertCanManageCampaign(supabase, campaignId);
    if (!allowed) {
      return { success: false, message: "Non hai i permessi per modificare questa campagna." };
    }

    const { data: row, error: fetchErr } = await supabase
      .from("campaigns")
      .select("ai_context")
      .eq("id", campaignId)
      .single();
    if (fetchErr) {
      return { success: false, message: fetchErr.message ?? "Lettura campagna fallita." };
    }

    const prev = (row as { ai_context?: Json }).ai_context;
    const base =
      prev && typeof prev === "object" && !Array.isArray(prev)
        ? { ...(prev as Record<string, unknown>) }
        : {};
    base.excluded_manual_book_keys = normalized;

    const { error: updateErr } = await supabase
      .from("campaigns")
      .update({ ai_context: base as unknown as Json })
      .eq("id", campaignId);
    if (updateErr) {
      return { success: false, message: updateErr.message ?? "Salvataggio fallito." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true };
  } catch (e) {
    console.error("[updateCampaignExcludedManualBooksAction]", e);
    return { success: false, message: "Errore imprevisto." };
  }
}
