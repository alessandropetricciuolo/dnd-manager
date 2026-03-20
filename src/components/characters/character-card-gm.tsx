"use client";

import Image from "next/image";
import { useRouter } from "nextjs-toploader/app";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditCharacterDialog } from "./edit-character-dialog";
import {
  assignCharacter,
  deleteCharacter,
  levelUpCharacter,
  type CampaignCharacterRow,
  type EligiblePlayer,
} from "@/app/campaigns/character-actions";
import { calculateLevelProgress } from "@/lib/dnd-constants";
import { Progress } from "@/components/ui/progress";
import { MapPopoutButton } from "@/components/maps/map-popout-button";

const PLACEHOLDER_AVATAR = "https://placehold.co/200x280/1c1917/fbbf24/png?text=PG";

/** PF/CA/Classe non sono ancora nel DB: placeholder per layout VTT. */
const STAT_PLACEHOLDER = "—";

type CharacterCardGmProps = {
  character: CampaignCharacterRow;
  eligiblePlayers: EligiblePlayer[];
};

export function CharacterCardGm({ character, eligiblePlayers }: CharacterCardGmProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [sheetImgError, setSheetImgError] = useState(false);
  const [isLeveling, startTransition] = useTransition();
  const imageSrc = imgError ? PLACEHOLDER_AVATAR : character.image_url ?? PLACEHOLDER_AVATAR;
  const sheetImageSrc = sheetImgError
    ? PLACEHOLDER_AVATAR
    : character.image_url ?? PLACEHOLDER_AVATAR;

  const currentLabel = character.assigned_to
    ? eligiblePlayers.find((p) => p.id === character.assigned_to)?.label ?? "Assegnato"
    : "Non assegnato";

  const xp = character.current_xp ?? 0;
  const storedLevel = character.level ?? 1;
  const { level: calculatedLevel, nextLevelXp, progressPercent } = calculateLevelProgress(xp);
  const hasLevelUp = calculatedLevel > storedLevel;

  const xpLabel =
    nextLevelXp != null ? `${xp} / ${nextLevelXp} PE` : `${xp} PE (livello massimo)`;

  const backgroundPreview = character.background?.trim() ?? "";
  const backgroundForSheet = character.background?.trim()
    ? character.background
    : null;

  async function onAssign(playerId: string | null) {
    const value = playerId === "__none__" ? null : playerId;
    setAssigning(true);
    try {
      const result = await assignCharacter(character.id, value);
      if (result.success) {
        toast.success(value ? "Personaggio assegnato." : "Assegnazione rimossa.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setAssigning(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Eliminare il personaggio "${character.name}"? Anche il PDF della scheda verrà rimosso.`))
      return;
    setDeleting(true);
    try {
      const result = await deleteCharacter(character.id);
      if (result.success) {
        toast.success("Personaggio eliminato.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card className="relative overflow-hidden border-barber-gold/40 bg-barber-dark/80">
        {/* Azioni compatte in alto a destra */}
        <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5">
          {character.sheet_url && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-barber-gold hover:bg-barber-gold/15"
              asChild
              title="Scarica scheda PDF"
            >
              <a href={character.sheet_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          {character.image_url && (
            <MapPopoutButton
              imageUrl={character.image_url}
              title={character.name}
              compact
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-barber-gold"
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-barber-paper/80 hover:bg-barber-gold/10"
            disabled={deleting}
            onClick={onDelete}
            title="Elimina personaggio"
          >
            <Trash2 className="h-4 w-4 text-barber-red/90" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-barber-paper/80 hover:bg-barber-gold/10"
            onClick={() => setEditOpen(true)}
            title="Modifica personaggio"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="space-y-3 p-3 pt-10">
          <div className="flex gap-3">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-barber-dark ring-1 ring-barber-gold/25">
              <Image
                src={imageSrc}
                alt={character.name}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized={!!character.image_url}
                onError={() => setImgError(true)}
              />
            </div>
            <div className="min-w-0 flex-1 pr-10">
              <h3 className="truncate font-semibold text-barber-paper">{character.name}</h3>
              <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-barber-paper/75 sm:text-xs">
                <div className="flex justify-between gap-1">
                  <dt className="text-muted-foreground">Classe</dt>
                  <dd className="truncate font-medium tabular-nums text-barber-paper">{STAT_PLACEHOLDER}</dd>
                </div>
                <div className="flex justify-between gap-1">
                  <dt className="text-muted-foreground">PF</dt>
                  <dd className="font-medium tabular-nums text-barber-paper">{STAT_PLACEHOLDER}</dd>
                </div>
                <div className="flex justify-between gap-1">
                  <dt className="text-muted-foreground">CA</dt>
                  <dd className="font-medium tabular-nums text-barber-paper">{STAT_PLACEHOLDER}</dd>
                </div>
                <div className="flex justify-between gap-1">
                  <dt className="text-muted-foreground">Lv</dt>
                  <dd className="font-medium tabular-nums text-barber-paper">{storedLevel}</dd>
                </div>
              </dl>
              <p className="mt-1 text-[10px] text-barber-paper/55 tabular-nums">{xpLabel}</p>
            </div>
          </div>

          {backgroundPreview ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{character.background}</p>
          ) : (
            <p className="line-clamp-2 text-sm italic text-muted-foreground">Nessun background.</p>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full border-barber-gold/30 bg-barber-gold/15 text-barber-paper hover:bg-barber-gold/25"
            onClick={() => setDetailsOpen(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Dettagli
          </Button>

          <div className="space-y-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wide text-barber-paper/60">
              Assegna a
            </label>
            <Select
              value={character.assigned_to ?? "__none__"}
              onValueChange={onAssign}
              disabled={assigning}
            >
              <SelectTrigger className="h-9 border-barber-gold/30 bg-barber-dark text-barber-paper text-sm">
                <SelectValue placeholder="Seleziona giocatore" />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/30 bg-barber-dark">
                <SelectItem value="__none__" className="text-barber-paper focus:bg-barber-gold/20">
                  Nessuno
                </SelectItem>
                {eligiblePlayers.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    className="text-barber-paper focus:bg-barber-gold/20"
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="truncate text-[10px] text-barber-paper/50">{currentLabel}</p>
          </div>

          <div className="space-y-1.5 rounded-md border border-barber-gold/35 bg-barber-dark/70 p-2">
            <div className="flex items-center justify-between text-[10px] font-medium text-barber-paper/80">
              <span>PE</span>
              <span>
                Lv {storedLevel}
                {hasLevelUp && (
                  <span className="ml-1.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300">
                    Level up
                  </span>
                )}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
            <div className="flex items-center justify-between text-[10px] text-barber-paper/65">
              <span className="tabular-nums">{xpLabel}</span>
              <span className="tabular-nums">{Math.round(progressPercent)}%</span>
            </div>
            {hasLevelUp && (
              <Button
                type="button"
                size="sm"
                className="h-7 w-full bg-emerald-600 text-[11px] text-barber-dark hover:bg-emerald-500"
                disabled={isLeveling}
                onClick={() =>
                  startTransition(async () => {
                    const result = await levelUpCharacter(character.id);
                    if (result.success) {
                      toast.success("Level up confermato.");
                      router.refresh();
                    } else {
                      toast.error(result.error);
                    }
                  })
                }
              >
                {isLeveling ? "Aggiornamento..." : "Conferma level up"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent
          side="right"
          className="flex w-full max-w-lg flex-col border-barber-gold/40 bg-barber-dark text-barber-paper sm:max-w-lg"
        >
          <SheetHeader className="shrink-0 space-y-1 text-left">
            <SheetTitle className="text-barber-paper">Scheda di lettura — {character.name}</SheetTitle>
            <SheetDescription className="text-barber-paper/65">
              Solo consultazione. Per modificare usa &quot;Modifica&quot; sulla card.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 shrink-0 space-y-4 border-b border-barber-gold/25 pb-4">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[220px] overflow-hidden rounded-lg bg-barber-dark ring-1 ring-barber-gold/30">
              <Image
                src={sheetImageSrc}
                alt={character.name}
                fill
                className="object-cover"
                sizes="220px"
                unoptimized={!!character.image_url}
                onError={() => setSheetImgError(true)}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-barber-paper">{character.name}</h2>
              <p className="text-sm text-muted-foreground">Assegnato: {currentLabel}</p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Classe</dt>
                <dd className="font-medium tabular-nums text-barber-paper">{STAT_PLACEHOLDER}</dd>
              </div>
              <div className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">PF</dt>
                <dd className="font-medium tabular-nums text-barber-paper">{STAT_PLACEHOLDER}</dd>
              </div>
              <div className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">CA</dt>
                <dd className="font-medium tabular-nums text-barber-paper">{STAT_PLACEHOLDER}</dd>
              </div>
              <div className="rounded-md border border-barber-gold/25 bg-barber-dark/80 px-2 py-1.5">
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Livello</dt>
                <dd className="font-medium tabular-nums text-barber-paper">{storedLevel}</dd>
              </div>
            </dl>
            <div className="rounded-md border border-barber-gold/30 bg-barber-dark/70 p-2 text-xs text-barber-paper/80">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Punti esperienza</span>
                <span className="tabular-nums font-medium">{xpLabel}</span>
              </div>
              <Progress value={progressPercent} className="mt-2 h-1.5" />
              <p className="mt-1 text-right text-[10px] text-muted-foreground">
                Progresso livello: {Math.round(progressPercent)}%
              </p>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-barber-paper/60">
              Background / Lore
            </p>
            <ScrollArea className="h-[min(50vh,420px)] rounded-md border border-barber-gold/25 pr-3">
              <div className="p-3 pr-1">
                {backgroundForSheet ? (
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-barber-paper/90">
                    {backgroundForSheet}
                  </div>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Nessun background inserito.</p>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <EditCharacterDialog character={character} open={editOpen} onOpenChange={setEditOpen} />
    </>
  );
}
