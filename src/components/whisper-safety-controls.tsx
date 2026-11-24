"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { acceptWhisperRules, reportReceivedWhisper } from "@/app/campaigns/whisper-actions";
import { WHISPER_RULES } from "../../mobile/src/lib/whisper-rules";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function WhisperRulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [pending, setPending] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
        <AlertDialogHeader>
          <AlertDialogTitle>Regole di Whisper</AlertDialogTitle>
          <AlertDialogDescription className="text-barber-paper/80">{WHISPER_RULES}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={async (event) => {
            event.preventDefault();
            setPending(true);
            try {
              const result = await acceptWhisperRules();
              if (!result.success) throw new Error(result.error);
              toast.success("Regole accettate. Puoi inviare il sussurro.");
              onOpenChange(false);
            } catch {
              toast.error("Accettazione non riuscita. Riprova.");
            } finally {
              setPending(false);
            }
          }}>{pending ? "Salvataggio…" : "Accetto"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ReportWhisperButton({ messageId }: { messageId: string }) {
  const [pending, setPending] = useState(false);
  const [reported, setReported] = useState(false);
  return (
    <button type="button" disabled={pending || reported}
      className="inline-flex min-h-7 items-center gap-1 rounded px-1 text-xs text-barber-paper/75 hover:text-barber-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-barber-gold"
      onClick={async () => {
        if (!window.confirm("Inviare questo sussurro all’admin per la verifica?")) return;
        setPending(true);
        try {
          const result = await reportReceivedWhisper(messageId);
          if (!result.success) throw new Error(result.error);
          setReported(true);
          toast.success("Segnalazione inviata.");
        } catch {
          toast.error("Impossibile inviare la segnalazione. Riprova.");
        } finally {
          setPending(false);
        }
      }}>
      <Flag className="h-3 w-3" aria-hidden="true" />
      {reported ? "Segnalato" : pending ? "Invio…" : "Segnala"}
    </button>
  );
}
