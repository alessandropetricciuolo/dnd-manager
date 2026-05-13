"use server";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { buildR2PublicObjectUrl, getR2Config, getR2S3Client } from "@/lib/r2/config";
import type { GmGlobalAudioRow, GmGlobalAudioType } from "@/lib/gm-global-audio/types";

const MAX_BYTES = 45 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
]);

async function ensureAdmin(): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "Non autenticato." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { ok: false, message: "Solo admin." };
  return { ok: true, userId: user.id };
}

function safeExtension(originalName: string): string {
  const base = originalName.split(/[/\\]/).pop() ?? "audio";
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  if (ext && ext.length <= 8) return ext;
  return "bin";
}

export async function listAdminGlobalAudioTracksAction(): Promise<
  { success: true; data: GmGlobalAudioRow[] } | { success: false; message: string }
> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gm_global_audio_tracks")
    .select("id, title, audio_type, mood, storage_key, public_url, mime_type, file_size_bytes, created_at")
    .order("created_at", { ascending: false });
  if (error) return { success: false, message: error.message };
  return { success: true, data: (data ?? []) as GmGlobalAudioRow[] };
}

export async function prepareGlobalAudioUploadAction(
  originalFileName: string,
  contentType: string,
  fileSizeBytes: number
): Promise<
  | { success: true; uploadUrl: string; storageKey: string; contentType: string }
  | { success: false; message: string }
> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const ct = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_MIME.has(ct)) {
    return {
      success: false,
      message: `Tipo file non consentito (${contentType}). Usa audio MP3, WAV, OGG, WebM, FLAC, M4A/AAC.`,
    };
  }
  if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0 || fileSizeBytes > MAX_BYTES) {
    return { success: false, message: `Dimensione non valida (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).` };
  }

  try {
    const { bucket } = getR2Config();
    const ext = safeExtension(originalFileName);
    const storageKey = `global-audio/${crypto.randomUUID()}.${ext}`;

    const client = getR2S3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: ct,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    return { success: true, uploadUrl, storageKey, contentType: ct };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Errore generazione upload.";
    return { success: false, message: msg };
  }
}

export async function finalizeGlobalAudioUploadAction(payload: {
  storageKey: string;
  title: string;
  audioType: GmGlobalAudioType;
  mood: string;
  mimeType: string;
  fileSizeBytes: number;
}): Promise<{ success: true; id: string } | { success: false; message: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const title = payload.title.trim();
  if (!title) return { success: false, message: "Titolo obbligatorio." };
  if (!["music", "sfx", "atmosphere"].includes(payload.audioType)) {
    return { success: false, message: "Tipo non valido." };
  }
  const mood = payload.mood.trim();
  const sk = payload.storageKey.trim();
  if (!sk.startsWith("global-audio/") || sk.includes("..")) {
    return { success: false, message: "Percorso storage non valido." };
  }

  const publicUrl = buildR2PublicObjectUrl(sk);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gm_global_audio_tracks")
    .insert({
      title,
      audio_type: payload.audioType,
      mood,
      storage_key: sk,
      public_url: publicUrl,
      mime_type: payload.mimeType || null,
      file_size_bytes: payload.fileSizeBytes,
      created_by: auth.userId,
    } as never)
    .select("id")
    .single();

  const row = data as { id: string } | null;
  if (error || !row?.id) {
    return { success: false, message: error?.message ?? "Errore salvataggio database." };
  }
  return { success: true, id: row.id };
}

export async function deleteGlobalAudioTrackAction(
  id: string
): Promise<{ success: true } | { success: false; message: string }> {
  const auth = await ensureAdmin();
  if (!auth.ok) return { success: false, message: auth.message };

  const supabase = await createSupabaseServerClient();
  const { data: rowRaw, error: fetchErr } = await supabase
    .from("gm_global_audio_tracks")
    .select("storage_key")
    .eq("id", id)
    .single();
  const row = rowRaw as { storage_key: string } | null;
  if (fetchErr || !row) return { success: false, message: "Traccia non trovata." };

  try {
    const { bucket } = getR2Config();
    const client = getR2S3Client();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: row.storage_key }));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Errore eliminazione da R2.";
    return { success: false, message: msg };
  }

  const { error: delErr } = await supabase.from("gm_global_audio_tracks").delete().eq("id", id);
  if (delErr) return { success: false, message: delErr.message };
  return { success: true };
}
