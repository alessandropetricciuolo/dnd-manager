"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

export function AccountDeletionRequest() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        setMessage("Accedi al tuo account per inviare la richiesta.");
        return;
      }
      const response = await fetch("/api/mobile/account-deletion", {
        method: "POST",
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!response.ok) throw new Error("Request failed");
      setMessage("Richiesta registrata. Il team la prenderà in carico manualmente; l’invio non elimina subito l’account.");
    } catch {
      setMessage("Non siamo riusciti a inviare la richiesta. Riprova o contatta il supporto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-brass-base/25 bg-guild-oak/40 p-5">
      <p className="text-sm leading-6 text-barber-paper/80">
        Puoi inviare una richiesta autenticata dal tuo account. La richiesta viene gestita manualmente e non cancella automaticamente i dati.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={busy} className="bg-red-900 text-white hover:bg-red-800">
          {busy ? "Invio…" : "Invia richiesta di cancellazione"}
        </Button>
        <Link href="/login?next=/delete-account" className="text-sm text-barber-gold underline">
          Accedi
        </Link>
      </div>
      {message ? <p role="status" className="mt-4 text-sm leading-6 text-barber-paper/90">{message}</p> : null}
    </div>
  );
}
