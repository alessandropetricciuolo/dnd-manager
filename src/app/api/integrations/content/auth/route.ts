import { authenticate } from "@/lib/mcp-api/auth";
import { ApiError } from "@/lib/mcp-api/contracts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    // MCP is a personal Admin connector. A non-Admin gets the same opaque 404
    // as an unknown connector scope and cannot enumerate account roles.
    if (!auth.isAdmin || !process.env.MCP_CAMPAIGN_ID) throw new ApiError(404, "Not found");
    return Response.json({ authenticated: true, scope: "eldaria" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof ApiError && error.status === 401 ? "Authentication failed" : "Not found" }, {
      status: error instanceof ApiError && error.status === 401 ? 401 : 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
