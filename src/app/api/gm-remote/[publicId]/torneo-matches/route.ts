import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { loadTorneoSetupAdmin } from "@/lib/torneo/load-setup-admin";

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
  if (token.length < 16) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  if (!gmRemoteRateLimit(`torneo-matches:${publicId}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: sess } = await admin
    .from("gm_remote_sessions")
    .select("focused_match_id, campaign_id")
    .eq("public_id", publicId)
    .maybeSingle();

  const setup = await loadTorneoSetupAdmin(admin, v.session.campaign_id);
  if (!setup) {
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }

  const matches = setup.matches.map((m) => ({
    id: m.id,
    label: m.label,
    status: m.status,
    teamAName: m.team_a.name,
    teamBName: m.match_kind === "triello" ? "Triello interno" : m.team_b.name,
    bracketRound: m.bracket_round,
    matchKind: m.match_kind,
  }));

  return NextResponse.json({
    ok: true,
    matches,
    focusedMatchId: (sess as { focused_match_id?: string | null } | null)?.focused_match_id ?? null,
  });
}
