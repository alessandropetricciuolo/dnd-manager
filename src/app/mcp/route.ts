import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { authenticate } from "@/lib/mcp-api/auth";
import { ApiError } from "@/lib/mcp-api/contracts";
import { createBdMcpServer } from "@/lib/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MCP_ORIGIN = "https://barberanddragons.com";
const RESOURCE_METADATA = `${MCP_ORIGIN}/.well-known/oauth-protected-resource`;
const localHosts = new Set(["127.0.0.1:3011", "localhost:3011"]);

function unauthorizedResponse() {
  return Response.json({ error: "Authentication required" }, {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate": `Bearer resource_metadata="${RESOURCE_METADATA}", scope="openid email profile offline_access"`,
    },
  });
}

async function handle(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const isProductionHost = host === "barberanddragons.com" && (!origin || origin === MCP_ORIGIN);
  const isLocalDevelopment = process.env.NODE_ENV !== "production" && !!host && localHosts.has(host) && (!origin || origin === `http://${host}`);
  if (!isProductionHost && !isLocalDevelopment) {
    return Response.json({ error: "Invalid host or origin" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const auth = await authenticate(request);
    const server = createBdMcpServer(auth);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return unauthorizedResponse();
    console.warn(JSON.stringify({ event: "mcp_transport_rejected", status: error instanceof ApiError ? error.status : 500 }));
    return Response.json({ error: error instanceof ApiError ? error.message : "MCP service unavailable" }, {
      status: error instanceof ApiError ? error.status : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
