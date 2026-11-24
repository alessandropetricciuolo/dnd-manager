"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { closeWhisperReport, retryAccountDeletionEmail, retryAppleRevocation } from "./actions";

export function SafetyAction({ id, action }: { id: string; action: "archive" | "remove" | "resend" | "revoke-apple" }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (action === "remove" && !window.confirm("Rimuovere definitivamente il sussurro dalla conversazione?")) return;
    setPending(true);
    try {
      const handlers = {
        archive: () => closeWhisperReport(id, false),
        remove: () => closeWhisperReport(id, true),
        resend: () => retryAccountDeletionEmail(id),
        "revoke-apple": () => retryAppleRevocation(id),
      };
      const result = await handlers[action]();
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      toast.error("Operazione non riuscita. Riprova.");
    } finally {
      setPending(false);
    }
  }

  const label = {
    archive: "Archivia",
    remove: "Rimuovi sussurro",
    resend: "Riprova invio email",
    "revoke-apple": "Riprova revoca Apple",
  }[action];
  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={pending}
      className={action === "remove" ? "border-red-500/50 text-red-300" : "border-barber-gold/40"}>
      {pending ? "Operazione in corso…" : label}
    </Button>
  );
}
