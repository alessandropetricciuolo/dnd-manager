"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
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
import { ImageSourceField } from "@/components/ui/image-source-field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createCampaign } from "@/app/dashboard/actions";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const CAMPAIGN_TYPES = [
  { value: "oneshot", label: "One Shot" },
  { value: "quest", label: "Quest" },
  { value: "long", label: "Campagna Lunga" },
] as const;

type CreateCampaignDialogProps = {
  /** In sidebar collassata: solo icona, etichetta visibile al hover del menu. */
  collapsibleSidebar?: boolean;
};

const SIDEBAR_LABEL =
  "max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-200 ease-out group-hover/sidebar:max-w-[11rem] group-hover/sidebar:opacity-100";

export function CreateCampaignDialog({ collapsibleSidebar = false }: CreateCampaignDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [campaignType, setCampaignType] = useState<string>("quest");
  const [isLongCampaign, setIsLongCampaign] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("type", campaignType);
    formData.set("is_long_campaign", isLongCampaign ? "on" : "");

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
          title="Nuova campagna"
          className={cn(
            "bg-barber-red text-barber-paper hover:bg-barber-red/90",
            collapsibleSidebar &&
              "h-10 w-10 shrink-0 gap-0 p-0 group-hover/sidebar:h-10 group-hover/sidebar:w-full group-hover/sidebar:justify-start group-hover/sidebar:gap-2 group-hover/sidebar:px-3"
          )}
        >
          <Plus className={cn("h-4 w-4 shrink-0", collapsibleSidebar && "h-5 w-5")} />
          {collapsibleSidebar ? (
            <span className={SIDEBAR_LABEL}>Nuova campagna</span>
          ) : (
            "Nuova campagna"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
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
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
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
                className="bg-barber-dark border-barber-gold/30 text-barber-paper"
              >
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-barber-dark">
                {CAMPAIGN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-barber-paper">
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
              className="min-h-[100px] bg-barber-dark border-barber-gold/30 text-barber-paper resize-none"
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-barber-gold/30 bg-barber-dark/80 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="campaign-long" className="text-barber-paper">Campagna lunga (Abilita Guida del Giocatore)</Label>
              <p className="text-xs text-slate-400">Se attivo, potrai compilare la Bibbia di Campagna visibile ai giocatori.</p>
            </div>
            <Switch
              id="campaign-long"
              checked={isLongCampaign}
              onCheckedChange={setIsLongCampaign}
              disabled={isLoading}
            />
          </div>
          {isLongCampaign && (
            <div className="space-y-2">
              <Label htmlFor="campaign-primer">Bibbia di Campagna / Guida del Giocatore</Label>
              <Textarea
                id="campaign-primer"
                name="player_primer"
                placeholder="Scrivi qui la guida per i giocatori (Markdown supportato)..."
                className="min-h-[180px] bg-barber-dark border-barber-gold/30 text-barber-paper resize-y"
                disabled={isLoading}
              />
            </div>
          )}
          <ImageSourceField
            fileInputName="image"
            urlFieldName="image_url"
            label="Immagine di copertina (opzionale)"
            disabled={isLoading}
            hint="Carica un file o incolla un link (es. Google Drive)."
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="campaign-public"
              name="is_public"
              value="on"
              defaultChecked
              className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
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
            <SubmitButton
              pending={isLoading}
              loadingText="Creazione..."
              className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
            >
              Crea campagna
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
