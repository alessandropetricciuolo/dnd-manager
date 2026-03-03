"use client";

import { useState, useEffect, type FormEvent } from "react";
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
import { createSession } from "@/app/campaigns/actions";
import { cn } from "@/lib/utils";

type CreateSessionDialogProps = {
  campaignId: string;
  gmAdminUsers: { id: string; label: string }[];
  defaultDmId: string | null;
};

export function CreateSessionDialog({ campaignId, gmAdminUsers, defaultDmId }: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dmId, setDmId] = useState<string>(defaultDmId ?? "");

  useEffect(() => {
    if (open) setDmId(defaultDmId ?? "");
  }, [open, defaultDmId]);

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
      const result = await createSession(campaignId, formData);

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
        <Button
          type="button"
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Nuova Sessione
        </Button>
      </DialogTrigger>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>Nuova sessione</DialogTitle>
          <DialogDescription className="text-slate-400">
            Pianifica una nuova sessione di gioco: data, orario e luogo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal border-slate-700 bg-slate-900/70 text-slate-50 hover:bg-slate-800",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: it }) : "Scegli data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-slate-700 bg-slate-900" align="start">
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
              <Label htmlFor="session-dm">Dungeon Master</Label>
              <Select value={dmId || undefined} onValueChange={setDmId} disabled={isLoading}>
                <SelectTrigger
                  id="session-dm"
                  className="bg-slate-900/70 border-slate-700 text-slate-50"
                >
                  <SelectValue placeholder="Seleziona il DM" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-900">
                  {gmAdminUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-slate-50">
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-time">Orario</Label>
            <Input
              id="session-time"
              name="time"
              type="time"
              defaultValue="20:00"
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-location">
              <MapPinIcon className="mr-1.5 inline h-4 w-4" />
              Luogo
            </Label>
            <Input
              id="session-location"
              name="location"
              placeholder="Es. Taverna del Drago, Discord..."
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-max-players">Max giocatori</Label>
            <Input
              id="session-max-players"
              name="max_players"
              type="number"
              min={1}
              max={20}
              defaultValue={6}
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="border-slate-600 text-slate-300"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              {isLoading ? "Creazione..." : "Crea sessione"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
