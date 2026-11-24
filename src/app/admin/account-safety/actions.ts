"use server";

import { revalidatePath } from "next/cache";
import { ACCOUNT_SAFETY_PATH, getAccountSafetyAdmin, revokeDeletionAppleAccess, sendDeletionConfirmation } from "@/lib/admin-account-safety";

export async function retryAccountDeletionEmail(requestId: string) {
  const caller = await getAccountSafetyAdmin();
  if (!caller) return { success: false, message: "Accesso riservato agli admin." };
  const success = await sendDeletionConfirmation(caller.admin, requestId);
  revalidatePath(ACCOUNT_SAFETY_PATH);
  return {
    success,
    message: success ? "Email di conferma inviata." : "Email non inviata. Verifica lo stato della richiesta e riprova.",
  };
}

export async function closeWhisperReport(reportId: string, remove: boolean) {
  const caller = await getAccountSafetyAdmin();
  if (!caller) return { success: false, message: "Accesso riservato agli admin." };
  if (typeof remove !== "boolean") return { success: false, message: "Esito non valido." };

  const { data, error } = await caller.admin.rpc("review_whisper_report", {
    p_report_id: reportId,
    p_admin_id: caller.userId,
    p_remove: remove,
  });
  if (error) {
    console.error("[whisper moderation] review", error.code);
    return { success: false, message: "Impossibile chiudere la segnalazione. Riprova." };
  }

  revalidatePath(ACCOUNT_SAFETY_PATH);
  if (!data) return { success: false, message: "Segnalazione già chiusa o non più disponibile." };
  return { success: true, message: remove ? "Sussurro rimosso e segnalazione chiusa." : "Segnalazione archiviata." };
}

export async function retryAppleRevocation(requestId: string) {
  const caller = await getAccountSafetyAdmin();
  if (!caller) return { success: false, message: "Accesso riservato agli admin." };
  const success = await revokeDeletionAppleAccess(caller.admin, requestId);
  revalidatePath(ACCOUNT_SAFETY_PATH);
  return {
    success,
    message: success ? "Accesso Apple revocato." : "Revoca Apple ancora in sospeso. Riprova.",
  };
}
