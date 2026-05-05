"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { PencilIcon, Trash2Icon } from "lucide-react";
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
import { deleteSession, type OpenCalendarSessionRow } from "@/app/campaigns/actions";
import { EditOpenCalendarEventDialog } from "@/components/dashboard/edit-open-calendar-event-dialog";

type Props = {
  session: OpenCalendarSessionRow;
  gmAdminUsers: { id: string; label: string }[];
  defaultDmId: string | null;
};

export function CalendarOpenEventQuickActions({ session, gmAdminUsers, defaultDmId }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function confirmDelete() {
    setDeleteLoading(true);
    const res = await deleteSession(session.id);
    setDeleteLoading(false);
    if (res.success) {
      setDeleteOpen(false);
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <>
      <EditOpenCalendarEventDialog
        session={session}
        open={editOpen}
        onOpenChange={setEditOpen}
        gmAdminUsers={gmAdminUsers}
        defaultDmId={defaultDmId}
        onSaved={() => router.refresh()}
      />

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !o && !deleteLoading && setDeleteOpen(false)}>
        <AlertDialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo evento?</AlertDialogTitle>
            <AlertDialogDescription className="text-barber-paper/70">
              Verranno rimosse anche le iscrizioni ({session.signup_count}). Questa azione non si può annullare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-barber-gold/30 bg-barber-dark text-barber-paper" disabled={deleteLoading}>
              Annulla
            </AlertDialogCancel>
            <Button
              type="button"
              className="bg-red-700 text-white hover:bg-red-600"
              disabled={deleteLoading}
              onClick={() => void confirmDelete()}
            >
              {deleteLoading ? "Eliminazione..." : "Elimina"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
          onClick={() => setEditOpen(true)}
        >
          <PencilIcon className="mr-1.5 h-3.5 w-3.5" />
          Modifica evento
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-red-500/40 text-red-200 hover:bg-red-950/40"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2Icon className="mr-1.5 h-3.5 w-3.5" />
          Elimina
        </Button>
      </div>
    </>
  );
}
