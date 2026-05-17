"use client";

import { CreateCharacterDialog } from "./create-character-dialog";
import { ImportCharactersFromCatalogDialog } from "./import-characters-from-catalog-dialog";
import { CharacterCardGm } from "./character-card-gm";
import { CharacterCardPlayer } from "./character-card-player";
import { PlayerSecretChat } from "@/components/player/player-secret-chat";
import type { CampaignCharacterRow, EligiblePlayer } from "@/app/campaigns/character-actions";

type CharactersSectionProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | null;
  characters: CampaignCharacterRow[];
  eligiblePlayers: EligiblePlayer[];
  playerPartyById?: Record<string, string>;
  isGm: boolean;
  openCreateDialogOnLoad?: boolean;
  openEditCharacterId?: string | null;
  /** Per il giocatore: id utente loggato e id del GM (per Sussurri del Master). */
  currentUserId?: string;
  gmId?: string;
};

export function CharactersSection({
  campaignId,
  campaignType,
  characters,
  eligiblePlayers,
  playerPartyById = {},
  isGm,
  openCreateDialogOnLoad = false,
  openEditCharacterId = null,
  currentUserId,
  gmId,
}: CharactersSectionProps) {
  const isLongCampaign = campaignType === "long";
  const eligibleLabelById = new Map(eligiblePlayers.map((p) => [p.id, p.label]));
  const groupLabelForCharacter = (char: CampaignCharacterRow): string => {
    const assigned = char.assigned_to?.trim() ?? "";
    if (!assigned) return "Non assegnati";
    return playerPartyById[assigned]?.trim() || "Senza gruppo";
  };
  const sortedCharacters = [...characters].sort((a, b) => {
    if (!isGm || !isLongCampaign) return 0;

    const aAssigned = a.assigned_to?.trim() ?? "";
    const bAssigned = b.assigned_to?.trim() ?? "";
    const aHasAssigned = aAssigned.length > 0;
    const bHasAssigned = bAssigned.length > 0;
    if (aHasAssigned !== bHasAssigned) return aHasAssigned ? -1 : 1;
    if (!aHasAssigned && !bHasAssigned) {
      return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
    }

    const aParty = playerPartyById[aAssigned]?.trim() ?? "Senza gruppo";
    const bParty = playerPartyById[bAssigned]?.trim() ?? "Senza gruppo";
    const byParty = aParty.localeCompare(bParty, "it", { sensitivity: "base" });
    if (byParty !== 0) return byParty;

    const aPlayer = eligibleLabelById.get(aAssigned) ?? "";
    const bPlayer = eligibleLabelById.get(bAssigned) ?? "";
    const byPlayer = aPlayer.localeCompare(bPlayer, "it", { sensitivity: "base" });
    if (byPlayer !== 0) return byPlayer;

    return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
  });
  const groupedCharacters = (() => {
    if (!isGm || !isLongCampaign) return [] as Array<{ label: string; items: CampaignCharacterRow[] }>;
    const groups = new Map<string, CampaignCharacterRow[]>();
    for (const char of sortedCharacters) {
      const label = groupLabelForCharacter(char);
      const list = groups.get(label) ?? [];
      list.push(char);
      groups.set(label, list);
    }
    return [...groups.entries()].map(([label, items]) => ({ label, items }));
  })();

  if (isGm) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-barber-paper">Personaggi</h2>
          <div className="flex flex-wrap items-center gap-2">
            <ImportCharactersFromCatalogDialog campaignId={campaignId} />
            <CreateCharacterDialog campaignId={campaignId} initialOpen={openCreateDialogOnLoad} />
          </div>
        </div>
        {characters.length === 0 ? (
          <p className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 px-6 py-8 text-center text-barber-paper/70">
            Nessun personaggio creato. Clicca &quot;Nuovo personaggio&quot; per aggiungerne uno.
          </p>
        ) : isLongCampaign ? (
          <div className="space-y-6">
            {groupedCharacters.map((group) => (
              <section key={group.label} className="space-y-3">
                <h3 className="border-b border-barber-gold/20 pb-2 text-sm font-semibold uppercase tracking-wide text-barber-gold/90">
                  {group.label}
                </h3>
                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((char) => (
                    <CharacterCardGm
                      key={char.id}
                      character={char}
                      eligiblePlayers={eligiblePlayers}
                      isLongCampaign={isLongCampaign}
                      autoOpenEdit={openEditCharacterId === char.id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {sortedCharacters.map((char) => (
              <CharacterCardGm
                key={char.id}
                character={char}
                eligiblePlayers={eligiblePlayers}
                isLongCampaign={isLongCampaign}
                autoOpenEdit={openEditCharacterId === char.id}
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
      <CharacterCardPlayer character={myCharacter} isLongCampaign={isLongCampaign} />
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
