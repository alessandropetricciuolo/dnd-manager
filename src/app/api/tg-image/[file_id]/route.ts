import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_API = "https://api.telegram.org/bot";
const TELEGRAM_FILE_BASE = "https://api.telegram.org/file/bot";

/** Mappa estensione → MIME type. Default: image/jpeg. */
const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function getExtension(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return ext && MIME_BY_EXT[ext] ? ext.slice(1) : "jpg";
}

function getMimeType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

/** Placeholder SVG 1x1 trasparente per fallback (evita icona rotta in <img>). */
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"><rect width="1" height="1" fill="#1c1917"/></svg>`;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ file_id: string }> }
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error("[tg-image] TELEGRAM_BOT_TOKEN non configurato");
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN non configurato" },
      { status: 500 }
    );
  }

  let fileId: string;
  try {
    const { file_id } = await context.params;
    if (!file_id) {
      return NextResponse.json({ error: "file_id mancante" }, { status: 400 });
    }
    fileId = decodeURIComponent(file_id);
  } catch (e) {
    console.error("[tg-image] decode file_id failed", e);
    return NextResponse.json({ error: "file_id non valido" }, { status: 400 });
  }

  try {
    // 1. Recupero dinamico del path: getFile ogni volta (file_id può risolversi in path aggiornato)
    const getFileUrl = `${TELEGRAM_API}${token}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const getFileRes = await fetch(getFileUrl);
    const getFileData = (await getFileRes.json()) as {
      ok: boolean;
      result?: { file_path: string };
      description?: string;
    };

    if (!getFileData.ok || !getFileData.result?.file_path) {
      console.error("[tg-image] getFile failed", {
        file_id: fileId,
        ok: getFileData.ok,
        description: getFileData.description ?? "no path",
      });
      return new NextResponse(PLACEHOLDER_SVG, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-store",
          "X-Tg-Image-Error": "getfile-failed",
        },
      });
    }

    const filePath = getFileData.result.file_path;
    const downloadUrl = `${TELEGRAM_FILE_BASE}${token}/${filePath}`;

    const fileRes = await fetch(downloadUrl);

    if (!fileRes.ok || !fileRes.body) {
      console.error("[tg-image] download failed", {
        file_path: filePath,
        status: fileRes.status,
      });
      return new NextResponse(PLACEHOLDER_SVG, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "no-store",
          "X-Tg-Image-Error": "download-failed",
        },
      });
    }

    const ext = getExtension(filePath);
    const mimeType = getMimeType(filePath);
    const safeFilename = `image.${ext}`;

    const blob = await fileRes.arrayBuffer();

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${safeFilename}"`,
        "Cache-Control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("[tg-image] unexpected error", { file_id: fileId, error: e });
    return new NextResponse(PLACEHOLDER_SVG, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
        "X-Tg-Image-Error": "internal-error",
      },
    });
  }
}
