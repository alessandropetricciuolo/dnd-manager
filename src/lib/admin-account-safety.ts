import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { accountSafetyClient } from "@/utils/supabase/account-safety";
import { sendEmail, wrapInTemplate } from "@/lib/email";
import { revokeAppleAuthorization } from "@/lib/apple-sign-in";

export const ACCOUNT_SAFETY_PATH = "/admin/account-safety";

export async function getAccountSafetyAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const admin = accountSafetyClient(createSupabaseAdminClient());
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return null;

  return { admin, userId: user.id };
}

export async function sendDeletionConfirmation(
  admin: ReturnType<typeof accountSafetyClient>,
  requestId: string,
): Promise<boolean> {
  const claim = new Date().toISOString();
  const expired = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await admin.from("account_deletion_requests")
    .update({ confirmation_claimed_at: claim })
    .eq("id", requestId)
    .eq("status", "completed")
    .is("confirmation_sent_at", null)
    .not("confirmation_email", "is", null)
    .or(`confirmation_claimed_at.is.null,confirmation_claimed_at.lt.${expired}`)
    .select("confirmation_email")
    .maybeSingle();

  if (error) {
    console.error("[account deletion] claim confirmation", error.code);
    return false;
  }
  if (!data?.confirmation_email) return false;

  const sent = await sendEmail({
    to: data.confirmation_email,
    subject: "Cancellazione account completata · Barber & Dragons",
    html: wrapInTemplate("<p>Ti confermiamo che la cancellazione del tuo account Barber &amp; Dragons è stata completata.</p>"),
  });
  const { data: updated, error: updateError } = await admin.from("account_deletion_requests")
    .update(sent ? {
      confirmation_email: null,
      confirmation_claimed_at: null,
      confirmation_sent_at: new Date().toISOString(),
    } : { confirmation_claimed_at: null })
    .eq("id", requestId)
    .eq("confirmation_claimed_at", claim)
    .select("id")
    .maybeSingle();

  if (updateError) console.error("[account deletion] confirmation state", updateError.code);
  return sent && Boolean(updated) && !updateError;
}

export async function revokeDeletionAppleAccess(
  admin: ReturnType<typeof accountSafetyClient>,
  requestId: string,
): Promise<boolean> {
  const { data, error } = await admin.from("account_deletion_requests")
    .select("apple_revocation_token, apple_web_revocation_token")
    .eq("id", requestId)
    .eq("status", "completed")
    .maybeSingle();

  if (error || !data) return false;
  const columns = ["apple_revocation_token", "apple_web_revocation_token"] as const;
  const revoked = await Promise.all(columns.map(async (column) => {
    const token = data[column];
    if (!token) return true;
    if (!await revokeAppleAuthorization(token, column === "apple_web_revocation_token").catch(() => false)) {
      return false;
    }

    const { error: updateError } = await admin.from("account_deletion_requests")
      .update({ [column]: null })
      .eq("id", requestId)
      .eq(column, token);
    return !updateError;
  }));
  return revoked.every(Boolean);
}
