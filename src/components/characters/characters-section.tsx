"use client";

import { CreateCharacterDialog } from "./create-character-dialog";
import { CharacterCardGm } from "./character-card-gm";
import { CharacterCardPlayer } from "./character-card-player";
import { PlayerSecretChat } from "@/components/player/player-secret-chat";
import type { CampaignCharacterRow, EligiblePlayer } from "@/app/campaigns/character-actions";

type CharactersSectionProps = {
  campaignId: string;
  characters: CampaignCharacterRow[];
  eligiblePlayers: EligiblePlayer[];
  isGm: boolean;
  /** Per il giocatore: id utente loggato e id del GM (per Sussurri del Master). */
  currentUserId?: string;
  gmId?: string;
};

export function CharactersSection({
  campaignId,
  characters,
  eligiblePlayers,
  isGm,
  currentUserId,
  gmId,
}: CharactersSectionProps) {
  if (isGm) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-barber-paper">Personaggi</h2>
          <CreateCharacterDialog campaignId={campaignId} />
        </div>
        {characters.length === 0 ? (
          <p className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 px-6 py-8 text-center text-barber-paper/70">
            Nessun personaggio creato. Clicca &quot;Nuovo personaggio&quot; per aggiungerne uno.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((char) => (
              <CharacterCardGm
                key={char.id}
                character={char}
                eligiblePlayers={eligiblePlayers}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Player: "Il Mio Personaggio"
  const myCharacter = characters[0] ?? null;

  if (!myCharacter) {
    return (
      <div className="rounded-xl border border-barber-gold/40 bg-barber-dark/80 px-6 py-12 text-center">
        <p className="text-barber-paper/90 text-lg">
          Il Master sta ancora preparando i destini. Attendi l&apos;assegnazione del tuo eroe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-barber-paper">Il Mio Personaggio</h2>
      <CharacterCardPlayer character={myCharacter} />
      {currentUserId && gmId && (
        <PlayerSecretChat
          campaignId={campaignId}
          currentUserId={currentUserId}
          gmId={gmId}
        />
      )}
    </div>
  );
}
