import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  downloadStorageObject,
  fetchImageForExport,
} from "@/lib/media-export/fetch-image";
import { hasDownloadableImage } from "@/lib/resolve-image-src";
import { isAllowedMediaStorageRequest } from "@/lib/media-export/storage-request-guard";

export const runtime = "nodejs";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function isGmOrAdmin(role?: string | null): boolean {
  return role === "gm" || role === "admin";
}

function sanitizeFilename(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "immagine"
  );
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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const driveUrl = req.nextUrl.searchParams.get("driveUrl");
  const telegramFallbackId = req.nextUrl.searchParams.get("telegramFallbackId");
  const storageBucket = req.nextUrl.searchParams.get("storageBucket")?.trim() || null;
  const storagePath = req.nextUrl.searchParams.get("storagePath")?.trim() || null;
  const wantsStorageDownload = Boolean(storageBucket || storagePath);
  const filenameBase = sanitizeFilename(
    req.nextUrl.searchParams.get("filename") ?? "immagine"
  );

  if (wantsStorageDownload) {
    if (!isAllowedMediaStorageRequest(storageBucket, storagePath)) {
      return NextResponse.json({ error: "Archivio non autorizzato." }, { status: 403 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profileError || !isGmOrAdmin(profile?.role)) {
      return NextResponse.json(
        { error: "Solo GM e Admin possono scaricare file da archivio." },
        { status: 403 }
      );
    }
  }

  if (!wantsStorageDownload && !hasDownloadableImage(driveUrl, telegramFallbackId)) {
    return NextResponse.json({ error: "Nessuna immagine da scaricare." }, { status: 400 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const siteOrigin = siteOriginFromRequest(req);

    let fetched: { buffer: Buffer; ext: string } | null = null;
    if (wantsStorageDownload && storageBucket && storagePath) {
      fetched = await downloadStorageObject(admin, storageBucket, storagePath);
    } else {
      fetched = await fetchImageForExport(
        {
          source: "download",
          id: "single",
          label: filenameBase,
          imageUrl: driveUrl,
          telegramFallbackId,
        },
        siteOrigin
      );
    }

    if (!fetched) {
      return NextResponse.json({ error: "Impossibile recuperare l'immagine." }, { status: 404 });
    }

    const filename = `${filenameBase}.${fetched.ext}`;
    const contentType = MIME_BY_EXT[fetched.ext] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(fetched.buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[media-download]", e);
    return NextResponse.json({ error: "Errore durante il download." }, { status: 500 });
  }
}
