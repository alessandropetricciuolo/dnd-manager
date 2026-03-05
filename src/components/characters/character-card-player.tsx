"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";

const PLACEHOLDER_AVATAR = "https://placehold.co/400x560/1c1917/fbbf24/png?text=PG";

type CharacterCardPlayerProps = {
  character: CampaignCharacterRow;
};

/** Versione immersiva per il giocatore: immagine grande, nome, background. Nessun link al PDF. */
export function CharacterCardPlayer({ character }: CharacterCardPlayerProps) {
  return (
    <Card className="overflow-hidden border-barber-gold/40 bg-barber-dark/90">
      <div className="relative aspect-[4/5] w-full max-w-md mx-auto overflow-hidden bg-barber-dark">
        <Image
          src={character.image_url ?? PLACEHOLDER_AVATAR}
          alt={character.name}
          fill
          className="object-cover"
          sizes="(max-width: 500px) 100vw, 400px"
          priority
          unoptimized={!!character.image_url}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-barber-dark via-barber-dark/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h2 className="text-2xl font-semibold text-barber-paper md:text-3xl">{character.name}</h2>
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-barber-gold">Background</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {character.background ? (
          <div className="whitespace-pre-wrap text-barber-paper/90 leading-relaxed">
            {character.background}
          </div>
        ) : (
          <p className="text-barber-paper/50 italic">Nessun background inserito dal Master.</p>
        )}
      </CardContent>
    </Card>
  );
}
