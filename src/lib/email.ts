import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

function getTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SITE_URL = "https://barberanddragons.com";

/** Colori brand: scuro #1c1917, oro #fbbf24, rosso #991b1b. Template coerente al sito (dark, oro). */
export function wrapInTemplate(content: string): string {
  const logoHtml = `<a href="${SITE_URL}" style="color:#fbbf24;font-size:1.25rem;font-weight:700;text-decoration:none;">Barber &amp; Dragons</a>`;
  const ctaButton = `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:1.5rem auto 0;">
      <tr>
        <td style="border-radius:0.5rem;text-align:center;background:#fbbf24;">
          <a href="${SITE_URL}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:0.75rem 1.5rem;color:#1c1917;font-size:1rem;font-weight:600;text-decoration:none;">Visita la gilda</a>
        </td>
      </tr>
    </table>`;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Barber &amp; Dragons</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#1c1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr>
      <td style="background:#1c1917;padding:1.25rem 1.5rem;text-align:center;border-bottom:1px solid rgba(251,191,36,0.3);">
        ${logoHtml}
      </td>
    </tr>
    <tr>
      <td style="background:#1c1917;padding:1.5rem;color:#fafaf9;line-height:1.6;">
        ${content}
        ${ctaButton}
      </td>
    </tr>
    <tr>
      <td style="background:#1c1917;padding:1rem 1.5rem;text-align:center;font-size:0.75rem;border-top:1px solid rgba(251,191,36,0.2);">
        <span style="color:#fbbf24;">Barber &amp; Dragons</span>
        <span style="color:rgba(250,250,249,0.6);"> · </span>
        <span style="color:#b91c1c;">D&amp;D Campaign Manager</span>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
  replyTo?: string | string[];
};

/** Contenuto HTML per email di recupero password (link generato da Supabase Admin generateLink). */
export function passwordResetEmailContent(resetLink: string): string {
  const safeLink = escapeHtml(resetLink);
  return wrapInTemplate(
    `<p>Ciao,</p><p>È stata richiesta una reimpostazione della password per il tuo account Barber &amp; Dragons.</p>` +
      `<p><a href="${safeLink}" style="color:#fbbf24;text-decoration:underline;">Clicca qui per reimpostare la password</a></p>` +
      `<p>Se il link non funziona, copia e incolla questo indirizzo nel browser:</p><p style="word-break:break-all;font-size:0.85rem;color:#fafaf9;">${safeLink}</p>` +
      `<p>Il link scade dopo un'ora. Se non hai richiesto tu il reset, ignora questa email.</p>`
  );
}

/**
 * Invia una mail. Restituisce true se inviata, false se transporter non configurato o errore.
 * Non lancia: gli errori vengono solo loggati.
 */
export async function sendEmail({ to, subject, html, bcc, replyTo }: SendEmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] GMAIL_USER o GMAIL_APP_PASSWORD non configurati; skip invio.");
    return false;
  }
  try {
    const toList = Array.isArray(to) ? to : [to];
    const bccList = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;
    const replyToList = replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : undefined;
    if (toList.length === 0 && (!bccList || bccList.length === 0)) {
      return true;
    }
    await transporter.sendMail({
      from: GMAIL_USER!,
      to: toList.length ? toList : undefined,
      bcc: bccList,
      replyTo: replyToList,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] Errore invio:", err);
    return false;
  }
}
