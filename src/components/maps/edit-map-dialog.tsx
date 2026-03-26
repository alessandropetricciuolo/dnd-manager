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

const VISIBILITY_OPTIONS: { label: string; value: string }[] = [
  { label: "Pubblico (tutti)", value: "public" },
  { label: "Segreto (solo GM)", value: "secret" },
  { label: "Selettivo (scegli giocatori)", value: "selective" },
];

type EditMapDialogProps = {
  campaignId: string;
  mapId: string;
  initialName: string;
  initialMapType: string;
  initialVisibility?: string;
  initialAllowedUserIds?: string[];
  initialAllowedPartyIds?: string[];
  eligiblePlayers?: { id: string; label: string }[];
  eligibleParties?: { id: string; label: string; memberIds: string[] }[];
  onSuccess?: () => void;
};

export function EditMapDialog({
  campaignId,
  mapId,
  initialName,
  initialMapType,
  initialVisibility = "public",
  initialAllowedUserIds = [],
  initialAllowedPartyIds = [],
  eligiblePlayers = [],
  eligibleParties = [],
  onSuccess,
}: EditMapDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(initialName);
  const [mapType, setMapType] = useState(
    MAP_TYPE_OPTIONS.some((o) => o.value === initialMapType) ? initialMapType : "region"
  );
  const [visibility, setVisibility] = useState(
    VISIBILITY_OPTIONS.some((o) => o.value === initialVisibility) ? initialVisibility : "public"
  );
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialAllowedUserIds);
  const [selectedPartyIds, setSelectedPartyIds] = useState<string[]>(initialAllowedPartyIds);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setName(initialName);
      setMapType(MAP_TYPE_OPTIONS.some((o) => o.value === initialMapType) ? initialMapType : "region");
      setVisibility(VISIBILITY_OPTIONS.some((o) => o.value === initialVisibility) ? initialVisibility : "public");
      setSelectedPlayerIds(initialAllowedUserIds);
      setSelectedPartyIds(initialAllowedPartyIds);
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
      const result = await updateMap(mapId, campaignId, {
        name: trimmedName,
        map_type: mapType,
        visibility: visibility as "public" | "secret" | "selective",
        allowed_user_ids: visibility === "selective" ? selectedPlayerIds : [],
        allowed_party_ids: visibility === "selective" ? selectedPartyIds : [],
      });
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
