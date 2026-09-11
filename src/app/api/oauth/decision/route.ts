import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData();
  const rawAuthorizationId = formData.get("authorization_id");
  const authorizationId = typeof rawAuthorizationId === "string" ? rawAuthorizationId.trim() : "";
  const decision = formData.get("decision");
  if (!authorizationId || authorizationId.length > 512 || (decision !== "approve" && decision !== "deny")) {
    return Response.json({ error: "Invalid authorization decision" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) {
    return Response.json({ error: "Authentication required" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const result = decision === "approve"
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
  if (result.error || !result.data?.redirect_url) {
    return Response.json({ error: "Authorization decision failed" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  redirect(result.data.redirect_url);
}
