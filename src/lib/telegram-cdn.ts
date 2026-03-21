const TELEGRAM_API = "https://api.telegram.org/bot";

type TelegramPhotoSize = {
  file_id: string;
  width: number;
  height: number;
  file_size?: number;
};

type TelegramSendPhotoOk = {
  ok: true;
  result: {
    photo?: TelegramPhotoSize[];
  };
};

type TelegramSendPhotoErr = {
  ok: false;
  description?: string;
};

function getTelegramConfig() {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID ?? "").trim();
  if (!token || !chatId) {
    const missing = [!token && "TELEGRAM_BOT_TOKEN", !chatId && "TELEGRAM_CHAT_ID"]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Variabili Telegram mancanti: ${missing}`);
  }
  return { token, chatId };
}

/**
 * Scarica un'immagine da URL (es. Supabase pubblico temporaneo) e la carica su Telegram CDN.
 * Ritorna il file_id migliore (ultima risoluzione disponibile in result.photo).
 */
export async function uploadToTelegram(imageUrl: string, caption?: string): Promise<string> {
  const { token, chatId } = getTelegramConfig();
  const source = imageUrl.trim();
  if (!source) {
    throw new Error("imageUrl vuoto.");
  }

  const imageRes = await fetch(source, { cache: "no-store" });
  if (!imageRes.ok) {
    const body = await imageRes.text();
    throw new Error(`Download immagine fallito (${imageRes.status}): ${body.slice(0, 400)}`);
  }

  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  if (!imageBuffer.length) {
    throw new Error("Immagine temporanea vuota.");
  }

  const contentType = imageRes.headers.get("content-type") || "image/png";
  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption?.trim()) {
    form.append("caption", caption.trim().slice(0, 1024));
  }
  form.append("photo", new File([imageBuffer], "ai-preview.png", { type: contentType }));

  const tgRes = await fetch(`${TELEGRAM_API}${token}/sendPhoto`, {
    method: "POST",
    body: form,
  });

  const raw = (await tgRes.json()) as TelegramSendPhotoOk | TelegramSendPhotoErr;
  if (!tgRes.ok || !raw.ok) {
    const err = raw as TelegramSendPhotoErr;
    throw new Error(err.description ?? `Telegram sendPhoto failed (${tgRes.status})`);
  }

  const sizes = raw.result.photo ?? [];
  if (!sizes.length) {
    throw new Error("Telegram non ha restituito varianti photo.");
  }
  const best = sizes[sizes.length - 1];
  if (!best?.file_id) {
    throw new Error("Telegram file_id mancante.");
  }
  return best.file_id;
}
