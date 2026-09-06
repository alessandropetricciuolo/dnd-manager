"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { parseMapImport, validateMapImportHierarchy } from "@/lib/maps/bulk-import";

export async function bulkImportMaps(campaignId: string, input: unknown): Promise<{ success: boolean; message: string }> {
  try {
    const rows = parseMapImport(input);
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Devi essere autenticato." };
    const { data: allowed, error: authError } = await supabase.rpc("can_manage_campaign_as_gm", { p_campaign_id: campaignId });
    if (authError || !allowed) return { success: false, message: "Non puoi gestire le mappe di questa campagna." };
    const { data: campaign, error: campaignError } = await supabase.from("campaigns").select("type").eq("id", campaignId).single();
    if (campaignError || !campaign) throw new Error("Campagna non disponibile.");
    const { data: existing, error: readError } = await supabase.from("maps").select("id, map_type").eq("campaign_id", campaignId);
    if (readError) throw new Error("Impossibile verificare le mappe esistenti.");
    validateMapImportHierarchy(rows, existing ?? [], campaign.type === "long");
    const ids = new Map(rows.map(row => [row.key, randomUUID()]));
    const payload = rows.map(({ key, parent_key, ...row }) => ({
      ...row, id: ids.get(key)!, campaign_id: campaignId,
      parent_map_id: parent_key ? ids.get(parent_key)! : row.parent_map_id,
    }));
    const { error } = await supabase.from("maps").insert(payload);
    if (error) return { success: false, message: `Nessuna mappa importata: ${error.message}` };
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: `${rows.length} mappe importate.` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Importazione non riuscita." };
  }
}
