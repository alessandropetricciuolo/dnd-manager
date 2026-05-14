import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashGmRemoteToken } from "@/lib/gm-remote/hash-token";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { parseRemotePostBody, isRecord } from "@/lib/gm-remote/protocol";

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

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
  // Tipi Supabase generati: gm_remote_* richiedono allineamento Relationships/Views; cast locale fino a `supabase gen types`.
  const admin = createSupabaseAdminClient() as SupabaseClient<any>;
  const { data: sess, error: se } = await admin
    .from("gm_remote_sessions")
    .select("token_hash, campaign_id, revoked_at, expires_at")
    .eq("public_id", publicId)
    .maybeSingle();

  if (se || !sess) {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 401 });
  }

  if (sess.revoked_at) {
    return NextResponse.json({ ok: false, error: "session_revoked" }, { status: 401 });
  }

  const exp = Date.parse(sess.expires_at);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return NextResponse.json({ ok: false, error: "session_expired" }, { status: 401 });
  }

  const expectedHash = hashGmRemoteToken(token);
  if (!timingSafeEqualHex(expectedHash, sess.token_hash)) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  const payloadJson = isRecord(envelope.payload) ? envelope.payload : {};

  const { error: insErr } = await admin.from("gm_remote_commands").insert({
    session_public_id: publicId,
    campaign_id: sess.campaign_id,
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
