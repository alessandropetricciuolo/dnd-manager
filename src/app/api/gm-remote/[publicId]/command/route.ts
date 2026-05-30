import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { parseRemotePostBody, isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";

const RATE_MAX = 45;
const RATE_WINDOW_MS = 60_000;

type RouteParams = { params: { publicId: string } };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const publicId = params.publicId?.trim();
  if (!publicId || publicId.length > 80) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!gmRemoteRateLimit(`cmd:${publicId}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseRemotePostBody(json);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const { token, envelope } = parsed.data;
  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    const status =
      v.error === "session_not_found" || v.error === "invalid_token" || v.error === "session_revoked" || v.error === "session_expired"
        ? 401
        : 400;
    return NextResponse.json({ ok: false, error: v.error }, { status });
  }

  const admin = createSupabaseAdminClient() as SupabaseClient<any>;
  const payloadJson = isRecord(envelope.payload) ? envelope.payload : {};

  if (envelope.type === "torneo.focus_match") {
    const matchId = typeof payloadJson.match_id === "string" ? payloadJson.match_id.trim() : null;
    await admin
      .from("gm_remote_sessions")
      .update({ focused_match_id: matchId || null })
      .eq("public_id", publicId);
  }

  const { error: insErr } = await admin.from("gm_remote_commands").insert({
    session_public_id: publicId,
    campaign_id: v.session.campaign_id,
    command_id: envelope.command_id,
    seq: envelope.seq ?? null,
    type: envelope.type,
    payload: payloadJson,
    issued_at: envelope.issued_at,
    source: envelope.source ?? "remote",
  });

  if (insErr) {
    const dup = insErr.code === "23505" || insErr.message?.toLowerCase().includes("duplicate");
    if (dup) {
      return NextResponse.json({ ok: true, deduped: true });
    }
    console.warn("[gm-remote] insert_failed", insErr.code);
    return NextResponse.json({ ok: false, error: "persist_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
