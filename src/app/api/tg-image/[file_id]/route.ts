import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_API = "https://api.telegram.org/bot";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function getContentType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return MIME_BY_EXT[ext] ?? "image/jpeg";
}

export async function GET(
  _request: NextRequest,
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

    return new NextResponse(fileRes.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("[tg-image]", e);
    return NextResponse.json(
      { error: "Errore nel recupero dell'immagine" },
      { status: 500 }
    );
  }
}
