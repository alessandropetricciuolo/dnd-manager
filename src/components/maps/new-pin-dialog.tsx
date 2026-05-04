"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import { UploadMapInlineForm } from "@/components/maps/upload-map-inline-form";
import { ChevronDown, ChevronRight } from "lucide-react";

type NewPinDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignMaps: CampaignMapOption[];
  coords: { x: number; y: number } | null;
  onSubmit: (formData: FormData) => Promise<void>;
  /** Solo GM: caricamento sottomappa dalla vista mappa (genitore = mappa corrente). */
  pinSubmapUpload?: {
    currentMapId: string;
    currentMapType: string;
    campaignType: "oneshot" | "quest" | "long" | null;
    eligiblePlayers: { id: string; label: string }[];
    eligibleParties: { id: string; label: string; memberIds: string[] }[];
  } | null;
  onSubmapCreated?: () => void;
};

const PIN_FORM_ID = "new-pin-form";

export function NewPinDialog({
  open,
  onOpenChange,
  campaignMaps,
  coords,
  onSubmit,
  campaignId,
  pinSubmapUpload,
  onSubmapCreated,
}: NewPinDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [linkedMapId, setLinkedMapId] = useState("");
  const [extraMapOption, setExtraMapOption] = useState<{ id: string; name: string } | null>(null);
  const [showSubmapPanel, setShowSubmapPanel] = useState(false);
  const [uploadFormKey, setUploadFormKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    setLinkedMapId("");
    setExtraMapOption(null);
    setShowSubmapPanel(false);
    setUploadFormKey((k) => k + 1);
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!coords || isLoading) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("x", String(coords.x));
    formData.set("y", String(coords.y));
    formData.set("linked_map_id", linkedMapId);
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
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto border-emerald-700/50 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>Nuovo pin</DialogTitle>
          <DialogDescription className="text-slate-400">
            Aggiungi un&apos;etichetta e opzionalmente collega a un&apos;altra mappa.
          </DialogDescription>
        </DialogHeader>
        <form id={PIN_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
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
              value={linkedMapId}
              onChange={(e) => setLinkedMapId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              disabled={isLoading}
            >
              <option value="">Nessuna mappa</option>
              {extraMapOption && (
                <option value={extraMapOption.id}>
                  {extraMapOption.name} (appena caricata)
                </option>
              )}
              {campaignMaps.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </form>

        {pinSubmapUpload && (
          <div className="space-y-2 border-t border-slate-700/80 pt-4">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-900/40 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-900/70"
              onClick={() => setShowSubmapPanel((v) => !v)}
              disabled={isLoading}
            >
              {showSubmapPanel ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              )}
              <span>
                <span className="font-medium text-emerald-400/95">Carica nuova sottomappa</span>
                <span className="block text-xs text-slate-500">Crea una mappa figlia di questa e collega il pin in un solo flusso.</span>
              </span>
            </button>
            {showSubmapPanel && (
              <div className="rounded-md border border-emerald-800/40 bg-slate-900/30 p-3">
                <UploadMapInlineForm
                  key={uploadFormKey}
                  campaignId={campaignId}
                  campaignType={pinSubmapUpload.campaignType}
                  eligiblePlayers={pinSubmapUpload.eligiblePlayers}
                  eligibleParties={pinSubmapUpload.eligibleParties}
                  pinParentContext={{
                    mapId: pinSubmapUpload.currentMapId,
                    mapType: pinSubmapUpload.currentMapType,
                  }}
                  appearance="pinDialog"
                  onCancel={() => setShowSubmapPanel(false)}
                  onUploaded={({ id, name }) => {
                    setExtraMapOption({ id, name });
                    setLinkedMapId(id);
                    setShowSubmapPanel(false);
                    onSubmapCreated?.();
                  }}
                />
              </div>
            )}
          </div>
        )}

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
            form={PIN_FORM_ID}
            disabled={isLoading}
            className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
          >
            {isLoading ? "Salvataggio..." : "Salva pin"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
