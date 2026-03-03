"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCampaign } from "@/app/dashboard/actions";
import { Plus } from "lucide-react";

const CAMPAIGN_TYPES = [
  { value: "oneshot", label: "One Shot" },
  { value: "quest", label: "Quest" },
  { value: "long", label: "Campagna Lunga" },
] as const;

export function CreateCampaignDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [campaignType, setCampaignType] = useState<string>("quest");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("type", campaignType);

    setIsLoading(true);
    try {
      const result = await createCampaign(formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        form.reset();
        setCampaignType("quest");
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
          <Plus className="h-4 w-4" />
          Nuova campagna
        </Button>
      </DialogTrigger>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>Nuova campagna</DialogTitle>
          <DialogDescription className="text-slate-400">
            Crea una nuova campagna come Game Master. Potrai aggiungere sessioni,
            mappe e wiki in seguito.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-title">Titolo</Label>
            <Input
              id="campaign-title"
              name="title"
              placeholder="Es. La taverna del drago"
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-type">Tipo campagna</Label>
            <Select
              value={campaignType}
              onValueChange={setCampaignType}
              disabled={isLoading}
            >
              <SelectTrigger
                id="campaign-type"
                className="bg-slate-900/70 border-slate-700 text-slate-50"
              >
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900">
                {CAMPAIGN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-slate-50">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-description">Descrizione</Label>
            <Textarea
              id="campaign-description"
              name="description"
              placeholder="Breve descrizione della campagna..."
              className="min-h-[100px] bg-slate-900/70 border-slate-700 text-slate-50 resize-none"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="campaign-public"
              name="is_public"
              value="on"
              defaultChecked
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
            />
            <Label htmlFor="campaign-public" className="text-slate-300 font-normal cursor-pointer">
              Campagna pubblica (visibile a tutti i giocatori e sessioni in &quot;Sessioni disponibili&quot;)
            </Label>
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
              {isLoading ? "Creazione..." : "Crea campagna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
