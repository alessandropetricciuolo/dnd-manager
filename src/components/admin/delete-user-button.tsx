"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteUser } from "@/app/admin/actions";

type DeleteUserButtonProps = {
  userId: string;
  userLabel: string;
  /** Se true, dopo l'eliminazione redirect a /admin (es. dalla pagina dossier) */
  redirectAfter?: boolean;
};

export function DeleteUserButton({
  userId,
  userLabel,
  redirectAfter = false,
}: DeleteUserButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm() {
    setIsLoading(true);
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        if (redirectAfter) {
          router.push("/admin");
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Errore durante l'eliminazione.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Elimina
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare utente?</AlertDialogTitle>
          <AlertDialogDescription className="text-barber-paper/70">
            Stai per eliminare <strong>{userLabel}</strong>. Verranno rimossi account, profilo e iscrizioni alle sessioni.
            Le sessioni di cui è DM verranno lasciate senza DM. Non puoi eliminare un utente che è GM di una campagna:
            assegna prima un altro GM. Questa azione non è reversibile.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            className="border-barber-paper/30 text-barber-paper"
            disabled={isLoading}
          >
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            disabled={isLoading}
          >
            {isLoading ? "Eliminazione..." : "Elimina utente"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
