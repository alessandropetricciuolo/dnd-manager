export const dynamic = "force-dynamic";

const MCP_URL = "https://barberanddragons.com/mcp";
const AUTHORIZATION_SERVER = "https://wgygueccztselxysletl.supabase.co/auth/v1";

export async function GET() {
  return Response.json({
    resource: MCP_URL,
    authorization_servers: [AUTHORIZATION_SERVER],
    scopes_supported: ["openid", "email", "profile", "offline_access"],
    resource_documentation: "https://barberanddragons.com/privacy",
  }, { headers: { "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
