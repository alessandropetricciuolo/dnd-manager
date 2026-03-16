"use server";

import { sendEmail, wrapInTemplate, escapeHtml } from "@/lib/email";

const CONTACT_TO = "barberanddragons@gmail.com";

export type SendContactEmailResult = { success: boolean; message: string };

/**
 * Invia il messaggio del form Contatti alla casella Gmail del team.
 * replyTo = email dell'utente così si può rispondere direttamente.
 */
export async function sendContactEmail(
  formData: FormData
): Promise<SendContactEmailResult> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!name) {
    return { success: false, message: "Inserisci il tuo nome." };
  }
  if (!email) {
    return { success: false, message: "Inserisci la tua email." };
  }
  if (!subject) {
    return { success: false, message: "Inserisci un oggetto." };
  }
  if (!message) {
    return { success: false, message: "Inserisci il messaggio." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, message: "Indirizzo email non valido." };
  }

  try {
    const subjectLine = `[Contatti] ${escapeHtml(subject)} — ${escapeHtml(name)}`;
    const bodyHtml = wrapInTemplate(
      `<p><strong>Da:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>` +
        `<p><strong>Oggetto richiesto:</strong> ${escapeHtml(subject)}</p>` +
        `<hr style="border:none;border-top:1px solid rgba(251,191,36,0.3);margin:1rem 0;">` +
        `<div style="white-space:pre-wrap;">${escapeHtml(message)}</div>`
    );

    const sent = await sendEmail({
      to: CONTACT_TO,
      replyTo: email,
      subject: subjectLine,
      html: bodyHtml,
    });

    if (!sent) {
      return {
        success: false,
        message: "Invio temporaneamente non disponibile. Riprova più tardi.",
      };
    }

    return { success: true, message: "Messaggio inviato! Ti risponderemo al più presto." };
  } catch (err) {
    console.error("[sendContactEmail]", err);
    return {
      success: false,
      message: "Si è verificato un errore. Riprova più tardi.",
    };
  }
}
