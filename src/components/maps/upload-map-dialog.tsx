"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UploadMapInlineForm } from "@/components/maps/upload-map-inline-form";

type UploadMapDialogProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  /** Giocatori iscritti alla campagna per la visibilità selettiva. */
  eligiblePlayers?: { id: string; label: string }[];
  /** Gruppi campagna disponibili per visibilità selettiva. */
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
};

export function UploadMapDialog({
  campaignId,
  campaignType = null,
  eligiblePlayers = [],
  eligibleParties = [],
}: UploadMapDialogProps) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(next: boolean) {
    if (next) {
      setFormKey((k) => k + 1);
    }
    setOpen(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="bg-barber-red text-barber-paper hover:bg-barber-red/90">
          <Upload className="mr-2 h-4 w-4" />
          Carica mappa
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] w-[min(95vw,700px)] flex-col overflow-hidden border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Carica mappa</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Aggiungi un&apos;immagine per la mappa della campagna (JPG, PNG, WebP, GIF).
          </DialogDescription>
        </DialogHeader>
        <UploadMapInlineForm
          key={formKey}
          campaignId={campaignId}
          campaignType={campaignType}
          eligiblePlayers={eligiblePlayers}
          eligibleParties={eligibleParties}
          appearance="gallery"
          onCancel={() => setOpen(false)}
          onUploaded={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
