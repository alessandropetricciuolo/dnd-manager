import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { persistTorneo2CombatStateWithNextSeq } from "@/lib/torneo2/combat-persistence";

type RouteContext = { params: Promise<{ publicId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { publicId } = await context.params;
  if (!publicId?.trim()) {
    return NextResponse.json({ ok: false, error: "invalid_session" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const token = isRecord(body) && typeof body.token === "string" ? body.token.trim() : "";
  const matchId = isRecord(body) && typeof body.match_id === "string" ? body.match_id.trim() : "";
  const origin = isRecord(body) && typeof body.origin === "string" ? body.origin.trim() : "remote";
  const rawState = isRecord(body) ? body.state : null;
  if (token.length < 16 || !matchId || rawState == null) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (!gmRemoteRateLimit(`t2-combat:${publicId}`, 240, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
  }

  const admin = createSupabaseAdminClient() as unknown as SupabaseClient;
  const saved = await persistTorneo2CombatStateWithNextSeq(admin, {
    campaignId: v.session.campaign_id,
    matchId,
    state: rawState,
    originId: origin,
  });

  if (!saved.ok) {
    const status = saved.code === "not_found" ? 404 : saved.code === "conflict" ? 409 : 500;
    return NextResponse.json({ ok: false, error: saved.error }, { status });
  }

  return NextResponse.json({ ok: true, seq: saved.seq });
}
