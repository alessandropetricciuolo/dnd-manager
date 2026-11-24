import { NextResponse } from "next/server";
import { isAppleWebSignInConfigured, saveAppleWebAuthorization } from "@/lib/auth/apple-web-session";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const reply = (status: number) => NextResponse.json({ ok: status === 200 }, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
  if (!isAppleWebSignInConfigured()) return reply(503);

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer) return reply(401);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser(bearer);
    if (error || !user) return reply(401);

    const raw = await request.text();
    if (raw.length > 8192) return reply(413);
    let token: unknown;
    try {
      token = JSON.parse(raw)?.refreshToken;
    } catch {
      return reply(400);
    }
    if (token !== null && (typeof token !== "string" || !token)) return reply(400);

    return reply(await saveAppleWebAuthorization(user, token) ? 200 : 403);
  } catch {
    return reply(503);
  }
}
