"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import { MapPopoutButton } from "@/components/maps/map-popout-button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { parseRulesSnapshot } from "@/lib/character-rules-snapshot";
import { backgroundBySlug, raceBySlug } from "@/lib/character-build-catalog";

const PLACEHOLDER_AVATAR = "https://placehold.co/400x560/1c1917/fbbf24/png?text=PG";

type CharacterCardPlayerProps = {
  character: CampaignCharacterRow;
  isLongCampaign?: boolean;
};

function TipSpan({ label, body }: { label: string; body: string }) {
  const t = body?.trim();
  if (!t) {
    return <span className="text-barber-paper/85">{label}</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="cursor-help border-b border-dotted border-barber-gold/55 text-barber-paper/90 hover:text-barber-gold"
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-h-72 max-w-md overflow-y-auto whitespace-pre-wrap border-barber-gold/30 bg-barber-dark px-3 py-2 text-left text-xs leading-relaxed text-barber-paper"
      >
        {t}
      </TooltipContent>
    </Tooltip>
  );
}

/** Versione immersiva per il giocatore: immagine grande, nome, background. Nessun link al PDF. */
export function CharacterCardPlayer({ character, isLongCampaign }: CharacterCardPlayerProps) {
  const [imgError, setImgError] = useState(false);
  const imageSrc = imgError ? PLACEHOLDER_AVATAR : (character.image_url ?? PLACEHOLDER_AVATAR);
  const storedLevel = character.level ?? 1;
  const classLabel = character.character_class?.trim() || "Classe non specificata";
  const raceDef = raceBySlug(character.race_slug ?? null);
  const raceLabel = raceDef?.label ?? null;
  const subraceLabel =
    raceDef?.subraces?.find((s) => s.slug === character.subclass_slug)?.label ?? null;
  const bgRulesLabel = backgroundBySlug(character.background_slug ?? null)?.label ?? null;
  const snap = parseRulesSnapshot(character.rules_snapshot ?? null);

  return (
    <TooltipProvider delayDuration={200}>
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
                {raceLabel ? (
                  <>
                    <TipSpan label={raceLabel} body={snap?.raceTraitsMd ?? ""} />
                    {snap?.subraceTraitsMd?.trim() ? (
                      <>
                        {" · "}
                        <TipSpan label={subraceLabel ?? "Sottorazza"} body={snap.subraceTraitsMd} />
                      </>
                    ) : null}
                    {" · "}
                  </>
                ) : null}
                <TipSpan label={classLabel} body={snap?.classPrivilegesMd ?? ""} />
                {" · "}Livello {storedLevel}
                {snap?.spellcastingMd?.trim() || snap?.spellsListMd?.trim() ? (
                  <>
                    {" · "}
                    <TipSpan
                      label="Incantesimi"
                      body={[snap?.spellcastingMd, snap?.spellsListMd].filter(Boolean).join("\n\n—\n\n")}
                    />
                  </>
                ) : null}
                <span className="mt-0.5 block text-xs text-barber-paper/65 tabular-nums">
                  Tempo vissuto: {character.time_offset_hours ?? 0} h
                </span>
                {isLongCampaign && (
                  <span className="mt-0.5 block text-xs text-barber-gold/90 tabular-nums">
                    {character.coins_gp ?? 0} oro · {character.coins_sp ?? 0} arg · {character.coins_cp ?? 0} ram
                  </span>
                )}
              </p>
            </div>
          </div>
          {character.image_url && (
            <div className="flex justify-end px-4">
              <MapPopoutButton imageUrl={character.image_url} title={character.name} />
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-barber-gold">
            Background
            {bgRulesLabel && snap?.backgroundRulesMd?.trim() ? (
              <span className="text-sm font-normal text-barber-paper/70">
                (<TipSpan label={`PHB: ${bgRulesLabel}`} body={snap.backgroundRulesMd} />)
              </span>
            ) : null}
          </CardTitle>
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
    </TooltipProvider>
  );
}
