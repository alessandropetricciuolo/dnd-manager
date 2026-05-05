"use client";

import { useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { it } from "date-fns/locale";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { formatSessionInRome } from "@/lib/session-datetime";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  assignCampaignToOpenSession,
  deleteSession,
  type OpenCalendarSessionRow,
} from "@/app/campaigns/actions";
import { EditOpenCalendarEventDialog } from "@/components/dashboard/edit-open-calendar-event-dialog";

type CampaignOption = { id: string; name: string };

export function OpenCalendarSessionsGmPanelClient({
  sessions,
  campaigns,
  gmAdminUsers,
  defaultDmId,
}: {
  sessions: OpenCalendarSessionRow[];
  campaigns: CampaignOption[];
  gmAdminUsers: { id: string; label: string }[];
  defaultDmId: string | null;
}) {
  const router = useRouter();
  const [selectionBySession, setSelectionBySession] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OpenCalendarSessionRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editSession, setEditSession] = useState<OpenCalendarSessionRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  async function handleAssign(sessionId: string) {
    const campaignId = selectionBySession[sessionId]?.trim();
    if (!campaignId) {
      toast.error("Seleziona una campagna.");
      return;
    }
    setLoadingId(sessionId);
    const res = await assignCampaignToOpenSession(sessionId, campaignId);
    setLoadingId(null);
    if (res.success) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const res = await deleteSession(deleteTarget.id);
    setDeleteLoading(false);
    if (res.success) {
      setDeleteTarget(null);
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <>
      <EditOpenCalendarEventDialog
        session={editSession}
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) setEditSession(null);
        }}
        gmAdminUsers={gmAdminUsers}
        defaultDmId={defaultDmId}
        onSaved={() => router.refresh()}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && !deleteLoading && setDeleteTarget(null)}>
        <AlertDialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo evento?</AlertDialogTitle>
            <AlertDialogDescription className="text-barber-paper/70">
              {deleteTarget ? (
                <>
                  Verranno rimosse anche le iscrizioni ({deleteTarget.signup_count}). Questa azione non si può
                  annullare.
                </>
              ) : null}
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

      <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-4">
        <h2 className="text-lg font-semibold text-barber-paper">Eventi senza campagna</h2>
        <p className="mt-1 text-sm text-barber-paper/70">
          Modifica o elimina uno slot, oppure collega una campagna: gli iscritti restano sulla stessa sessione.
        </p>
        {campaigns.length === 0 ? (
          <p className="mt-4 text-sm text-amber-200/90">
            Non hai campagne assegnabili (come GM titolare). Crea una campagna prima di collegarla.
          </p>
        ) : null}
        <ul className="mt-4 space-y-4">
          {sessions.length === 0 ? (
            <li className="rounded-lg border border-dashed border-barber-gold/25 bg-barber-dark/40 px-4 py-8 text-center text-sm text-barber-paper/65">
              Nessun evento senza campagna in calendario. Creane uno con il pulsante sopra il calendario oppure modifica gli slot dalla vista giornaliera.
            </li>
          ) : null}
          {sessions.map((s) => {
            const dateLabel = formatSessionInRome(s.scheduled_at, "EEEE d MMMM yyyy, HH:mm", { locale: it });
            return (
              <li
                key={s.id}
                className="flex flex-col gap-3 rounded-lg border border-barber-gold/20 bg-barber-dark/60 p-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-barber-paper">{s.title?.trim() || "Evento senza titolo"}</p>
                  <p className="text-xs text-barber-paper/60">{dateLabel}</p>
                  {s.notes?.trim() ? <p className="text-xs text-barber-paper/55">{s.notes}</p> : null}
                  <p className="text-xs text-barber-gold/80">{s.signup_count} iscritti · max {s.max_players} giocatori</p>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
                    disabled={loadingId === s.id}
                    onClick={() => {
                      setEditSession(s);
                      setEditOpen(true);
                    }}
                  >
                    <PencilIcon className="mr-1.5 h-3.5 w-3.5" />
                    Modifica
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-red-500/40 text-red-200 hover:bg-red-950/40"
                    disabled={loadingId === s.id}
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2Icon className="mr-1.5 h-3.5 w-3.5" />
                    Elimina
                  </Button>
                </div>
                <div className="flex w-full flex-col gap-2 border-t border-barber-gold/15 pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4 sm:min-w-[220px]">
                  <Label htmlFor={`camp-${s.id}`} className="text-xs text-barber-paper/70">
                    Collega campagna
                  </Label>
                  <Select
                    value={selectionBySession[s.id] ?? ""}
                    onValueChange={(v) => setSelectionBySession((prev) => ({ ...prev, [s.id]: v }))}
                    disabled={loadingId === s.id || campaigns.length === 0}
                  >
                    <SelectTrigger id={`camp-${s.id}`} className="bg-barber-dark border-barber-gold/30 text-barber-paper">
                      <SelectValue placeholder="Scegli campagna..." />
                    </SelectTrigger>
                    <SelectContent className="border-barber-gold/30 bg-barber-dark">
                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-barber-paper">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
                    disabled={loadingId === s.id || campaigns.length === 0}
                    onClick={() => handleAssign(s.id)}
                  >
                    {loadingId === s.id ? "Salvataggio..." : "Collega campagna"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
