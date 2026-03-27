import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook Telegram "File ID Extractor": risponde con il file_id quando l'admin invia file/foto.
 * Restituiamo sempre 200 + { ok: true } per non far ritentare Telegram in caso di errore.
 */
const TELEGRAM_API = "https://api.telegram.org/bot";

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number };
    chat: { id: number };
    document?: { file_id: string };
    photo?: Array<{ file_id: string }>;
  };
};

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (expectedSecret) {
    const providedSecret = request.headers.get("x-telegram-bot-api-secret-token")?.trim();
    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ ok: true });
    }
  }

  let body: TelegramUpdate;
  try {
    body = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminIdRaw = process.env.TELEGRAM_ADMIN_ID;
  const adminId = adminIdRaw ? parseInt(adminIdRaw, 10) : null;

  if (!token) {
    return NextResponse.json({ ok: true });
  }

  const message = body.message;
  if (!message?.from?.id || !message.chat) {
    return NextResponse.json({ ok: true });
  }

  if (adminId != null && message.from.id !== adminId) {
    return NextResponse.json({ ok: true });
  }

  let fileId: string | null = null;
  if (message.document) {
    fileId = message.document.file_id;
  } else if (message.photo && message.photo.length > 0) {
    fileId = message.photo[message.photo.length - 1].file_id;
  }

  if (!fileId) {
    return NextResponse.json({ ok: true });
  }

  try {
    const text = `Ecco il tuo File ID:\n<code>${fileId.replace(/</g, "&lt;")}</code>\n\nPuoi copiarlo toccando il blocco.`;
    const sendRes = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text,
        parse_mode: "HTML",
      }),
    });
    if (!sendRes.ok) {
      console.error("[telegram-webhook] sendMessage", await sendRes.text());
    }
  } catch (e) {
    console.error("[telegram-webhook]", e);
  }

  return NextResponse.json({ ok: true });
}
