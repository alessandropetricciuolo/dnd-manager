import { NextResponse } from "next/server";
import { Readable } from "stream";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { buildCampaignCharacterSheetsZip } from "@/lib/character-sheets/build-sheets-zip";

export const runtime = "nodejs";
export const maxDuration = 120;

async function ensureTorneoGm(campaignId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false as const, status: 401, message: "Non autenticato." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, gm_id, type, name")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) {
    console.error("[character-sheets-zip] campaign lookup:", campaignError.message);
    return { ok: false as const, status: 500, message: "Errore lettura campagna." };
  }
  if (!campaign) return { ok: false as const, status: 404, message: "Campagna non trovata." };
  if (campaign.type !== "torneo") {
    return { ok: false as const, status: 403, message: "Disponibile solo per campagne torneo." };
  }
  if (!isAdmin && campaign.gm_id !== user.id) {
    return { ok: false as const, status: 403, message: "Non autorizzato." };
  }

  return { ok: true as const, title: campaign.name?.trim() || "torneo" };
}

export async function GET(
  _req: Request,
  context: { params: { campaignId: string } }
) {
  const cid = context.params.campaignId?.trim();
  if (!cid) {
    return NextResponse.json({ error: "Campagna non valida." }, { status: 400 });
  }

  const auth = await ensureTorneoGm(cid);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { stream, filename } = await buildCampaignCharacterSheetsZip(admin, cid, {
      zipLabel: auth.title,
    });
    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore durante la creazione del pacchetto.";
    const isEmpty = message.includes("Nessun personaggio");
    console.error("[character-sheets-zip]", e);
    return NextResponse.json({ error: message }, { status: isEmpty ? 400 : 500 });
  }
}
