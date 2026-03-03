"use client";

import { useState, useRef, type FormEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, ImageIcon, Loader2 } from "lucide-react";

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
import { uploadMap } from "@/app/campaigns/map-actions";

const MAP_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Mondo", value: "world" },
  { label: "Continente", value: "continent" },
  { label: "Regione", value: "region" },
  { label: "Città/Urbano", value: "city" },
  { label: "Dungeon/Wild", value: "dungeon" },
  { label: "Quartiere", value: "district" },
  { label: "Edificio", value: "building" },
];

type UploadMapDialogProps = {
  campaignId: string;
};

export function UploadMapDialog({ campaignId }: UploadMapDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mapType, setMapType] = useState<string>("region");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("campaign_id", campaignId);
    formData.set("map_type", mapType);

    const name = (formData.get("name") as string)?.trim();
    const file = formData.get("file") as File;
    if (!name) {
      toast.error("Inserisci un nome per la mappa.");
      return;
    }
    if (!file?.size) {
      toast.error("Seleziona un'immagine.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await uploadMap(formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setPreview(null);
        setMapType("region");
        form.reset();
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
    if (!next) {
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
        >
          <Upload className="mr-2 h-4 w-4" />
          Carica mappa
        </Button>
      </DialogTrigger>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>Carica mappa</DialogTitle>
          <DialogDescription className="text-slate-400">
            Aggiungi un&apos;immagine per la mappa della campagna (JPG, PNG, WebP, GIF).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="map-name">Nome mappa</Label>
            <Input
              id="map-name"
              name="name"
              placeholder="Es. Taverna del Drago"
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria geografica</Label>
            <Select
              value={mapType}
              onValueChange={setMapType}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-slate-900/70 border-slate-700 text-slate-50">
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-slate-50">
                {MAP_TYPE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="focus:bg-slate-800 focus:text-slate-50"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="map-description">Descrizione (opzionale)</Label>
            <Textarea
              id="map-description"
              name="description"
              placeholder="Breve descrizione della mappa..."
              className="min-h-[80px] resize-none bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="map-file">
              <ImageIcon className="mr-1.5 inline h-4 w-4" />
              Immagine
            </Label>
            <Input
              id="map-file"
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="bg-slate-900/70 border-slate-700 text-slate-50 file:mr-2 file:rounded file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:text-slate-950"
              disabled={isLoading}
              ref={fileInputRef}
              onChange={handleFileChange}
              required
            />
            {preview && (
              <div className="relative mt-2 aspect-video w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                <Image
                  src={preview}
                  alt="Anteprima"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            )}
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
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Caricamento...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Carica
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
