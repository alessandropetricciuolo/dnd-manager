import express from "express";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer, backendClient } from "./tools.mjs";

const base = process.env.BD_API_URL;
if (!base) throw new Error("BD_API_URL required");
backendClient(base, ""); // Validate backend URL before any request.

if (process.env.MCP_TRANSPORT !== "http") {
  if (!process.env.BD_ACCESS_TOKEN) throw new Error("BD_ACCESS_TOKEN required for stdio");
  await createServer(backendClient(base, process.env.BD_ACCESS_TOKEN)).connect(new StdioServerTransport());
} else {
  const app = express();
  const origin = new URL(process.env.MCP_PUBLIC_URL ?? "http://127.0.0.1:3001/mcp");
  const issuer = process.env.MCP_OAUTH_ISSUER;
  app.use((req, res, next) => {
    if (req.headers.host !== origin.host || (req.headers.origin && req.headers.origin !== origin.origin)) return res.status(403).json({ error: "Invalid host or origin" });
    next();
  });
  app.get("/.well-known/oauth-protected-resource", (req, res) => {
    if (!issuer) return res.status(404).end();
    res.json({ resource: origin.href, authorization_servers: [issuer] });
  });
  app.post("/mcp", express.json({ limit: "750kb" }), async (req, res) => {
    const auth = req.headers.authorization ?? "";
    if (!/^Bearer [^\s]+$/.test(auth)) {
      res.setHeader("WWW-Authenticate", issuer ? `Bearer resource_metadata="${origin.origin}/.well-known/oauth-protected-resource"` : "Bearer");
      return res.status(401).json({ error: "Bearer token required" });
    }
    try {
      // Validate every request (including initialize/list) against the Next API.
      const check = await fetch(new URL("/api/integrations/content/auth", base), { headers: { Authorization: auth }, redirect: "error", signal: AbortSignal.timeout(10000) });
      if (!check.ok) return res.status(check.status === 401 ? 401 : 404).json({ error: "Not found" });
      const server = createServer(backendClient(base, auth.slice(7)));
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on("close", () => { void transport.close(); void server.close(); });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(503).json({ error: "MCP service unavailable" });
    }
  });
  app.all("/mcp", (req, res) => res.status(405).end());
  app.listen(Number(process.env.PORT ?? 3001), "127.0.0.1", () => console.error("B&D MCP HTTP listening"));
}
