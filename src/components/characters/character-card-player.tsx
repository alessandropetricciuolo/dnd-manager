"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { MapPopoutButton } from "@/components/maps/map-popout-button";

const PLACEHOLDER_AVATAR = "https://placehold.co/400x560/1c1917/fbbf24/png?text=PG";

type CharacterCardPlayerProps = {
  character: CampaignCharacterRow;
};

/** Versione immersiva per il giocatore: immagine grande, nome, background. Nessun link al PDF. */
export function CharacterCardPlayer({ character }: CharacterCardPlayerProps) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError ? PLACEHOLDER_AVATAR : (character.image_url ?? PLACEHOLDER_AVATAR);
  const storedLevel = character.level ?? 1;
  const classLabel = character.character_class?.trim() || "Classe non specificata";

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
            <p className="mt-1 text-sm text-barber-paper/85">
              {classLabel} · Livello {storedLevel}
            </p>
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
      </CardContent>
    </Card>
  );
}
