"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

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
import { CompressedImageUpload } from "@/components/ui/compressed-image-upload";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCampaign } from "@/app/campaigns/actions";

const CAMPAIGN_TYPES = [
  { value: "oneshot", label: "One Shot" },
  { value: "quest", label: "Quest" },
  { value: "long", label: "Campagna Lunga" },
] as const;

export type CampaignForEdit = {
  id: string;
  name: string;
  description: string | null;
  type: "oneshot" | "quest" | "long" | null;
  image_url: string | null;
};

type EditCampaignDialogProps = {
  campaign: CampaignForEdit;
};

export function EditCampaignDialog({ campaign }: EditCampaignDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [campaignType, setCampaignType] = useState<string>(campaign.type ?? "quest");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("campaign_id", campaign.id);
    formData.set("type", campaignType);

    setIsLoading(true);
    try {
      const result = await updateCampaign(formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        form.reset();
        setCampaignType(campaign.type ?? "quest");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Si è verificato un errore. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-50"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Modifica Campagna
        </Button>
      </DialogTrigger>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-50 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifica campagna</DialogTitle>
          <DialogDescription className="text-slate-400">
            Aggiorna titolo, descrizione, tipo e immagine di copertina.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-campaign-title">Titolo</Label>
            <Input
              id="edit-campaign-title"
              name="title"
              defaultValue={campaign.name}
              placeholder="Es. La taverna del drago"
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-campaign-type">Tipo campagna</Label>
            <Select
              value={campaignType}
              onValueChange={setCampaignType}
              disabled={isLoading}
            >
              <SelectTrigger
                id="edit-campaign-type"
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
            <Label htmlFor="edit-campaign-description">Descrizione</Label>
            <Textarea
              id="edit-campaign-description"
              name="description"
              defaultValue={campaign.description ?? ""}
              placeholder="Breve descrizione della campagna..."
              className="min-h-[100px] bg-slate-900/70 border-slate-700 text-slate-50 resize-none"
              disabled={isLoading}
            />
          </div>
          <CompressedImageUpload
            name="image"
            label="Immagine di copertina"
            previewUrl={campaign.image_url}
            disabled={isLoading}
            hint="Lascia vuoto per mantenere l'immagine attuale. L'immagine verrà compressa (max 2 MB, WebP)."
            className="[&_button]:bg-slate-900/70 [&_button]:border-slate-700 [&_button]:text-slate-50 [&_.aspect-video]:aspect-[3/1]"
          />
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
              {isLoading ? "Salvataggio..." : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
