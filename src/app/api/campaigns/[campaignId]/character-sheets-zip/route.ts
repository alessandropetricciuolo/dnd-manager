import { NextResponse } from "next/server";
import { Readable } from "stream";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { buildCampaignCharacterSheetsZip } from "@/lib/character-sheets/build-sheets-zip";
import { ensureCampaignSheetExportAccess } from "@/lib/character-sheets/campaign-sheet-export-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(
  _req: Request,
  context: { params: { campaignId: string } }
) {
  const cid = context.params.campaignId?.trim();
  if (!cid) {
    return NextResponse.json({ error: "Campagna non valida." }, { status: 400 });
  }

  const auth = await ensureCampaignSheetExportAccess(cid);
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
