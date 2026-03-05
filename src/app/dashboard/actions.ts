"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getPlayerEmails } from "@/lib/player-emails";
import { sendEmail, wrapInTemplate, escapeHtml } from "@/lib/email";

export type CreateCampaignResult = {
  success: boolean;
  message: string;
};

export async function createCampaign(
  formData: FormData
): Promise<CreateCampaignResult> {
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const isPublic = formData.get("is_public") === "on" || formData.get("is_public") === "true";
  const typeRaw = (formData.get("type") as string | null)?.trim()?.toLowerCase();
  const type = typeRaw && ["oneshot", "quest", "long"].includes(typeRaw)
    ? (typeRaw as "oneshot" | "quest" | "long")
    : null;

  if (!title) {
    return { success: false, message: "Il titolo è obbligatorio." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato per creare una campagna." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono creare campagne." };
    }

    const { error } = await supabase.from("campaigns").insert({
      gm_id: user.id,
      name: title,
      description: description || null,
      is_public: isPublic,
      ...(type && { type }),
    });

    if (error) {
      console.error("[createCampaign]", error);
      return {
        success: false,
        message: error.message ?? "Errore durante la creazione della campagna.",
      };
    }

    try {
      const playerEmails = await getPlayerEmails();
      if (playerEmails.length > 0) {
        void sendEmail({
          to: process.env.GMAIL_USER ?? "",
          bcc: playerEmails,
          subject: `Nuova Campagna Disponibile: ${title}`,
          html: wrapInTemplate(
            `<p>È stata creata una nuova campagna: <strong>${escapeHtml(title)}</strong>.</p><p>Accedi al sito per scoprirla e iscriverti alle sessioni.</p>`
          ),
        });
      }
    } catch (mailErr) {
      console.error("[createCampaign] invio email:", mailErr);
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Campagna creata!" };
  } catch (err) {
    console.error("[createCampaign]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}
