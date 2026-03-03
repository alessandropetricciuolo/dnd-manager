"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateMap } from "@/app/campaigns/map-actions";

const MAP_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Mondo", value: "world" },
  { label: "Continente", value: "continent" },
  { label: "Regione", value: "region" },
  { label: "Città/Urbano", value: "city" },
  { label: "Dungeon/Wild", value: "dungeon" },
  { label: "Quartiere", value: "district" },
  { label: "Edificio", value: "building" },
];

type EditMapDialogProps = {
  campaignId: string;
  mapId: string;
  initialName: string;
  initialMapType: string;
  onSuccess?: () => void;
};

export function EditMapDialog({
  campaignId,
  mapId,
  initialName,
  initialMapType,
  onSuccess,
}: EditMapDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(initialName);
  const [mapType, setMapType] = useState(
    MAP_TYPE_OPTIONS.some((o) => o.value === initialMapType) ? initialMapType : "region"
  );

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName(initialName);
      setMapType(MAP_TYPE_OPTIONS.some((o) => o.value === initialMapType) ? initialMapType : "region");
    }
    setOpen(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    const trimmedName = name?.trim();
    if (!trimmedName) {
      toast.error("Il nome è obbligatorio.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await updateMap(mapId, campaignId, { name: trimmedName, map_type: mapType });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        onSuccess?.();
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-2 right-10 z-10 h-8 w-8 rounded-md bg-slate-600/80 text-slate-200 opacity-0 group-hover:opacity-100 hover:bg-slate-500/80 hover:text-slate-50"
          title="Modifica info"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>Modifica mappa</DialogTitle>
          <DialogDescription className="text-slate-400">
            Cambia titolo e categoria geografica della mappa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-map-name">Nome mappa</Label>
            <Input
              id="edit-map-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Taverna del Drago"
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria geografica</Label>
            <Select value={mapType} onValueChange={setMapType} disabled={isLoading}>
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
                  Salvataggio...
                </>
              ) : (
                "Salva"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
