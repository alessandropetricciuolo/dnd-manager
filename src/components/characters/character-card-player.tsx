"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { levelUpCharacter } from "@/app/campaigns/character-actions";
import { calculateLevelProgress } from "@/lib/dnd-constants";
import { Button } from "@/components/ui/button";
import { MapPopoutButton } from "@/components/maps/map-popout-button";

const PLACEHOLDER_AVATAR = "https://placehold.co/400x560/1c1917/fbbf24/png?text=PG";

type CharacterCardPlayerProps = {
  character: CampaignCharacterRow;
};

/** Versione immersiva per il giocatore: immagine grande, nome, background. Nessun link al PDF. */
export function CharacterCardPlayer({ character }: CharacterCardPlayerProps) {
  const [isPending, startTransition] = useTransition();
  const [imgError, setImgError] = useState(false);
  const xp = character.current_xp ?? 0;
  const imageSrc = imgError ? PLACEHOLDER_AVATAR : (character.image_url ?? PLACEHOLDER_AVATAR);
  const storedLevel = character.level ?? 1;
  const { level: calculatedLevel, nextLevelXp, progressPercent } = calculateLevelProgress(xp);
  const hasLevelUp = calculatedLevel > storedLevel;

  const xpLabel =
    nextLevelXp != null
      ? `${xp} / ${nextLevelXp} PE`
      : `${xp} PE (livello massimo)`;

  function handleLevelUp() {
    startTransition(async () => {
      const result = await levelUpCharacter(character.id);
      if (result.success) {
        toast.success("Level up confermato!");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="overflow-hidden border-barber-gold/40 bg-barber-dark/90 min-w-0">
      <div className="space-y-2 min-w-0">
        <div className="relative aspect-[4/5] w-full max-w-md mx-auto overflow-hidden bg-barber-dark min-w-0">
          <Image
            src={imageSrc}
            alt={character.name}
            fill
            className="object-cover"
            sizes="(max-width: 500px) 100vw, 400px"
            priority
            unoptimized={!!character.image_url}
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 min-w-0">
            <h2 className="text-xl font-semibold text-barber-paper break-words md:text-2xl lg:text-3xl">
              {character.name}
            </h2>
          </div>
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
        <CardTitle className="text-barber-gold">Background</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 min-w-0">
        {character.background ? (
          <div className="whitespace-pre-wrap break-words text-barber-paper/90 leading-relaxed overflow-hidden">
            {character.background}
          </div>
        ) : (
          <p className="text-barber-paper/50 italic">Nessun background inserito dal Master.</p>
        )}
        <div className="mt-6 space-y-2 rounded-lg border border-barber-gold/40 bg-barber-dark/70 p-3 min-w-0 overflow-hidden">
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
                disabled={isPending}
                onClick={handleLevelUp}
              >
                {isPending ? "Aggiornamento..." : "Conferma passaggio di livello"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
