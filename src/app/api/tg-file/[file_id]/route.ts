import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy download per file (PDF, documenti) salvati su Telegram.
 * Restituisce lo stream del file con Content-Disposition: attachment per il download.
 *
 * Nota: I file sopra i 4MB non possono passare da qui in upload (limite body Server Actions),
 * ma solo in download: questa route può streamare file di qualsiasi dimensione da Telegram.
 */
const TELEGRAM_API = "https://api.telegram.org/bot";

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
};

function getContentType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function getDownloadFilename(filePath: string): string {
  const base = filePath.split("/").pop() ?? "file";
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (sanitized) return sanitized;
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return ext in MIME_BY_EXT ? `download${ext}` : "download";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ file_id: string }> }
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN non configurato" },
      { status: 500 }
    );
  }

  const { file_id } = await context.params;
  if (!file_id) {
    return NextResponse.json({ error: "file_id mancante" }, { status: 400 });
  }

  const nameParam = request.nextUrl.searchParams.get("name");
  const downloadFilename = nameParam
    ? nameParam.replace(/[^\w\s.-]/gi, "_").slice(0, 200) || undefined
    : undefined;

  try {
    const getFileRes = await fetch(
      `${TELEGRAM_API}${token}/getFile?file_id=${encodeURIComponent(file_id)}`
    );
    const getFileData = (await getFileRes.json()) as {
      ok: boolean;
      result?: { file_path: string };
      description?: string;
    };

    if (!getFileData.ok || !getFileData.result?.file_path) {
      return NextResponse.json(
        { error: getFileData.description ?? "File non trovato su Telegram" },
        { status: 404 }
      );
    }

    const filePath = getFileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
    const fileRes = await fetch(downloadUrl);

    if (!fileRes.ok || !fileRes.body) {
      return NextResponse.json(
        { error: "Impossibile scaricare il file da Telegram" },
        { status: 502 }
      );
    }

    const contentType =
      fileRes.headers.get("content-type") ?? getContentType(filePath);
    const filename = downloadFilename ?? getDownloadFilename(filePath);

    return new NextResponse(fileRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control":
          "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("[tg-file]", e);
    return NextResponse.json(
      { error: "Errore nel recupero del file" },
      { status: 500 }
    );
  }
}
