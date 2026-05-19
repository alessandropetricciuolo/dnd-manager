import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { buildImagesZipStream } from "@/lib/media-export/build-zip";

export const runtime = "nodejs";
export const maxDuration = 120;

async function requireGmOrAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false as const, status: 401, message: "Non autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { ok: false as const, status: 403, message: "Solo GM e Admin possono esportare le immagini." };
  }
  return { ok: true as const, userId: user.id };
}

function siteOriginFromRequest(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  const auth = await requireGmOrAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  const campaignId = req.nextUrl.searchParams.get("campaignId")?.trim() || null;

  try {
    const admin = createSupabaseAdminClient();
    const siteOrigin = siteOriginFromRequest(req);
    const { stream, filename } = await buildImagesZipStream(admin, siteOrigin, {
      campaignId,
    });

    const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[media-export]", e);
    return NextResponse.json(
      { error: "Errore durante la creazione del pacchetto immagini." },
      { status: 500 }
    );
  }
}
