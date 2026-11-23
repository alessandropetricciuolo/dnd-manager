"use server";

import { revalidatePath } from "next/cache";
import { ELDARIA_CAMPAIGN_ID, ELDARIA_GUIDE_PATH } from "@/lib/eldaria-welcome";
import { getRequestAuthContext } from "@/utils/supabase/request-auth-context";

export async function confirmEldariaGuideRead() {
  const { supabase, user } = await getRequestAuthContext();
  if (!user) return { success: false };

  const { error } = await supabase.from("campaign_guide_reads").upsert(
    { campaign_id: ELDARIA_CAMPAIGN_ID, player_id: user.id },
    { onConflict: "campaign_id,player_id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[confirmEldariaGuideRead]", error.message);
    return { success: false };
  }

  revalidatePath(ELDARIA_GUIDE_PATH);
  revalidatePath(`/campaigns/${ELDARIA_CAMPAIGN_ID}`);
  return { success: true };
}
