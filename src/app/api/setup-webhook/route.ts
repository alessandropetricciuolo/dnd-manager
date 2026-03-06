import { NextResponse } from "next/server";

/**
 * Route di setup: attiva il webhook Telegram puntando a /api/telegram-webhook.
 * Chiama GET /api/setup-webhook (una tantum) dopo aver impostato TELEGRAM_WEBHOOK_BASE_URL in .env.
 */
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const baseUrl = process.env.TELEGRAM_WEBHOOK_BASE_URL;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN non impostato in .env" },
      { status: 500 }
    );
  }
  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "TELEGRAM_WEBHOOK_BASE_URL non impostato. Aggiungi in .env la URL pubblica del sito (es. https://tuodominio.vercel.app).",
      },
      { status: 500 }
    );
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram-webhook`;
  const setWebhookUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&allowed_updates=${encodeURIComponent(JSON.stringify(["message"]))}`;

  try {
    const res = await fetch(setWebhookUrl);
    const data = (await res.json()) as { ok: boolean; description?: string; result?: boolean };
    return NextResponse.json(data);
  } catch (e) {
    console.error("[setup-webhook]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Errore nella richiesta a Telegram" },
      { status: 502 }
    );
  }
}
