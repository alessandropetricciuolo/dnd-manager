import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { getRequestAuthContext } from "@/utils/supabase/request-auth-context";
import { searchCompendiumSpells } from "@/lib/server/compendium-spell-search";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
  let authenticated = false;

  if (bearer) {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.getUser(bearer);
    authenticated = Boolean(!error && data.user);
  } else {
    const { user } = await getRequestAuthContext();
    authenticated = Boolean(user);
  }

  if (!authenticated) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const levelRaw = url.searchParams.get("level");
  const level =
    levelRaw !== null && /^[0-9]$/.test(levelRaw.trim()) ? Number.parseInt(levelRaw.trim(), 10) : null;

  try {
    const spells = await searchCompendiumSpells({
      query: q,
      level,
      limit: 25,
      requestOrigin: url.origin,
    });
    return NextResponse.json({ spells }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (err) {
    console.error("[compendium-spells]", err);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
