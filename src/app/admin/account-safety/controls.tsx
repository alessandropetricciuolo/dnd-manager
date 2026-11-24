"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { closeWhisperReport, retryAccountDeletionEmail } from "./actions";

export function SafetyAction({ id, action }: { id: string; action: "archive" | "remove" | "resend" }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (action === "remove" && !window.confirm("Rimuovere definitivamente il sussurro dalla conversazione?")) return;
    setPending(true);
    try {
      const result = action === "resend"
        ? await retryAccountDeletionEmail(id)
        : await closeWhisperReport(id, action === "remove");
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      toast.error("Operazione non riuscita. Riprova.");
    } finally {
      setPending(false);
    }
  }

  const label = { archive: "Archivia", remove: "Rimuovi sussurro", resend: "Riprova invio email" }[action];
  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick} disabled={pending}
      className={action === "remove" ? "border-red-500/50 text-red-300" : "border-barber-gold/40"}>
      {pending ? "Operazione in corso…" : label}
    </Button>
  );
}
