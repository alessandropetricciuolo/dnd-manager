"use client";

import { useState, useRef, type FormEvent } from "react";
import Image from "next/image";
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

const PLACEHOLDER_COVER = "https://placehold.co/1200x400/1e293b/10b981/png?text=Campagna";

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentImageUrl = previewUrl ?? campaign.image_url ?? PLACEHOLDER_COVER;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    } else {
      setPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("campaign_id", campaign.id);
    formData.set("type", campaignType);

    const file = fileInputRef.current?.files?.[0];
    if (file && file.size > 0) {
      formData.set("image", file);
    }

    setIsLoading(true);
    try {
      const result = await updateCampaign(formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setPreviewUrl(null);
        form.reset();
        setCampaignType(campaign.type ?? "quest");
        if (fileInputRef.current) fileInputRef.current.value = "";
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
    if (!next && previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
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
          <div className="space-y-2">
            <Label>Immagine di copertina</Label>
            <div className="relative aspect-[3/1] w-full overflow-hidden rounded-lg bg-slate-950">
              <Image
                src={currentImageUrl}
                alt="Copertina"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 600px"
                unoptimized={currentImageUrl.startsWith("blob:")}
              />
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="bg-slate-900/70 border-slate-700 text-slate-50 file:mr-2 file:rounded file:border-0 file:bg-emerald-600 file:px-3 file:py-1 file:text-slate-950 file:text-sm"
              disabled={isLoading}
              onChange={handleFileChange}
            />
            <p className="text-xs text-slate-500">
              Lascia vuoto per mantenere l&apos;immagine attuale. JPG, PNG, WebP, GIF.
            </p>
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
              {isLoading ? "Salvataggio..." : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
