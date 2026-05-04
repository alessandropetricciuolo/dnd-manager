"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export const MAP_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Mondo", value: "world" },
  { label: "Continente", value: "continent" },
  { label: "Città/Urbano", value: "city" },
  { label: "Dungeon/Wild", value: "dungeon" },
  { label: "Quartiere", value: "district" },
  { label: "Edificio", value: "building" },
];

/** Campagna lunga: Mondo (unico) → Continenti → Città + dettaglio (dungeon, ecc.). */
export const LONG_MAP_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Mappa del mondo (unica per campagna)", value: "world" },
  { label: "Continente (sotto il mondo)", value: "continent" },
  { label: "Città (sotto un continente)", value: "city" },
  { label: "Dungeon / zona di dettaglio", value: "dungeon" },
  { label: "Quartiere", value: "district" },
  { label: "Edificio", value: "building" },
];

const VISIBILITY_OPTIONS: { label: string; value: string }[] = [
  { label: "Pubblico (tutti)", value: "public" },
  { label: "Segreto (solo GM)", value: "secret" },
  { label: "Selettivo (scegli giocatori)", value: "selective" },
];

export type PinSubmapParentContext = {
  mapId: string;
  mapType: string;
};

function defaultChildMapType(parentMapType: string): string {
  switch (parentMapType) {
    case "world":
      return "continent";
    case "continent":
      return "city";
    default:
      return "dungeon";
  }
}

function longTypeOptionsForPinParent(parentMapType: string): { label: string; value: string }[] {
  switch (parentMapType) {
    case "world":
      return LONG_MAP_TYPE_OPTIONS.filter((o) => o.value === "continent");
    case "continent":
      return LONG_MAP_TYPE_OPTIONS.filter((o) =>
        ["city", "dungeon", "district", "building"].includes(o.value)
      );
    case "city":
      return LONG_MAP_TYPE_OPTIONS.filter((o) =>
        ["dungeon", "district", "building"].includes(o.value)
      );
    default:
      return LONG_MAP_TYPE_OPTIONS.filter((o) =>
        ["dungeon", "district", "building"].includes(o.value)
      );
  }
}

export type UploadMapInlineFormProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
  /**
   * Da dialog pin: la nuova mappa è sempre figlia della mappa su cui stai piazzando il pin.
   * Campagna long: tipi ammessi dipendono dal tipo della mappa genitore.
   */
  pinParentContext?: PinSubmapParentContext | null;
  /** gallery = stile campagna; pinDialog = coerente con NewPinDialog */
  appearance?: "gallery" | "pinDialog";
  onUploaded?: (map: { id: string; name: string }) => void;
  onCancel?: () => void;
};

