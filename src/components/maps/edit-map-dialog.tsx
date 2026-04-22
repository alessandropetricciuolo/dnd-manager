"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listMapsForParentPickerAction, updateMap, type MapParentOption } from "@/app/campaigns/map-actions";

const MAP_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Mondo", value: "world" },
  { label: "Continente", value: "continent" },
  { label: "Città/Urbano", value: "city" },
  { label: "Dungeon/Wild", value: "dungeon" },
  { label: "Quartiere", value: "district" },
  { label: "Edificio", value: "building" },
];

const LONG_MAP_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: "Mappa del mondo (unica per campagna)", value: "world" },
  { label: "Continente (sotto il mondo)", value: "continent" },
  { label: "Città (sotto un continente)", value: "city" },
  { label: "Dungeon / zona di dettaglio", value: "dungeon" },
  { label: "Quartiere", value: "district" },
  { label: "Edificio", value: "building" },
];

function coerceMapTypeFromDb(t: string): string {
  return t === "region" ? "city" : t;
}

const VISIBILITY_OPTIONS: { label: string; value: string }[] = [
  { label: "Pubblico (tutti)", value: "public" },
  { label: "Segreto (solo GM)", value: "secret" },
  { label: "Selettivo (scegli giocatori)", value: "selective" },
];

type EditMapDialogProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  mapId: string;
  initialName: string;
  initialDescription?: string | null;
  initialMapType: string;
  initialParentMapId?: string | null;
  initialVisibility?: string;
  initialAllowedUserIds?: string[];
  initialAllowedPartyIds?: string[];
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

