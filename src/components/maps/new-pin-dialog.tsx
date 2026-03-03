"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CampaignMapOption } from "./interactive-map";

type NewPinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignMaps: CampaignMapOption[];
  coords: { x: number; y: number } | null;
  onSubmit: (formData: FormData) => Promise<void>;
};

export function NewPinDialog({
  open,
  onOpenChange,
  campaignMaps,
  coords,
  onSubmit,
}: NewPinDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coords || isLoading) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("x", String(coords.x));
    formData.set("y", String(coords.y));
    setIsLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      form.reset();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>Nuovo pin</DialogTitle>
          <DialogDescription className="text-slate-400">
            Aggiungi un&apos;etichetta e opzionalmente collega a un&apos;altra mappa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pin-label">Etichetta</Label>
            <Input
              id="pin-label"
              name="label"
              placeholder="Es. Castello"
              className="bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-linked-map">Collega a mappa</Label>
            <select
              id="pin-linked-map"
              name="linked_map_id"
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            >
              <option value="">Nessuna mappa</option>
              {campaignMaps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
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
              {isLoading ? "Salvataggio..." : "Salva pin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
