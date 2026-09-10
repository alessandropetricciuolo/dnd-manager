import { authenticate } from "@/lib/mcp-api/auth";
import { ApiError } from "@/lib/mcp-api/contracts";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authenticate(request);
    const campaign = new URL(request.url).searchParams.get("campaign_id");
    if (!auth.isAdmin || !process.env.MCP_CAMPAIGN_ID || campaign !== process.env.MCP_CAMPAIGN_ID) throw new ApiError(404, "Asset not found");
    if (!/^[0-9a-f-]{36}$/i.test(params.id) || !campaign || !/^[0-9a-f-]{36}$/i.test(campaign)) throw new ApiError(400, "Invalid ID");
    const { data: flag, error: flagError } = await auth.db.from("campaigns").select("admin_drafts_enabled").eq("id", campaign).maybeSingle();
    if (flagError || !flag || flag.admin_drafts_enabled !== true) throw new ApiError(404, "Asset not found");
    const { data, error } = await auth.db.from("mcp_assets").select("data_base64,mime_type").eq("id", params.id).eq("campaign_id", campaign).maybeSingle();
    if (error) throw new ApiError(503, "Backend unavailable");
    if (!data) throw new ApiError(404, "Asset not found");
    return new Response(Buffer.from(data.data_base64, "base64"), { headers: { "Content-Type": data.mime_type, "Content-Disposition": "attachment", "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError ? error.message : "Internal error" }, { status: error instanceof ApiError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
