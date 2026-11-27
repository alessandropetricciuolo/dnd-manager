import { NextRequest, NextResponse } from "next/server";
import { getMobileCampaignWikiEntityDetail } from "@/lib/mobile/wiki-service";
import { createSupabaseMobileWikiDependencies } from "@/lib/mobile/wiki-supabase-deps";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; entityId: string } },
) {
  const bearer =
    req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  const url = new URL(req.url);
  const includeAdminOnly = url.searchParams.get("includeAdminOnly") === "1";

  try {
    const result = await getMobileCampaignWikiEntityDetail(
      params.id,
      params.entityId,
      bearer,
      { includeAdminOnly },
      createSupabaseMobileWikiDependencies(),
    );

    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api/mobile/campaigns/wiki/detail]", err);
    return NextResponse.json({ error: "wiki_detail_failed" }, { status: 500 });
  }
}
