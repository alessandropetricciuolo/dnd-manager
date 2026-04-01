"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { discoverPortalAction } from "@/lib/actions/portal-actions";
import { deletePortalAction } from "@/lib/actions/portal-actions";
import {
  updateCharacterGridPositionAction,
  updateCharactersGridPositionAction,
} from "@/app/campaigns/character-actions";
import {
  computeNearestPortalLocal,
  HOURS_PER_GRID_SQUARE,
  type Portal,
} from "@/lib/nav/navigation-math";
import { cn } from "@/lib/utils";

/** Pixel per quadretto di griglia (allineato al click sull’immagine). */
export const PIXELS_PER_SQUARE = 50;

export type MapCharacterPin = {
  id: string;
  name: string;
  pos_x_grid: number;
  pos_y_grid: number;
  assigned_to?: string | null;
};

type MapMode = "portal" | "move";
type MoveTargetType = "character" | "party";

type MapPartyOption = {
  id: string;
  label: string;
  memberIds: string[];
};

type InteractiveMapProps = {
  campaignId: string;
  imageUrl: string;
  portals: Portal[];
  characters: MapCharacterPin[];
  parties?: MapPartyOption[];
};

export function InteractiveMap({
  campaignId,
  imageUrl,
  portals,
  characters,
  parties = [],
}: InteractiveMapProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<MapMode>("portal");
  const [moveTargetType, setMoveTargetType] = useState<MoveTargetType>("character");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>("");
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [pendingGrid, setPendingGrid] = useState<{ x: number; y: number } | null>(
    null
  );
  const [portalName, setPortalName] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedCharacterId) ?? null,
    [characters, selectedCharacterId]
  );

  const nearest = useMemo(() => {
    if (!selectedCharacter) {
      return null;
    }
    return computeNearestPortalLocal(
      portals,
      selectedCharacter.pos_x_grid,
      selectedCharacter.pos_y_grid
    );
  }, [portals, selectedCharacter]);

  const selectedParty = useMemo(
    () => parties.find((p) => p.id === selectedPartyId) ?? null,
    [parties, selectedPartyId]
  );

  const selectedPartyCharacterIds = useMemo(() => {
    if (!selectedParty) return [];
    const memberSet = new Set(selectedParty.memberIds);
    return characters
      .filter((c) => c.assigned_to && memberSet.has(c.assigned_to))
      .map((c) => c.id);
  }, [characters, selectedParty]);

  function getGridFromClick(e: React.MouseEvent<HTMLImageElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ox = e.clientX - rect.left;
    const oy = e.clientY - rect.top;
    const displayedW = rect.width;
    const displayedH = rect.height;

    if (displayedW <= 0 || displayedH <= 0) return null;
    const natW = naturalSize?.w ?? displayedW;
    const natH = naturalSize?.h ?? displayedH;
    const sx = natW / displayedW;
    const sy = natH / displayedH;

    // Salviamo coordinate in "source pixels / 50" cosi restano coerenti a qualsiasi viewport.
    const gridX = Math.round((ox * sx) / PIXELS_PER_SQUARE);
    const gridY = Math.round((oy * sy) / PIXELS_PER_SQUARE);
    return { gridX, gridY };
  }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    const coords = getGridFromClick(e);
    if (!coords) return;
    const { gridX, gridY } = coords;

    if (mode === "portal") {
      setPendingGrid({ x: gridX, y: gridY });
      setPortalName("");
      setPortalDialogOpen(true);
      return;
    }

    startTransition(async () => {
      let res: { success: boolean; error?: string };
      if (moveTargetType === "party") {
        if (!selectedPartyId) {
          toast.error("Seleziona un gruppo da spostare.");
          return;
        }
        if (selectedPartyCharacterIds.length === 0) {
          toast.error("Il gruppo selezionato non ha personaggi assegnati.");
          return;
        }
        res = await updateCharactersGridPositionAction(
          campaignId,
          selectedPartyCharacterIds,
          gridX,
          gridY
        );
      } else {
        if (!selectedCharacterId) {
          toast.error("Seleziona un personaggio da spostare.");
          return;
        }
        res = await updateCharacterGridPositionAction(
          campaignId,
          selectedCharacterId,
          gridX,
          gridY
        );
      }
      if (!res.success) {
        toast.error(res.error ?? "Errore aggiornamento posizione.");
        return;
      }
      toast.success(moveTargetType === "party" ? "Posizione gruppo aggiornata." : "Posizione aggiornata.");
      router.refresh();
    });
  }

  function submitPortal() {
    if (!pendingGrid) return;
    const name = portalName.trim();
    if (!name) {
      toast.error("Inserisci un nome per il portale.");
      return;
    }
    startTransition(async () => {
      const res = await discoverPortalAction(
        campaignId,
        name,
        pendingGrid.x,
        pendingGrid.y
      );
      if (!res.success) {
        toast.error(res.message ?? "Errore");
        return;
      }
      toast.success("Portale registrato.");
      setPortalDialogOpen(false);
      setPendingGrid(null);
      router.refresh();
    });
  }

  function deletePortal(portalId: string) {
    if (!window.confirm("Vuoi rimuovere questo portale?")) return;
    startTransition(async () => {
      const res = await deletePortalAction(campaignId, portalId);
      if (!res.success) {
        toast.error(res.message ?? "Errore rimozione portale.");
        return;
      }
      toast.success("Portale rimosso.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-amber-600/25 bg-zinc-900/60 p-4">
        <div className="flex min-w-[200px] flex-col gap-2">
          <Label htmlFor="map-mode" className="text-zinc-400">
            Modalità
          </Label>
          <Select
            value={mode}
            onValueChange={(v) => setMode(v as MapMode)}
          >
            <SelectTrigger
              id="map-mode"
              className="border-amber-600/30 bg-zinc-950 text-zinc-200"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-amber-600/20 bg-zinc-900">
              <SelectItem value="portal" className="text-zinc-200">
                Aggiungi portale
              </SelectItem>
              <SelectItem value="move" className="text-zinc-200">
                Sposta personaggio
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <Label htmlFor="map-character" className="text-zinc-400">
            Personaggio (spostamento e HUD)
          </Label>
          <Select
            value={selectedCharacterId || "none"}
            onValueChange={(v) =>
              setSelectedCharacterId(v === "none" ? "" : v)
            }
          >
            <SelectTrigger
              id="map-character"
              className="border-amber-600/30 bg-zinc-950 text-zinc-200"
            >
              <SelectValue placeholder="— Nessuno —" />
            </SelectTrigger>
            <SelectContent className="border-amber-600/20 bg-zinc-900">
              <SelectItem value="none" className="text-zinc-400">
                — Nessuno —
              </SelectItem>
              {characters.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-zinc-200">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === "move" && (
          <>
            <div className="flex min-w-[180px] flex-col gap-2">
              <Label htmlFor="move-target" className="text-zinc-400">
                Tipo spostamento
              </Label>
              <Select
                value={moveTargetType}
                onValueChange={(v) => setMoveTargetType(v as MoveTargetType)}
              >
                <SelectTrigger id="move-target" className="border-amber-600/30 bg-zinc-950 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-amber-600/20 bg-zinc-900">
                  <SelectItem value="character" className="text-zinc-200">
                    Singolo personaggio
                  </SelectItem>
                  <SelectItem value="party" className="text-zinc-200">
                    Intero gruppo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {moveTargetType === "party" && (
              <div className="flex min-w-[220px] flex-1 flex-col gap-2">
                <Label htmlFor="map-party" className="text-zinc-400">
                  Gruppo
                </Label>
                <Select
                  value={selectedPartyId || "none"}
                  onValueChange={(v) => setSelectedPartyId(v === "none" ? "" : v)}
                >
                  <SelectTrigger id="map-party" className="border-amber-600/30 bg-zinc-950 text-zinc-200">
                    <SelectValue placeholder="— Nessuno —" />
                  </SelectTrigger>
                  <SelectContent className="border-amber-600/20 bg-zinc-900">
                    <SelectItem value="none" className="text-zinc-400">
                      — Nessuno —
                    </SelectItem>
                    {parties.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-zinc-200">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        <p className="max-w-md text-xs text-zinc-500">
          {mode === "portal"
            ? "Clic sulla mappa per fissare un portale fast travel (1 quadretto = 50 px)."
            : "Seleziona un PG, poi clicca dove deve trovarsi sulla griglia."}
        </p>
      </div>

      <div className="overflow-auto rounded-lg border border-amber-600/20 bg-zinc-950 p-1">
        <div className="relative inline-block max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element -- offsetX/offsetY devono essere nativi sull'elemento cliccato */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Mappa campagna"
            className="block max-h-[70vh] w-auto max-w-full cursor-crosshair select-none"
            draggable={false}
            onLoad={(e) => {
              const t = e.currentTarget;
              if (t.naturalWidth > 0 && t.naturalHeight > 0) {
                setNaturalSize({ w: t.naturalWidth, h: t.naturalHeight });
              }
            }}
            onClick={handleImageClick}
          />

          <div className="absolute inset-0">
          {portals.map((p) => (
            <div
              key={p.id}
              className="group absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-sky-300 bg-sky-600 shadow-md shadow-sky-900/50"
              style={{
                left: naturalSize
                  ? `${((p.pos_x_grid * PIXELS_PER_SQUARE) / naturalSize.w) * 100}%`
                  : p.pos_x_grid * PIXELS_PER_SQUARE,
                top: naturalSize
                  ? `${((p.pos_y_grid * PIXELS_PER_SQUARE) / naturalSize.h) * 100}%`
                  : p.pos_y_grid * PIXELS_PER_SQUARE,
              }}
              title={p.name}
            >
              <Lock className="h-2 w-2 text-white" aria-hidden />
              {mode === "portal" && (
                <button
                  type="button"
                  className="pointer-events-auto absolute -right-3 -top-3 hidden h-5 w-5 items-center justify-center rounded-full border border-red-300/70 bg-red-600/90 text-white group-hover:flex"
                  title="Rimuovi portale"
                  onClick={(e) => {
                    e.stopPropagation();
                    deletePortal(p.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {characters.map((c) => (
            <div
              key={c.id}
              className={cn(
                "absolute flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-red-200 bg-red-600 shadow-md shadow-red-900/50",
                selectedCharacterId === c.id && "ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950"
              )}
              style={{
                left: naturalSize
                  ? `${((c.pos_x_grid * PIXELS_PER_SQUARE) / naturalSize.w) * 100}%`
                  : c.pos_x_grid * PIXELS_PER_SQUARE,
                top: naturalSize
                  ? `${((c.pos_y_grid * PIXELS_PER_SQUARE) / naturalSize.h) * 100}%`
                  : c.pos_y_grid * PIXELS_PER_SQUARE,
              }}
              title={c.name}
            >
              <MapPin className="h-2.5 w-2.5 text-white" aria-hidden />
            </div>
          ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-600/25 bg-zinc-900/70 p-4 text-sm text-zinc-200">
        <h3 className="mb-3 font-semibold text-amber-400/90">Navigatore</h3>
        {selectedCharacter ? (
          <dl className="grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Personaggio</dt>
              <dd className="font-medium">{selectedCharacter.name}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Coordinate griglia</dt>
              <dd>
                X: {selectedCharacter.pos_x_grid}, Y:{" "}
                {selectedCharacter.pos_y_grid}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-zinc-500">Portale più vicino</dt>
              <dd>
                {nearest?.nearestPortal ? (
                  <>
                    <span className="font-medium text-sky-300">
                      {nearest.nearestPortal.name}
                    </span>
                    {" · "}
                    Distanza:{" "}
                    <span className="tabular-nums">
                      {nearest.distSquares.toFixed(2)}
                    </span>{" "}
                    quadretti · Viaggio locale stimato:{" "}
                    <span className="tabular-nums">
                      {(nearest.distSquares * HOURS_PER_GRID_SQUARE).toFixed(1)}
                    </span>{" "}
                    ore (×{HOURS_PER_GRID_SQUARE} h/quadretto)
                  </>
                ) : (
                  <span className="text-zinc-500">
                    Nessun portale registrato in campagna.
                  </span>
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-zinc-500">
            Seleziona un personaggio per vedere coordinate e distanza dal portale
            più vicino.
          </p>
        )}
      </div>

      <Dialog open={portalDialogOpen} onOpenChange={setPortalDialogOpen}>
        <DialogContent className="border-amber-600/30 bg-zinc-900 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuovo portale</DialogTitle>
            {pendingGrid && (
              <p className="text-sm text-zinc-400">
                Griglia: X = {pendingGrid.x}, Y = {pendingGrid.y}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="portal-name">Nome del portale</Label>
            <Input
              id="portal-name"
              value={portalName}
              onChange={(e) => setPortalName(e.target.value)}
              placeholder="Es. Varco del Nord"
              className="border-amber-600/30 bg-zinc-950"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitPortal();
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-400"
              onClick={() => {
                setPortalDialogOpen(false);
                setPendingGrid(null);
              }}
            >
              Annulla
            </Button>
            <Button
              type="button"
              className="bg-amber-600 text-zinc-950 hover:bg-amber-500"
              disabled={isPending}
              onClick={submitPortal}
            >
              Salva portale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
