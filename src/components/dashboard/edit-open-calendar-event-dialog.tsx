"use client";

import { useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { it } from "date-fns/locale";
import { toast } from "sonner";
import { CalendarIcon, MapPinIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOpenCalendarEvent, type OpenCalendarSessionRow } from "@/app/campaigns/actions";
import { SESSION_DISPLAY_TIMEZONE } from "@/lib/session-datetime";
import { cn } from "@/lib/utils";

type EditOpenCalendarEventDialogProps = {
  session: OpenCalendarSessionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gmAdminUsers: { id: string; label: string }[];
  defaultDmId: string | null;
  onSaved?: () => void;
};

export function EditOpenCalendarEventDialog({
  session,
  open,
  onOpenChange,
  gmAdminUsers,
  defaultDmId,
  onSaved,
}: EditOpenCalendarEventDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dmId, setDmId] = useState<string>("");
  const [timeStr, setTimeStr] = useState("20:00");
  const [maxPlayers, setMaxPlayers] = useState(6);

  useEffect(() => {
    if (!session || !open) return;
    const ymd = formatInTimeZone(session.scheduled_at, SESSION_DISPLAY_TIMEZONE, "yyyy-MM-dd");
    const [y, mo, d] = ymd.split("-").map(Number);
    setDate(new Date(y, mo - 1, d));
    setTimeStr(formatInTimeZone(session.scheduled_at, SESSION_DISPLAY_TIMEZONE, "HH:mm"));
    setDmId(session.dm_id ?? defaultDmId ?? "");
    setMaxPlayers(session.max_players ?? 6);
  }, [session, open, defaultDmId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading || !session) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!date) {
      toast.error("Seleziona una data.");
      return;
    }

    formData.set("date", format(date, "yyyy-MM-dd"));
    formData.set("time", timeStr);
    formData.set("max_players", String(maxPlayers));
    if (dmId) formData.set("dm_id", dmId);

    setIsLoading(true);
    try {
      const result = await updateOpenCalendarEvent(session.id, formData);

      if (result.success) {
        toast.success(result.message);
        onSaved?.();
        onOpenChange(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Si è verificato un errore. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Modifica evento</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Aggiorna data, titolo, luogo e posti. Valido finché l&apos;evento non è collegato a una campagna.
          </DialogDescription>
        </DialogHeader>
        {session ? (
          <form key={session.id} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-open-event-title-${session.id}`}>Titolo (opzionale)</Label>
              <Input
                id={`edit-open-event-title-${session.id}`}
                name="title"
                defaultValue={session.title ?? ""}
                placeholder="Es. One-shot sabato sera"
                className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-barber-gold/30 bg-barber-dark text-barber-paper hover:bg-barber-dark",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: it }) : "Scegli data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-barber-gold/30 bg-barber-dark" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {gmAdminUsers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor={`edit-open-event-dm-${session.id}`}>Dungeon Master</Label>
                <Select value={dmId || undefined} onValueChange={setDmId} disabled={isLoading}>
                  <SelectTrigger id={`edit-open-event-dm-${session.id}`} className="bg-barber-dark border-barber-gold/30 text-barber-paper">
                    <SelectValue placeholder="Seleziona il DM" />
                  </SelectTrigger>
                  <SelectContent className="border-barber-gold/30 bg-barber-dark">
                    {gmAdminUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-barber-paper">
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={`edit-open-event-time-${session.id}`}>Orario (Italia / Europe/Rome)</Label>
              <Input
                id={`edit-open-event-time-${session.id}`}
                name="time"
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-open-event-max-${session.id}`}>Posti massimi</Label>
              <Input
                id={`edit-open-event-max-${session.id}`}
                name="max_players"
                type="number"
                min={1}
                max={20}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number.parseInt(e.target.value, 10) || 6)}
                className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`edit-open-event-location-${session.id}`}>Luogo / note</Label>
              <div className="flex items-start gap-2 rounded-md border border-barber-gold/20 bg-barber-dark/50 px-3 py-2">
                <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-barber-gold/70" />
                <Input
                  id={`edit-open-event-location-${session.id}`}
                  name="location"
                  defaultValue={session.notes ?? ""}
                  placeholder="Es. Online · Discord oppure sede..."
                  className="border-0 bg-transparent px-0 text-barber-paper shadow-none focus-visible:ring-0"
                  disabled={isLoading}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Annulla
              </Button>
              <Button type="submit" className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90" disabled={isLoading}>
                {isLoading ? "Salvataggio..." : "Salva modifiche"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
