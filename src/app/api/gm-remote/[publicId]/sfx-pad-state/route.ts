import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { parseSfxPadRemoteSnapshot } from "@/lib/gm-remote/sfx-pad-snapshot";

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

  if (!gmRemoteRateLimit(`sfx-pad:${publicId}`, 60, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("gm_remote_sessions")
    .select("sfx_pad_snapshot")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    console.warn("[gm-remote] sfx_pad_state", error.code);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }

  const snapshot = parseSfxPadRemoteSnapshot(
    (data as { sfx_pad_snapshot?: unknown } | null)?.sfx_pad_snapshot ?? null
  );

  return NextResponse.json({ ok: true, snapshot });
}