export function EditMapDialog({
  campaignId,
  campaignType = null,
  mapId,
  initialName,
  initialDescription = null,
  initialMapType,
  initialParentMapId = null,
  initialVisibility = "public",
  initialAllowedUserIds = [],
  initialAllowedPartyIds = [],
  eligiblePlayers = [],
  eligibleParties = [],
  onSuccess,
  open,
  onOpenChange,
  hideTrigger = false,
}: EditMapDialogProps) {
  const isLongCampaign = campaignType === "long";
  const [localOpen, setLocalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [mapType, setMapType] = useState(() => {
    const n = coerceMapTypeFromDb(initialMapType);
    const opts = isLongCampaign ? LONG_MAP_TYPE_OPTIONS : MAP_TYPE_OPTIONS;
    return opts.some((o) => o.value === n) ? n : "city";
  });
  const [parentMapId, setParentMapId] = useState<string>(initialParentMapId ?? "");
  const [parentOptions, setParentOptions] = useState<MapParentOption[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [visibility, setVisibility] = useState(
    VISIBILITY_OPTIONS.some((o) => o.value === initialVisibility) ? initialVisibility : "public"
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialAllowedUserIds);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>(initialAllowedPartyIds);

  const typeOptions = isLongCampaign ? LONG_MAP_TYPE_OPTIONS : MAP_TYPE_OPTIONS;

  const hasWorldMapOther = useMemo(
    () => parentOptions.some((m) => m.map_type === "world" && m.id !== mapId),
    [parentOptions, mapId]
  );

  const parentCandidates = useMemo(() => {
    if (!isLongCampaign) return [];
    return parentOptions.filter((m) => m.id !== mapId);
  }, [isLongCampaign, parentOptions, mapId]);

  const filteredParents = useMemo(() => {
    if (mapType === "world") return [];
    if (mapType === "continent") return parentCandidates.filter((m) => m.map_type === "world");
    if (mapType === "city") return parentCandidates.filter((m) => m.map_type === "continent");
    return parentCandidates;
  }, [mapType, parentCandidates]);

  const isControlled = typeof open === "boolean";
  const dialogOpen = isControlled ? open : localOpen;

  useEffect(() => {
    if (!dialogOpen || !isLongCampaign) return;
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
  }, [dialogOpen, isLongCampaign, campaignId]);

  useEffect(() => {
    if (mapType === "world") setParentMapId("");
  }, [mapType]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName(initialName);
      setDescription(initialDescription ?? "");
      setMapType(() => {
        const n = coerceMapTypeFromDb(initialMapType);
        const opts = isLongCampaign ? LONG_MAP_TYPE_OPTIONS : MAP_TYPE_OPTIONS;
        return opts.some((o) => o.value === n) ? n : "city";
      });
      setParentMapId(initialParentMapId ?? "");
      setVisibility(VISIBILITY_OPTIONS.some((o) => o.value === initialVisibility) ? initialVisibility : "public");
      setSelectedPlayerIds(initialAllowedUserIds);
      setSelectedPartyIds(initialAllowedPartyIds);
    }
    if (!isControlled) setLocalOpen(next);
    onOpenChange?.(next);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    const trimmedName = name?.trim();
    if (!trimmedName) {
      toast.error("Il nome è obbligatorio.");
      return;
    }
    if (isLongCampaign) {
      if (mapType === "world" && hasWorldMapOther) {
        toast.error("Esiste già un'altra mappa del mondo in questa campagna.");
        return;
      }
      if (["continent", "city"].includes(mapType) && !parentMapId) {
        toast.error("Seleziona la mappa genitore nella gerarchia (mondo → continente → città).");
        return;
      }
    }
    setIsLoading(true);
    try {
      const result = await updateMap(mapId, campaignId, {
        name: trimmedName,
        description,
        map_type: mapType,
        visibility: visibility as "public" | "secret" | "selective",
        ...(isLongCampaign
          ? {
              parent_map_id: mapType === "world" ? null : parentMapId || null,
            }
          : {}),
        allowed_user_ids: visibility === "selective" ? selectedPlayerIds : [],
        allowed_party_ids: visibility === "selective" ? selectedPartyIds : [],
      });
      if (result.success) {
        toast.success(result.message);
        handleOpenChange(false);
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
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
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
      )}
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
            <Label htmlFor="edit-map-description">Descrizione</Label>
            <Textarea
              id="edit-map-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi cosa rappresenta questa mappa, i luoghi chiave e il contesto narrativo."
              className="min-h-[110px] bg-slate-900/70 border-slate-700 text-slate-50"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>Categoria geografica</Label>
            <Select value={mapType} onValueChange={setMapType} disabled={isLoading}>
              <SelectTrigger className="bg-slate-900/70 border-slate-700 text-slate-50">
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-slate-50">
                {typeOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    disabled={isLongCampaign && opt.value === "world" && hasWorldMapOther && mapType !== "world"}
                    className="focus:bg-slate-800 focus:text-slate-50"
                  >
                    {opt.label}
                    {isLongCampaign && opt.value === "world" && hasWorldMapOther && mapType !== "world"
                      ? " (già presente)"
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isLongCampaign && mapType !== "world" && (
            <div className="space-y-2">
              <Label>Mappa genitore</Label>
              {loadingParents ? (
                <p className="text-xs text-slate-500">Caricamento…</p>
              ) : ["continent", "city"].includes(mapType) ? (
                <select
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-50"
                  value={parentMapId}
                  onChange={(e) => setParentMapId(e.target.value)}
                  disabled={isLoading}
                  required
                >
                  <option value="">Seleziona…</option>
                  {filteredParents.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.map_type})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-50"
                  value={parentMapId}
                  onChange={(e) => setParentMapId(e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">Nessuno (opzionale)</option>
                  {filteredParents.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.map_type})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label>Visibilità</Label>
            <Select value={visibility} onValueChange={setVisibility} disabled={isLoading}>
              <SelectTrigger className="bg-slate-900/70 border-slate-700 text-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900 text-slate-50">
                {VISIBILITY_OPTIONS.map((opt) => (
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
            {visibility === "selective" && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-700 bg-slate-900/60 p-2">
                {eligibleParties.length > 0 && (
                  <>
                    <p className="mb-2 text-xs font-medium text-slate-300">Gruppi che possono vedere questa mappa</p>
                    <div className="mb-3 flex flex-col gap-1">
                      {eligibleParties.map((party) => (
                        <label key={party.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            checked={selectedPartyIds.includes(party.id)}
                            onChange={() => toggleParty(party.id)}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                          />
                          {party.label}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                <p className="mb-2 text-xs font-medium text-slate-300">Giocatori che possono vedere questa mappa</p>
                {eligiblePlayers.length === 0 ? (
                  <p className="text-xs text-slate-500">Nessun giocatore iscritto.</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {eligiblePlayers.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={selectedPlayerIds.includes(p.id)}
                          onChange={() => togglePlayer(p.id)}
                          className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
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
