import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";

const RATE_MAX = 20;
const RATE_WINDOW_MS = 60_000;

type RouteParams = { params: { publicId: string } };

export async function POST(req: NextRequest, { params }: RouteParams) {
  const publicId = params.publicId?.trim();
  if (!publicId || publicId.length > 80) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  if (!gmRemoteRateLimit(`global-music:${publicId}`, RATE_MAX, RATE_WINDOW_MS)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (!isRecord(json)) {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const token = typeof json.token === "string" ? json.token.trim() : "";
  if (token.length < 16) {
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 400 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    const status =
      v.error === "session_not_found" || v.error === "invalid_token" || v.error === "session_revoked" || v.error === "session_expired"
        ? 401
        : 400;
    return NextResponse.json({ ok: false, error: v.error }, { status });
  }

  const admin = createSupabaseAdminClient() as SupabaseClient<any>;
  const { data: rows, error } = await admin
    .from("gm_global_audio_tracks")
    .select("id, title, mood")
    .eq("audio_type", "music")
    .order("title", { ascending: true });

  if (error) {
    console.warn("[gm-remote] global_audio_tracks", error.code);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tracks: rows ?? [] });
}
