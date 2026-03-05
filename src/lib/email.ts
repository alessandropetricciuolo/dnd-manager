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

/** Colori brand: oro #fbbf24, rosso #991b1b. Template responsive con header scuro, body chiaro, footer brand. */
export function wrapInTemplate(content: string): string {
  const logoHtml =
    '<a href="#" style="color:#fbbf24;font-size:1.25rem;font-weight:700;text-decoration:none;">Barber &amp; Dragons</a>';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Barber & Dragons</title>
</head>
<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f4;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr>
      <td style="background:#1c1917;padding:1.25rem 1.5rem;text-align:center;">
        ${logoHtml}
      </td>
    </tr>
    <tr>
      <td style="background:#f5f5f4;padding:1.5rem;color:#292524;line-height:1.6;">
        ${content}
      </td>
    </tr>
    <tr>
      <td style="background:#1c1917;padding:1rem 1.5rem;text-align:center;font-size:0.75rem;">
        <span style="color:#fbbf24;">Barber &amp; Dragons</span>
        <span style="color:rgba(245,245,244,0.7);"> · </span>
        <span style="color:#991b1b;">D&amp;D Campaign Manager</span>
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
};

/**
 * Invia una mail. Restituisce true se inviata, false se transporter non configurato o errore.
 * Non lancia: gli errori vengono solo loggati.
 */
export async function sendEmail({ to, subject, html, bcc }: SendEmailOptions): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[email] GMAIL_USER o GMAIL_APP_PASSWORD non configurati; skip invio.");
    return false;
  }
  try {
    const toList = Array.isArray(to) ? to : [to];
    const bccList = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : undefined;
    if (toList.length === 0 && (!bccList || bccList.length === 0)) {
      return true;
    }
    await transporter.sendMail({
      from: GMAIL_USER!,
      to: toList.length ? toList : undefined,
      bcc: bccList,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[email] Errore invio:", err);
    return false;
  }
}
