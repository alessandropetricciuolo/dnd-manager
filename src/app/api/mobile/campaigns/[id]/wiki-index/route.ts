import { NextRequest, NextResponse } from "next/server";
import { getMobileCampaignWikiIndex } from "@/lib/mobile/wiki-service";
import { createSupabaseMobileWikiDependencies } from "@/lib/mobile/wiki-supabase-deps";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const bearer =
    req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const url = new URL(req.url);
  const includeAdminOnly = url.searchParams.get("includeAdminOnly") === "1";
  const includeArchived = url.searchParams.get("includeArchived") === "1";
  const includeDocuments = url.searchParams.get("includeDocuments") === "1";

  try {
    const result = await getMobileCampaignWikiIndex(
      params.id,
      bearer,
      {
        includeAdminOnly,
        includeArchived,
        includeDocuments,
      },
      createSupabaseMobileWikiDependencies(),
    );

    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/mobile/campaigns/wiki-index]", err);
    return NextResponse.json({ error: "wiki_index_failed" }, { status: 500 });
  }
}
