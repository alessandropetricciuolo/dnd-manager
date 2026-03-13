"use client";

import Image from "next/image";
import { useRouter } from "nextjs-toploader/app";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Pencil, Trash2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditCharacterDialog } from "./edit-character-dialog";
import { assignCharacter, deleteCharacter, levelUpCharacter, type CampaignCharacterRow, type EligiblePlayer } from "@/app/campaigns/character-actions";
import { calculateLevelProgress } from "@/lib/dnd-constants";
import { Progress } from "@/components/ui/progress";
import { MapPopoutButton } from "@/components/maps/map-popout-button";

const PLACEHOLDER_AVATAR = "https://placehold.co/200x280/1c1917/fbbf24/png?text=PG";

type CharacterCardGmProps = {
  character: CampaignCharacterRow;
  eligiblePlayers: EligiblePlayer[];
};

export function CharacterCardGm({ character, eligiblePlayers }: CharacterCardGmProps) {
  const router = useRouter();
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isLeveling, startTransition] = useTransition();
  const imageSrc = imgError ? PLACEHOLDER_AVATAR : (character.image_url ?? PLACEHOLDER_AVATAR);

  const currentLabel = character.assigned_to
    ? eligiblePlayers.find((p) => p.id === character.assigned_to)?.label ?? "Assegnato"
    : "Non assegnato";

  const xp = character.current_xp ?? 0;
  const storedLevel = character.level ?? 1;
  const { level: calculatedLevel, nextLevelXp, progressPercent } = calculateLevelProgress(xp);
  const hasLevelUp = calculatedLevel > storedLevel;

  const xpLabel =
    nextLevelXp != null ? `${xp} / ${nextLevelXp} PE` : `${xp} PE (livello massimo)`;

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
    if (!confirm(`Eliminare il personaggio "${character.name}"? Anche il PDF della scheda verrà rimosso.`)) return;
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
    <Card className="overflow-hidden border-barber-gold/40 bg-barber-dark/80">
      <div className="space-y-2">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-barber-dark">
          <Image
            src={imageSrc}
            alt={character.name}
            fill
            className="object-cover"
            sizes="(max-width: 400px) 100vw, 280px"
            unoptimized={!!character.image_url}
            onError={() => setImgError(true)}
          />
        </div>
        {character.image_url && (
          <div className="flex justify-end px-4">
            <MapPopoutButton
              imageUrl={character.image_url}
              title={character.name}
            />
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-barber-paper">{character.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-2">
          {character.sheet_url && (
            <a
              href={character.sheet_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded border border-barber-gold/40 bg-barber-gold/10 px-2.5 py-1.5 text-sm text-barber-gold hover:bg-barber-gold/20"
            >
              <Download className="h-4 w-4" />
              Scheda PDF
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-barber-gold/40 text-barber-paper/80 hover:bg-barber-gold/10"
            onClick={() => setEditOpen(true)}
            title="Modifica personaggio"
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Modifica
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-barber-red/50 text-barber-paper/80 hover:bg-barber-red/10"
            disabled={deleting}
            onClick={onDelete}
            title="Elimina personaggio"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-barber-paper/70">Assegna a</label>
          <Select
            value={character.assigned_to ?? "__none__"}
            onValueChange={onAssign}
            disabled={assigning}
          >
            <SelectTrigger className="border-barber-gold/30 bg-barber-dark text-barber-paper">
              <SelectValue placeholder="Seleziona giocatore" />
            </SelectTrigger>
            <SelectContent className="border-barber-gold/30 bg-barber-dark">
              <SelectItem value="__none__" className="text-barber-paper focus:bg-barber-gold/20">
                Nessuno
              </SelectItem>
              {eligiblePlayers.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-barber-paper focus:bg-barber-gold/20">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 rounded-lg border border-barber-gold/40 bg-barber-dark/70 p-3">
          <div className="flex items-center justify-between text-xs font-medium text-barber-paper/80">
            <span>Esperienza</span>
            <span>
              Lv {storedLevel}
              {hasLevelUp && (
                <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  🌟 Level Up disponibile!
                </span>
              )}
            </span>
          </div>
          <Progress value={progressPercent} />
          <div className="flex items-center justify-between text-[11px] text-barber-paper/70">
            <span>{xpLabel}</span>
            <span>Progresso: {Math.round(progressPercent)}%</span>
          </div>
          {hasLevelUp && (
            <div className="mt-2">
              <Button
                type="button"
                size="sm"
                className="h-8 bg-emerald-600 text-xs text-barber-dark hover:bg-emerald-500"
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
                {isLeveling ? "Aggiornamento..." : "Conferma passaggio di livello"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
      <EditCharacterDialog
        character={character}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Card>
  );
}

