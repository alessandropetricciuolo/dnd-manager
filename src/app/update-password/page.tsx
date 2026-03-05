import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export const dynamic = "force-dynamic";

/** Pagina protetta: l'utente ci arriva dal link nella mail (auth/callback lo logga). Se non c'è sessione → login. */
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
