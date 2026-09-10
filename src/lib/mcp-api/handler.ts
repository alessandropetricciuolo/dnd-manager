import { authenticate, type McpAuthContext } from "./auth";
import { ApiError } from "./contracts";
import { executeContent } from "./service";

const headers = { "Cache-Control": "no-store" };

export async function handleContent(request: Request) {
  let operation = "unknown";
  try {
    const auth = await authenticate(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ApiError(415, "JSON required");
    const reader = request.body?.getReader();
    if (!reader) throw new ApiError(400, "Body required");
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length; if (size > 750000) { await reader.cancel(); throw new ApiError(413, "Body too large"); }
      chunks.push(value);
    }
    let raw: any; try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ApiError(400, "Invalid JSON"); }
    operation = typeof raw?.operation === "string" ? raw.operation.slice(0, 40) : "unknown";
    return Response.json(await executeContent(auth, raw), { headers });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    // Failed attempts only: operation/status are safe; never log token or content.
    console.warn(JSON.stringify({ event: "mcp_api_rejected", operation, status }));
    return Response.json({ error: error instanceof ApiError ? error.message : "Internal error" }, { status, headers });
  }
}

export type { McpAuthContext };
