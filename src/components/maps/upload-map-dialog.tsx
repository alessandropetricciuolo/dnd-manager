"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

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
import { ImageSourceField } from "@/components/ui/image-source-field";
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

const VISIBILITY_OPTIONS: { label: string; value: string }[] = [
  { label: "Pubblico (tutti)", value: "public" },
  { label: "Segreto (solo GM)", value: "secret" },
  { label: "Selettivo (scegli giocatori)", value: "selective" },
];

type UploadMapDialogProps = {
  campaignId: string;
  /** Giocatori iscritti alla campagna per la visibilità selettiva. */
  eligiblePlayers?: { id: string; label: string }[];
};

export function UploadMapDialog({ campaignId, eligiblePlayers = [] }: UploadMapDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapType, setMapType] = useState<string>("region");
  const [visibility, setVisibility] = useState<string>("public");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("campaign_id", campaignId);
    formData.set("map_type", mapType);
    formData.set("visibility", visibility);
    formData.set("allowed_user_ids", JSON.stringify(visibility === "selective" ? selectedPlayerIds : []));

    const name = (formData.get("name") as string)?.trim();
    const imageFile = formData.get("image") as File | null;
    const imageUrl = (formData.get("image_url") as string)?.trim();
    const imageUrlOverride = (formData.get("image_url_override") as string)?.trim();
    if (!name) {
      toast.error("Inserisci un nome per la mappa.");
      return;
    }
    const hasImage = !!(imageFile && imageFile.size > 0) || !!imageUrl || !!imageUrlOverride;
    if (!hasImage) {
      toast.error("Carica un'immagine o incolla un URL (salvate su Telegram).");
      return;
    }

    setIsLoading(true);
    try {
      const result = await uploadMap(formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setMapType("region");
        setVisibility("public");
        setSelectedPlayerIds([]);
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

  function handleOpenChange(next: boolean) {
    if (!next) {
      setVisibility("public");
      setSelectedPlayerIds([]);
    }
    setOpen(next);
  }

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="bg-barber-red text-barber-paper hover:bg-barber-red/90"
        >
          <Upload className="mr-2 h-4 w-4" />
          Carica mappa
        </Button>
      </DialogTrigger>
      <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Carica mappa</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
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
              className="bg-barber-dark border-barber-gold/30 text-barber-paper"
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
              <SelectTrigger className="bg-barber-dark border-barber-gold/30 text-barber-paper">
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                {MAP_TYPE_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="focus:bg-barber-dark focus:text-barber-paper"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Visibilità</Label>
            <Select
              value={visibility}
              onValueChange={setVisibility}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-barber-dark border-barber-gold/30 text-barber-paper">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-barber-dark text-barber-paper">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="focus:bg-barber-dark focus:text-barber-paper"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {visibility === "selective" && (
              <div className="mt-2 rounded-md border border-barber-gold/30 bg-barber-dark/60 p-3">
                <p className="mb-2 text-xs font-medium text-barber-paper/80">
                  Scegli i giocatori che possono vedere questa mappa
                </p>
                {eligiblePlayers.length === 0 ? (
                  <p className="text-xs text-barber-paper/50">
                    Nessun giocatore iscritto alla campagna. Iscriviti a una sessione per comparire qui.
                  </p>
                ) : (
                  <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                    {eligiblePlayers.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlayerIds.includes(p.id)}
                          onChange={() => togglePlayer(p.id)}
                          className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="map-description">Descrizione (opzionale)</Label>
            <Textarea
              id="map-description"
              name="description"
              placeholder="Breve descrizione della mappa..."
              className="min-h-[80px] resize-none bg-barber-dark border-barber-gold/30 text-barber-paper"
              disabled={isLoading}
            />
          </div>

          <ImageSourceField
            fileInputName="image"
            urlFieldName="image_url"
            label="Immagine mappa"
            disabled={isLoading}
            hint="Carica o incolla URL; salvata su Telegram."
          />

          <div className="space-y-2">
            <Label htmlFor="map-url-override">Oppure link esterno (es. Google Drive)</Label>
            <Input
              id="map-url-override"
              name="image_url_override"
              type="url"
              placeholder="https://..."
              disabled={isLoading}
              className="bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
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
