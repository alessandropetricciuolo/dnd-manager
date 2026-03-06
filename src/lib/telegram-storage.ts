/**
 * Storage illimitato immagini e documenti via Telegram Bot API.
 * Immagini: proxy /api/tg-image/[file_id]. Documenti/PDF: download /api/tg-file/[file_id].
 * Nota: I file sopra i 4MB non possono passare da qui in upload (limite body Server Actions),
 * ma possono essere scaricati senza limite tramite le route di download.
 */

const TELEGRAM_API = "https://api.telegram.org/bot";

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID devono essere impostati in .env.local"
    );
  }
  return { token, chatId };
}

function isImage(file: File | Blob): boolean {
  if (file instanceof File) {
    return file.type.startsWith("image/");
  }
  return false;
}

type SendPhotoResult = {
  ok: true;
  result: {
    message_id: number;
    photo: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
  };
};

type SendDocumentResult = {
  ok: true;
  result: {
    message_id: number;
    document: { file_id: string; file_name?: string; mime_type?: string };
  };
};

type TelegramError = {
  ok: false;
  description: string;
};

/**
 * Carica un file su Telegram.
 * @param file - File o Blob da caricare
 * @param caption - Didascalia opzionale
 * @param type - 'photo' (default): sendPhoto, file_id per /api/tg-image/[file_id]. 'document': sendDocument, file_id per /api/tg-file/[file_id]
 * @returns file_id univoco da usare con /api/tg-image/[file_id] o /api/tg-file/[file_id]
 */
export async function uploadToTelegram(
  file: File | Blob,
  caption?: string,
  type: "photo" | "document" = "photo"
): Promise<string> {
  const { token, chatId } = getConfig();
  const baseUrl = `${TELEGRAM_API}${token}`;
  const form = new FormData();
  form.append("chat_id", chatId);
  if (caption) form.append("caption", caption);

  const asFile = file instanceof File ? file : new File([file], "file", { type: (file as Blob).type || "application/octet-stream" });
  const useDocument = type === "document";
  const asImage = !useDocument && isImage(asFile);

  form.append(asImage ? "photo" : "document", asFile);
  const endpoint = asImage ? "sendPhoto" : "sendDocument";

  const res = await fetch(`${baseUrl}/${endpoint}`, {
    method: "POST",
    body: form,
  });

  const data = (await res.json()) as SendPhotoResult | SendDocumentResult | TelegramError;
  if (!res.ok || !("ok" in data) || !data.ok) {
    const err = data as TelegramError;
    throw new Error(err.description ?? `Telegram API error: ${res.status}`);
  }

  if (useDocument && "document" in data.result) {
    return data.result.document.file_id;
  }
  if ("photo" in data.result) {
    const photo = data.result.photo;
    if (!photo?.length) throw new Error("Risposta Telegram senza photo");
    const best = photo[photo.length - 1];
    return best.file_id;
  }
  if ("document" in data.result) {
    return data.result.document.file_id;
  }
  throw new Error("Risposta Telegram non riconosciuta");
}
