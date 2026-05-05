"use client";

import { useState, type FormEvent } from "react";
import { format } from "date-fns";
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
  DialogTrigger,
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
import { createOpenCalendarEvent } from "@/app/campaigns/actions";
import { cn } from "@/lib/utils";

type CreateOpenCalendarEventDialogProps = {
  gmAdminUsers: { id: string; label: string }[];
  defaultDmId: string | null;
};

export function CreateOpenCalendarEventDialog({
  gmAdminUsers,
  defaultDmId,
}: CreateOpenCalendarEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dmId, setDmId] = useState<string>(defaultDmId ?? "");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (!date) {
      toast.error("Seleziona una data.");
      return;
    }

    formData.set("date", format(date, "yyyy-MM-dd"));
    if (dmId) formData.set("dm_id", dmId);

    setIsLoading(true);
    try {
      const result = await createOpenCalendarEvent(formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setDate(undefined);
        setDmId(defaultDmId ?? "");
        form.reset();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10">
          <CalendarIcon className="mr-2 h-4 w-4" />
          Nuovo evento (senza campagna)
        </Button>
      </DialogTrigger>
      <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Evento sul calendario</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Crea uno slot che i giocatori possono prenotare. Potrai collegare una campagna in seguito dalla sezione sotto il calendario.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="open-event-title">Titolo (opzionale)</Label>
            <Input
              id="open-event-title"
              name="title"
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
              <Label htmlFor="open-event-dm">Dungeon Master</Label>
              <Select value={dmId || undefined} onValueChange={setDmId} disabled={isLoading}>
                <SelectTrigger id="open-event-dm" className="bg-barber-dark border-barber-gold/30 text-barber-paper">
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
            <Label htmlFor="open-event-time">Orario (Italia / Europe/Rome)</Label>
            <Input
              id="open-event-time"
              name="time"
              type="time"
              defaultValue="20:00"
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="open-event-max">Posti massimi</Label>
            <Input
              id="open-event-max"
              name="max_players"
              type="number"
              min={1}
              max={20}
              defaultValue={6}
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="open-event-location">Luogo / note</Label>
            <div className="flex items-start gap-2 rounded-md border border-barber-gold/20 bg-barber-dark/50 px-3 py-2">
              <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-barber-gold/70" />
              <Input
                id="open-event-location"
                name="location"
                placeholder="Es. Online · Discord oppure sede..."
                className="border-0 bg-transparent px-0 text-barber-paper shadow-none focus-visible:ring-0"
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
              Annulla
            </Button>
            <Button type="submit" className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90" disabled={isLoading}>
              {isLoading ? "Creazione..." : "Crea evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