export function UploadMapInlineForm({
  campaignId,
  campaignType = null,
  eligiblePlayers = [],
  eligibleParties = [],
  pinParentContext = null,
  appearance = "gallery",
  onUploaded,
  onCancel,
}: UploadMapInlineFormProps) {
  const isLongCampaign = campaignType === "long";
  const isPinFlow = !!pinParentContext?.mapId;
  const parentType = pinParentContext?.mapType ?? "city";

  const [isLoading, setIsLoading] = useState(false);
  const [mapType, setMapType] = useState<string>(
    isPinFlow
      ? defaultChildMapType(parentType)
      : isLongCampaign
        ? "continent"
        : "city"
  );
  const [visibility, setVisibility] = useState<string>("public");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>([]);
  const [parentMapId, setParentMapId] = useState<string>(
    isPinFlow ? (pinParentContext?.mapId ?? "") : ""
  );
  const [parentOptions, setParentOptions] = useState<MapParentOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  const pinLongTypeOptions = useMemo(
    () => longTypeOptionsForPinParent(parentType),
    [parentType]
  );

  const typeOptions = useMemo(() => {
    if (isLongCampaign && isPinFlow) return pinLongTypeOptions;
    return isLongCampaign ? LONG_MAP_TYPE_OPTIONS : MAP_TYPE_OPTIONS;
  }, [isLongCampaign, isPinFlow, pinLongTypeOptions]);

  const hasWorldMap = useMemo(() => parentOptions.some((m) => m.map_type === "world"), [parentOptions]);

  const parentCandidates = useMemo(() => {
    if (!isLongCampaign) return [];
    if (mapType === "world") return [];
    if (mapType === "continent") return parentOptions.filter((m) => m.map_type === "world");
    if (mapType === "city") return parentOptions.filter((m) => m.map_type === "continent");
    return parentOptions;
  }, [isLongCampaign, mapType, parentOptions]);

  useEffect(() => {
    if (!isLongCampaign || isPinFlow) return;
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
  }, [isLongCampaign, isPinFlow, campaignId]);

  useEffect(() => {
    if (isPinFlow) return;
    if (mapType === "world") setParentMapId("");
  }, [mapType, isPinFlow]);

  useEffect(() => {
    if (!isPinFlow || !isLongCampaign) return;
    const allowed = pinLongTypeOptions.map((o) => o.value);
    if (!allowed.includes(mapType)) {
      setMapType(allowed[0] ?? "dungeon");
    }
  }, [isPinFlow, isLongCampaign, pinLongTypeOptions, mapType]);

  useEffect(() => {
    if (isPinFlow && pinParentContext?.mapId) {
      setParentMapId(pinParentContext.mapId);
    }
  }, [isPinFlow, pinParentContext?.mapId]);

  const fieldClass =
    appearance === "pinDialog"
      ? "bg-slate-900/70 border-slate-700 text-slate-50 placeholder:text-slate-500"
      : "bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50";
  const selectTriggerClass =
    appearance === "pinDialog"
      ? "bg-slate-900/70 border-slate-700 text-slate-50"
      : "bg-barber-dark border-barber-gold/30 text-barber-paper";
  const selectContentClass =
    appearance === "pinDialog"
      ? "border-slate-700 bg-slate-950 text-slate-50"
      : "border-barber-gold/30 bg-barber-dark text-barber-paper";
  const selectItemClass =
    appearance === "pinDialog"
      ? "focus:bg-slate-900 focus:text-slate-50"
      : "focus:bg-barber-dark focus:text-barber-paper";
  const outlineBtnClass =
    appearance === "pinDialog"
      ? "border-slate-600 text-slate-300"
      : "border-barber-gold/40 text-barber-paper/80";
  const primaryBtnClass =
    appearance === "pinDialog"
      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
      : "bg-barber-red text-barber-paper hover:bg-barber-red/90";
  const mutedTextClass = appearance === "pinDialog" ? "text-slate-400" : "text-barber-paper/70";
  const goldMuted = appearance === "pinDialog" ? "text-emerald-500/90" : "text-barber-gold/90";
  const borderSoft = appearance === "pinDialog" ? "border-slate-700" : "border-barber-gold/30";
  const borderSofter = appearance === "pinDialog" ? "border-slate-700" : "border-barber-gold/20";

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
    } else if (isPinFlow && pinParentContext?.mapId) {
      formData.set("parent_map_id", pinParentContext.mapId);
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
      if (["continent", "city"].includes(mapType) && !parentMapId) {
        toast.error("Seleziona la mappa genitore nella gerarchia (mondo → continente → città).");
        return;
      }
    }

    setIsLoading(true);
    try {
      const result = await uploadMap(formData);

      if (result.success && result.mapId) {
        toast.success(result.message);
        onUploaded?.({ id: result.mapId, name });
        form.reset();
        setVisibility("public");
        setSelectedPlayerIds([]);
        setSelectedPartyIds([]);
        if (!isPinFlow) {
          setMapType(isLongCampaign ? "continent" : "city");
          setParentMapId("");
        } else {
          setMapType(defaultChildMapType(parentType));
          setParentMapId(pinParentContext?.mapId ?? "");
        }
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Si è verificato un errore. Riprova.");
    } finally {
      setIsLoading(false);
    }
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
    <form onSubmit={handleSubmit} className="mt-2 flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {isPinFlow && (
          <p className={`text-xs ${mutedTextClass}`}>
            La nuova mappa sarà collegata come sottomappa di questa mappa nella gerarchia campagna.
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="inline-map-name">Nome mappa</Label>
          <Input
            id="inline-map-name"
            name="name"
            placeholder="Es. Taverna del Drago"
            className={fieldClass}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria geografica</Label>
          <Select value={mapType} onValueChange={setMapType} disabled={isLoading}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="Seleziona categoria" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {typeOptions.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={isLongCampaign && opt.value === "world" && hasWorldMap}
                  className={selectItemClass}
                >
                  {opt.label}
                  {isLongCampaign && opt.value === "world" && hasWorldMap ? " (già presente)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLongCampaign && mapType !== "world" && !isPinFlow && (
          <div className="space-y-2">
            <Label>Mappa genitore (scala superiore)</Label>
            {loadingParents ? (
              <p className={`text-xs ${appearance === "pinDialog" ? "text-slate-500" : "text-barber-paper/60"}`}>
                Caricamento elenco mappe…
              </p>
            ) : ["continent", "city"].includes(mapType) ? (
              <select
                className={`h-10 w-full rounded-md border px-3 text-sm ${fieldClass}`}
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
                className={`h-10 w-full rounded-md border px-3 text-sm ${fieldClass}`}
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
            <p className={`text-xs ${appearance === "pinDialog" ? "text-slate-500" : "text-barber-paper/55"}`}>
              {mapType === "continent" && "Il continente deve appartenere alla mappa del mondo."}
              {mapType === "city" && "La città deve appartenere a un continente."}
              {["dungeon", "district", "building"].includes(mapType) &&
                "Opzionale: collega a una mappa più grande per orientarti in galleria."}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label>Visibilità</Label>
          <Select value={visibility} onValueChange={setVisibility} disabled={isLoading}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className={selectItemClass}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {visibility === "selective" && (
            <div className={`mt-2 rounded-md border p-3 ${borderSoft} ${appearance === "pinDialog" ? "bg-slate-900/50" : "bg-barber-dark/60"}`}>
              <p className={`mb-2 text-xs font-medium ${appearance === "pinDialog" ? "text-slate-300" : "text-barber-paper/80"}`}>
                Scegli i giocatori che possono vedere questa mappa
              </p>
              {eligibleParties.length > 0 && (
                <div className="mb-3">
                  <p className={`mb-1 text-xs ${mutedTextClass}`}>Oppure seleziona uno o più gruppi</p>
                  <div className="flex max-h-24 flex-col gap-1 overflow-y-auto">
                    {eligibleParties.map((party) => (
                      <label
                        key={party.id}
                        className={`flex cursor-pointer items-center gap-2 text-sm ${appearance === "pinDialog" ? "text-slate-200" : "text-barber-paper"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPartyIds.includes(party.id)}
                          onChange={() => toggleParty(party.id)}
                          className={
                            appearance === "pinDialog"
                              ? "h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                              : "h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                          }
                        />
                        {party.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {eligiblePlayers.length === 0 ? (
                <p className={`text-xs ${appearance === "pinDialog" ? "text-slate-500" : "text-barber-paper/50"}`}>
                  Nessun giocatore iscritto alla campagna. Iscriviti a una sessione per comparire qui.
                </p>
              ) : (
                <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                  {eligiblePlayers.map((p) => (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-2 text-sm ${appearance === "pinDialog" ? "text-slate-200" : "text-barber-paper"}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlayerIds.includes(p.id)}
                        onChange={() => togglePlayer(p.id)}
                        className={
                          appearance === "pinDialog"
                            ? "h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                            : "h-4 w-4 rounded border-barber-gold/40 bg-barber-dark text-barber-gold"
                        }
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
          <Label htmlFor="inline-map-description">Descrizione (opzionale)</Label>
          <Textarea
            id="inline-map-description"
            name="description"
            placeholder="Breve descrizione della mappa..."
            className={`min-h-[80px] resize-none ${fieldClass}`}
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
          <Label htmlFor="inline-map-url-override">Oppure link esterno (es. Google Drive)</Label>
          <Input
            id="inline-map-url-override"
            name="image_url_override"
            type="url"
            placeholder="https://..."
            disabled={isLoading}
            className={fieldClass}
          />
        </div>

        {isLongCampaign && !isPinFlow && (
          <p className={`text-xs ${goldMuted}`}>
            Campagna lunga: scala Mondo (una sola) → Continenti → Città. Le mappe del mondo restano disponibili anche
            per progetti futuri (es. viste globali).
          </p>
        )}
      </div>

      <div className={`mt-4 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t pt-3 ${borderSofter}`}>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className={outlineBtnClass}>
            Chiudi pannello
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className={primaryBtnClass}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Caricamento...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Carica mappa
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
