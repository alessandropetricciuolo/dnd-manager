"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Se l'utente atterra sulla homepage (o su qualsiasi pagina) con hash di errore
 * Supabase (#error=access_denied&error_code=otp_expired), reindirizza al login
 * con error=link_expired così può vedere il messaggio e richiedere un nuovo link.
 */
export function AuthHashErrorRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.slice(1) || "";
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const error = params.get("error");
    const errorCode = params.get("error_code");
    if (error === "access_denied" || errorCode === "otp_expired") {
      router.replace("/login?error=link_expired");
    }
  }, [pathname, router]);

  return null;
}
