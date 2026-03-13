import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const dynamic = "force-dynamic";

/**
 * Pagina protetta per completare il reset password.
 * L'utente arriva qui dopo il click sul link nella mail: auth/callback imposta la sessione e reindirizza qui.
 * Se non c'è sessione (es. link scaduto) → redirect a /login?next=/update-password.
 */
export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/update-password");
  }

  return <UpdatePasswordForm />;
}
