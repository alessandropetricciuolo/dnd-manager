import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createExplorationMapFromFormData } from "@/lib/exploration/exploration-map-upload-core";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: { campaignId: string } }
) {
  try {
    const campaignId = context.params.campaignId;
    const formData = await request.formData();
    const supabase = await createSupabaseServerClient();
    const result = await createExplorationMapFromFormData(supabase, campaignId, formData);
    if (result.success) {
      revalidatePath(`/campaigns/${campaignId}`);
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("exploration-maps POST", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Errore server." },
      { status: 500 }
    );
  }
}
