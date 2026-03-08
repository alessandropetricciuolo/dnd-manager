"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
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
import { toast } from "sonner";
import { createSession, listCampaignParties, createCampaignParty } from "@/app/campaigns/actions";
import { cn } from "@/lib/utils";

type CreateSessionDialogProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  gmAdminUsers: { id: string; label: string }[];
  defaultDmId: string | null;
};

export function CreateSessionDialog({
  campaignId,
  campaignType,
  gmAdminUsers,
  defaultDmId,
}: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dmId, setDmId] = useState<string>(defaultDmId ?? "");
  const [partyId, setPartyId] = useState<string>("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [newPartyName, setNewPartyName] = useState("");
  const [creatingParty, setCreatingParty] = useState(false);
  const isLongCampaign = campaignType === "long";

  useEffect(() => {
    if (open) setDmId(defaultDmId ?? "");
  }, [open, defaultDmId]);

  const loadParties = useCallback(() => {
    if (!campaignId) return;
    listCampaignParties(campaignId).then((res) => {
      if (res.success && res.data) {
        setParties(res.data.map((p) => ({ id: p.id, name: p.name })));
      } else {
        setParties([]);
      }
    });
  }, [campaignId]);

  useEffect(() => {
    if (open && isLongCampaign && campaignId) {
      loadParties();
    } else if (!open) {
      setPartyId("");
      setChapterTitle("");
      setNewPartyName("");
    }
  }, [open, isLongCampaign, campaignId, loadParties]);

  async function handleCreateParty() {
    if (!newPartyName.trim() || creatingParty) return;
    setCreatingParty(true);
    const res = await createCampaignParty(campaignId, { name: newPartyName.trim() });
    setCreatingParty(false);
    if (res.success && res.data) {
      setParties((prev) => [...prev, { id: res.data!.id, name: res.data!.name }]);
      setPartyId(res.data!.id);
      setNewPartyName("");
      toast.success("Gruppo creato.");
    } else {
      toast.error(res.message ?? "Errore nella creazione del gruppo.");
    }
  }

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
    if (isLongCampaign && partyId) formData.set("party_id", partyId);
    if (isLongCampaign && chapterTitle.trim()) formData.set("chapter_title", chapterTitle.trim());

    setIsLoading(true);
    try {
      const result = await createSession(campaignId, formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setDate(undefined);
        setDmId(defaultDmId ?? "");
        setPartyId("");
        setChapterTitle("");
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
          className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          Nuova Sessione
        </Button>
      </DialogTrigger>
      <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Nuova sessione</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
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

          {isLongCampaign && (
            <>
              <div className="space-y-2">
                <Label htmlFor="session-party">Scegli Gruppo</Label>
                <Select value={partyId || undefined} onValueChange={setPartyId} disabled={isLoading}>
                  <SelectTrigger
                    id="session-party"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                  >
                    <SelectValue placeholder={parties.length === 0 ? "Crea un gruppo sotto" : "Seleziona un gruppo (opzionale)"} />
                  </SelectTrigger>
                  <SelectContent className="border-barber-gold/30 bg-barber-dark">
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-barber-paper">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Nome nuovo gruppo"
                  className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading || creatingParty}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateParty())}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateParty}
                  disabled={!newPartyName.trim() || isLoading || creatingParty}
                  className="shrink-0 border-barber-gold/40 text-barber-paper"
                >
                  {creatingParty ? "..." : "Crea gruppo"}
                </Button>
              </div>
            </>
          )}

          {isLongCampaign && (
            <div className="space-y-2">
              <Label htmlFor="session-chapter">Capitolo (opzionale)</Label>
              <Input
                id="session-chapter"
                name="chapter_title"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="Es. Il Ritorno del Re"
                className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                disabled={isLoading}
              />
            </div>
          )}

          {gmAdminUsers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="session-dm">Dungeon Master</Label>
              <Select value={dmId || undefined} onValueChange={setDmId} disabled={isLoading}>
                <SelectTrigger
                  id="session-dm"
                  className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                >
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
            <Label htmlFor="session-time">Orario</Label>
            <Input
              id="session-time"
              name="time"
              type="time"
              defaultValue="20:00"
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
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
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
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
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="border-barber-gold/40 text-barber-paper/80"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              {isLoading ? "Creazione..." : "Crea sessione"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
