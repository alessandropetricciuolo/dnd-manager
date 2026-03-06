"use server";

import { uploadToTelegram } from "@/lib/telegram-storage";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB (limite body Vercel/Server Actions)

export type UploadTelegramResult =
  | { success: true; fileId: string }
  | { success: false; error: string };

/**
 * Carica un singolo file su Telegram tramite Bot.
 * Usato da SmartFileUpload per file < 4MB.
 * FormData deve contenere: "file" (File), opzionale "type" ('photo' | 'document').
 */
export async function uploadFileToTelegram(
  formData: FormData
): Promise<UploadTelegramResult> {
  const file = formData.get("file") as File | null;
  const type = (formData.get("type") as "photo" | "document" | null) || "photo";

  if (!file || !(file instanceof File)) {
    return { success: false, error: "Nessun file fornito." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      success: false,
      error: "File troppo grande per l'upload web (max 4MB). Invia il file al Bot Telegram e incolla il File ID.",
    };
  }

  try {
    const fileId = await uploadToTelegram(file, undefined, type);
    return { success: true, fileId };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Errore di caricamento.";
    return { success: false, error: message };
  }
}
