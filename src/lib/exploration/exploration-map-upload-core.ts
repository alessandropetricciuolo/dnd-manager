import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadToTelegram } from "@/lib/telegram-storage";

export type MapUploadResult =
  | { success: true; data: { id: string } }
  | { success: false; error: string };

/** FormData file entries are not always `instanceof File` in the Node server-actions runtime. */
function readImageBlobFromFormData(formData: FormData):
  | { ok: true; blob: Blob; contentType: string }
  | { ok: false; error: string } {
  const raw = formData.get("image");
  if (raw == null || typeof raw === "string") {
    return { ok: false, error: "Seleziona un'immagine." };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Seleziona un'immagine." };
  }
  const blob = raw as Blob;
  if (typeof blob.size !== "number" || blob.size === 0) {
    return { ok: false, error: "Seleziona un'immagine." };
  }
  if (typeof blob.arrayBuffer !== "function") {
    return { ok: false, error: "Seleziona un'immagine." };
  }
  let contentType = blob.type;
  const fileName =
    "name" in raw && typeof (raw as File).name === "string" ? (raw as File).name : "";
  if (!contentType && fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".png")) contentType = "image/png";
    else if (lower.endsWith(".webp")) contentType = "image/webp";
    else if (lower.endsWith(".gif")) contentType = "image/gif";
    else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(contentType)) {
    return { ok: false, error: "Formato non supportato (JPG, PNG, WebP, GIF)." };
  }
  return { ok: true, blob, contentType };
}

async function requireGm(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, ok: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const ok = profile?.role === "gm" || profile?.role === "admin";
  return { user, ok };
}

const MAX_BYTES = 4 * 1024 * 1024; // allineato al limite body route / API

/**
 * Carica l'immagine su Telegram (come mappe wiki e campagne) e inserisce la riga con
 * `image_path` = `/api/tg-image/<file_id>`.
 */
export async function createExplorationMapFromFormData(
  supabase: SupabaseClient,
  campaignId: string,
  formData: FormData
): Promise<MapUploadResult> {
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Solo il Master può creare mappe." };

  const floorLabel = (formData.get("floor_label") as string | null)?.trim() ?? "";
  const sortOrderRaw = (formData.get("sort_order") as string | null)?.trim() ?? "0";
  const gridRaw = (formData.get("grid_cell_meters") as string | null)?.trim() ?? "";
  const imageRead = readImageBlobFromFormData(formData);
  if (!imageRead.ok) {
    return { success: false, error: imageRead.error };
  }
  const { blob, contentType } = imageRead;

  if (blob.size > MAX_BYTES) {
    return {
      success: false,
      error: "File ancora troppo grande dopo la compressione. Riduci risoluzione o qualità.",
    };
  }

  const uploadName =
    contentType === "image/png"
      ? "map.png"
      : contentType === "image/gif"
        ? "map.gif"
        : contentType === "image/webp"
          ? "map.webp"
          : "map.jpg";
  const file = new File([blob], uploadName, { type: contentType });

  let fileId: string;
  try {
    fileId = await uploadToTelegram(file, undefined, "photo");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload Telegram fallito.";
    return { success: false, error: msg };
  }

  const imagePath = `/api/tg-image/${fileId}`;

  const sortOrder = Number.parseInt(sortOrderRaw, 10);
  const grid_cell_meters =
    gridRaw === "" ? null : Number.parseFloat(gridRaw.replace(",", "."));
  const gridOk =
    grid_cell_meters != null && Number.isFinite(grid_cell_meters) && grid_cell_meters > 0
      ? grid_cell_meters
      : null;

  const { data: row, error: insErr } = await supabase
    .from("campaign_exploration_maps")
    .insert({
      campaign_id: campaignId,
      floor_label: floorLabel,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      image_path: imagePath,
      grid_cell_meters: gridOk,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    return { success: false, error: insErr?.message ?? "Salvataggio fallito." };
  }

  return { success: true, data: { id: row.id } };
}
