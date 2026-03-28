"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { listMapsForParentPickerAction, uploadMap, type MapParentOption } from "@/app/campaigns/map-actions";

const MAP_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Mondo", value: "world" },
  { label: "Continente", value: "continent" },
  { label: "Regione", value: "region" },
  { label: "Città/Urbano", value: "city" },
  { label: "Dungeon/Wild", value: "dungeon" },
  { label: "Quartiere", value: "district" },
  { label: "Edificio", value: "building" },
];

/** Campagna lunga: scala geografica esplicita (mondo unico → continenti → regioni → città) + dettaglio. */
const LONG_MAP_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Mappa del mondo (unica per campagna)", value: "world" },
  { label: "Continente (sotto il mondo)", value: "continent" },
  { label: "Regione (sotto un continente)", value: "region" },
  { label: "Città (sotto una regione)", value: "city" },
  { label: "Dungeon / zona di dettaglio", value: "dungeon" },
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
  const isLongCampaign = campaignType === "long";
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapType, setMapType] = useState<string>(isLongCampaign ? "continent" : "region");
  const [visibility, setVisibility] = useState<string>("public");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [parentMapId, setParentMapId] = useState<string>("");
  const [parentOptions, setParentOptions] = useState<MapParentOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  const typeOptions = isLongCampaign ? LONG_MAP_TYPE_OPTIONS : MAP_TYPE_OPTIONS;

  const hasWorldMap = useMemo(() => parentOptions.some((m) => m.map_type === "world"), [parentOptions]);

  const parentCandidates = useMemo(() => {
    if (!isLongCampaign) return [];
    if (mapType === "world") return [];
    if (mapType === "continent") return parentOptions.filter((m) => m.map_type === "world");
    if (mapType === "region") return parentOptions.filter((m) => m.map_type === "continent");
    if (mapType === "city") return parentOptions.filter((m) => m.map_type === "region");
    return parentOptions;
  }, [isLongCampaign, mapType, parentOptions]);

  useEffect(() => {
    if (!open || !isLongCampaign) return;
    let cancelled = false;
    setLoadingParents(true);
    void listMapsForParentPickerAction(campaignId).then((res) => {
      if (cancelled) return;
      if (res.success) setParentOptions(res.data);
      else toast.error(res.message);
      setLoadingParents(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, isLongCampaign, campaignId]);

  useEffect(() => {
    if (mapType === "world") setParentMapId("");
  }, [mapType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("campaign_id", campaignId);
    formData.set("map_type", mapType);
    formData.set("visibility", visibility);
    formData.set("allowed_user_ids", JSON.stringify(visibility === "selective" ? selectedPlayerIds : []));
    formData.set("allowed_party_ids", JSON.stringify(visibility === "selective" ? selectedPartyIds : []));
    if (isLongCampaign) {
      formData.set("parent_map_id", parentMapId);
    }

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

    if (isLongCampaign) {
      if (mapType === "world" && hasWorldMap) {
        toast.error("Esiste già una mappa del mondo. Modificala o eliminala prima di crearne un'altra.");
        return;
      }
      if (["continent", "region", "city"].includes(mapType) && !parentMapId) {
        toast.error("Seleziona la mappa genitore nella gerarchia (mondo → continente → regione → città).");
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await uploadMap(formData);

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        setMapType(isLongCampaign ? "continent" : "region");
        setVisibility("public");
        setSelectedPlayerIds([]);
        setSelectedPartyIds([]);
        setParentMapId("");
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
      setSelectedPartyIds([]);
      setParentMapId("");
    }
    setOpen(next);
  }

  function togglePlayer(id: string) {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleParty(id: string) {
    setSelectedPartyIds((prev) =>
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
            {isLongCampaign && (
              <span className="mt-2 block text-xs text-barber-gold/90">
                Campagna lunga: scala Mondo (una sola) → Continenti → Regioni → Città. Le mappe del mondo restano
                disponibili anche per progetti futuri (es. viste globali).
              </span>
            )}
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
                {typeOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    disabled={isLongCampaign && opt.value === "world" && hasWorldMap}
                    className="focus:bg-barber-dark focus:text-barber-paper"
                  >
                    {opt.label}
                    {isLongCampaign && opt.value === "world" && hasWorldMap ? " (già presente)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLongCampaign && mapType !== "world" && (
            <div className="space-y-2">
              <Label>Mappa genitore (scala superiore)</Label>
              {loadingParents ? (
                <p className="text-xs text-barber-paper/60">Caricamento elenco mappe…</p>
              ) : ["continent", "region", "city"].includes(mapType) ? (
                <select
                  className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 text-sm text-barber-paper"
                  value={parentMapId}
                  onChange={(e) => setParentMapId(e.target.value)}
                  disabled={isLoading}
                  required
                >
                  <option value="">Seleziona…</option>
                  {parentCandidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.map_type})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="h-10 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-3 text-sm text-barber-paper"
                  value={parentMapId}
                  onChange={(e) => setParentMapId(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Nessun collegamento (opzionale)</option>
                  {parentCandidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.map_type})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-barber-paper/55">
                {mapType === "continent" && "Il continente deve appartenere alla mappa del mondo."}
                {mapType === "region" && "La regione deve appartenere a un continente."}
                {mapType === "city" && "La città deve appartenere a una regione."}
                {["dungeon", "district", "building"].includes(mapType) &&
                  "Opzionale: collega a una mappa più grande per orientarti in galleria."}
              </p>
            </div>
          )}

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
                {eligibleParties.length > 0 && (
                  <div className="mb-3">
                    <p className="mb-1 text-xs text-barber-paper/70">Oppure seleziona uno o piu gruppi</p>
                    <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                      {eligibleParties.map((party) => (
                        <label
                          key={party.id}
                          className="flex cursor-pointer items-center gap-2 text-sm text-barber-paper"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPartyIds.includes(party.id)}
                            onChange={() => toggleParty(party.id)}
                            className="h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                          />
                          {party.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
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
