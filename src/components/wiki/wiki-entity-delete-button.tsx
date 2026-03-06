"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteEntity } from "@/app/campaigns/wiki-actions";
import { Trash2, Loader2 } from "lucide-react";

type WikiEntityDeleteButtonProps = {
  campaignId: string;
  entityId: string;
  entityName: string;
};

export function WikiEntityDeleteButton({
  campaignId,
  entityId,
  entityName,
}: WikiEntityDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    setIsDeleting(true);
    try {
      const result = await deleteEntity(entityId, campaignId);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.push(`/campaigns/${campaignId}?tab=wiki`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Si è verificato un errore. Riprova.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Elimina
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-barber-paper">
              Eliminare questa voce?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-barber-paper/70">
              Stai per eliminare &quot;{entityName}&quot;. L&apos;azione è irreversibile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="border-barber-gold/40 text-barber-paper/80"
            >
              Annulla
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={isDeleting}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirm}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
