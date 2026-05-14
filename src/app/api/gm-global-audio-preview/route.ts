import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

/**
 * Proxy streaming per anteprima catalogo: bypass CORS R2/public URL da client.
 * Solo GM/Admin autenticati. Inoltra Range → molti browser richiedono 206 per <audio>.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from("gm_global_audio_tracks")
    .select("public_url, mime_type")
    .eq("id", id)
    .maybeSingle();

  if (error || !row?.public_url) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const range = req.headers.get("range");
  const upstreamHeaders: HeadersInit = {};
  if (range) {
    (upstreamHeaders as Record<string, string>).Range = range;
  }

  let upstream = await fetch(row.public_url, { headers: upstreamHeaders });
  /** Alcuni storage rispondono 416 al primo Range: riprova senza Range. */
  if (upstream.status === 416 && range) {
    upstream = await fetch(row.public_url);
  }
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "upstream" }, { status: 502 });
  }

  const ct = upstream.headers.get("content-type") ?? row.mime_type ?? "application/octet-stream";

  const out = new Headers();
  out.set("Content-Type", ct);
  out.set("Cache-Control", "private, max-age=300");
  out.set("Accept-Ranges", upstream.headers.get("Accept-Ranges") ?? "bytes");

  const pass = ["content-length", "content-range"] as const;
  for (const k of pass) {
    const v = upstream.headers.get(k);
    if (v) out.set(k, v);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
