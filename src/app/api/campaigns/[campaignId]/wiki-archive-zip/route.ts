import { NextResponse } from "next/server";
import { Readable } from "stream";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { ensureCampaignSheetExportAccess } from "@/lib/character-sheets/campaign-sheet-export-auth";
import { buildCampaignWikiArchiveZip } from "@/lib/wiki-export/build-wiki-archive-zip";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { resolveAdminContentAccess, canReadAdminContent } from "@/lib/admin-content";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(
  req: Request,
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

  const siteOrigin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;

  try {
    const admin = createSupabaseAdminClient();
    const accessResult = await resolveAdminContentAccess(await createSupabaseServerClient() as never);
    const includeAdminOnly = accessResult.ok && canReadAdminContent(accessResult.access);
    const { stream, filename } = await buildCampaignWikiArchiveZip(admin, cid, {
      campaignName: auth.title,
      siteOrigin,
      includeAdminOnly,
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
    const message = e instanceof Error ? e.message : "Errore durante la creazione dell'archivio.";
    const isEmpty = message.includes("Nessuna voce wiki");
    console.error("[wiki-archive-zip]", e);
    return NextResponse.json({ error: message }, { status: isEmpty ? 400 : 500 });
  }
}
