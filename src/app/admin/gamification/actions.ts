"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { upsertAvatar } from "@/lib/actions/gamification";

const AVATARS_GALLERY_BUCKET = "avatars_gallery";
const MAX_AVATAR_UPLOAD_BYTES = 3 * 1024 * 1024;

export type CreateAvatarResult = { success: boolean; message: string };

export async function createAvatarFromUpload(formData: FormData): Promise<CreateAvatarResult> {
  const name = (formData.get("name") as string | null)?.trim() || "";
  const isDefault = formData.get("is_default") === "on";
  const requiredAchievementIdRaw = (formData.get("required_achievement_id") as string | null) || null;
  const imageFile = formData.get("image") as File | null;

  if (!name) {
    return { success: false, message: "Il nome è obbligatorio." };
  }
  if (!imageFile || imageFile.size === 0) {
    return { success: false, message: "Seleziona un file immagine." };
  }
  if (imageFile.size > MAX_AVATAR_UPLOAD_BYTES) {
    const sizeMb = (imageFile.size / (1024 * 1024)).toFixed(2);
    return {
      success: false,
      message: `Immagine troppo grande (${sizeMb}MB). Limite upload: 3MB.`,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Non autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return { success: false, message: "Solo admin." };
    }

    const ext = imageFile.name.split(".").pop()?.toLowerCase() || "png";
    const allowed = ["jpg", "jpeg", "png", "webp"];
    if (!allowed.includes(ext)) {
      return { success: false, message: "Formato non supportato. Usa JPG, PNG o WebP." };
    }

    const path = `avatars/${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATARS_GALLERY_BUCKET)
      .upload(path, imageFile, { contentType: imageFile.type, upsert: false });

    if (uploadError) {
      console.error("[createAvatarFromUpload] upload", uploadError);
      return { success: false, message: uploadError.message ?? "Errore upload immagine." };
    }

    const { data: urlData } = supabase.storage.from(AVATARS_GALLERY_BUCKET).getPublicUrl(path);
    const imageUrl = urlData.publicUrl;

    const upsertRes = await upsertAvatar({
      name,
      image_url: imageUrl,
      is_default: isDefault,
      required_achievement_id: isDefault ? null : requiredAchievementIdRaw,
    });

    if (!upsertRes.success) {
      return { success: false, message: upsertRes.message ?? "Errore salvataggio avatar." };
    }

    revalidatePath("/admin/gamification");
    return { success: true, message: "Avatar creato." };
  } catch (err) {
    console.error("[createAvatarFromUpload]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

