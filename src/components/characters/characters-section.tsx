"use client";

import { CreateCharacterDialog } from "./create-character-dialog";
import { ImportCharactersFromCatalogDialog } from "./import-characters-from-catalog-dialog";
import { CharacterCardGm } from "./character-card-gm";
import { DownloadCampaignSheetsButton } from "./download-campaign-sheets-button";
import { CharacterCardPlayer } from "./character-card-player";
import { PlayerSecretChat } from "@/components/player/player-secret-chat";
import type { CampaignCharacterRow, EligiblePlayer } from "@/app/campaigns/character-actions";

type CharactersSectionProps = {
  campaignId: string;
  campaignType?: "oneshot" | "quest" | "long" | "torneo" | null;
  characters: CampaignCharacterRow[];
  eligiblePlayers: EligiblePlayer[];
  playerPartyById?: Record<string, string>;
  isGm: boolean;
  openCreateDialogOnLoad?: boolean;
  openEditCharacterId?: string | null;
  /** Per il giocatore: id utente loggato e id del GM (per Sussurri del Master). */
  currentUserId?: string;
  gmId?: string;
  hideActions?: boolean;
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
  hideActions = false,
}: CharactersSectionProps) {
  const isLongCampaign = campaignType === "long";
  const isTorneoCampaign = campaignType === "torneo";

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
        {!hideActions ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-barber-gold/20 pb-4">
            <div>
              <h2 className="font-cinzel text-xl font-bold tracking-wider text-gold-relief">Registro Personaggi</h2>
              <p className="text-xs text-barber-paper/65">
                {characters.length} {characters.length === 1 ? "eroe registrato" : "eroi registrati"} nella gilda
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DownloadCampaignSheetsButton campaignId={campaignId} characters={characters} />
              <ImportCharactersFromCatalogDialog campaignId={campaignId} />
              <CreateCharacterDialog campaignId={campaignId} initialOpen={openCreateDialogOnLoad} />
            </div>
          </div>
        ) : null}
        {characters.length === 0 ? (
          <div className="card-guild-stone relative rounded-xl p-8 text-center">
            <span className="corner-ornament-tl" />
            <span className="corner-ornament-tr" />
            <span className="corner-ornament-bl" />
            <span className="corner-ornament-br" />
            <p className="font-cinzel text-lg font-medium text-barber-gold/90">Nessun eroe convocato al tavolo</p>
            <p className="mt-2 text-sm text-barber-paper/70">
              Nessun personaggio creato. Clicca &quot;Nuovo personaggio&quot; o importa dal catalogo per aggiungerne uno.
            </p>
          </div>
        ) : isLongCampaign ? (
          <div className="space-y-6">
            {groupedCharacters.map((group) => (
              <section key={group.label} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-barber-gold/25 pb-2">
                  <span className="h-2 w-2 rotate-45 border border-barber-gold/70 bg-barber-gold/30" />
                  <h3 className="font-cinzel text-sm font-semibold tracking-wider text-barber-gold/95">
                    {group.label}
                  </h3>
                  <span className="text-xs text-barber-paper/50">({group.items.length})</span>
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((char) => (
                    <CharacterCardGm
                      key={char.id}
                      character={char}
                      eligiblePlayers={eligiblePlayers}
                      isLongCampaign={isLongCampaign}
                      isTorneoCampaign={isTorneoCampaign}
                      autoOpenEdit={openEditCharacterId === char.id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div
            className={
              isTorneoCampaign
                ? "grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                : "grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4"
            }
          >
            {sortedCharacters.map((char) => (
              <CharacterCardGm
                key={char.id}
                character={char}
                eligiblePlayers={eligiblePlayers}
                isLongCampaign={isLongCampaign}
                isTorneoCampaign={isTorneoCampaign}
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
      <div className="card-guild-stone relative rounded-xl p-10 text-center">
        <span className="corner-ornament-tl" />
        <span className="corner-ornament-tr" />
        <span className="corner-ornament-bl" />
        <span className="corner-ornament-br" />
        <p className="font-cinzel text-xl font-semibold text-gold-relief">
          I destini sono in preparazione
        </p>
        <p className="mt-2 text-sm text-barber-paper/75">
          Il Dungeon Master sta forgiando la tua scheda. Attendi l&apos;assegnazione del tuo eroe per visualizzare il registro.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-barber-gold/20 pb-3">
        <h2 className="font-cinzel text-xl font-bold tracking-wider text-gold-relief">Il Mio Personaggio</h2>
        <p className="text-xs text-barber-paper/60">Dossier araldico dell&apos;avventuriero</p>
      </div>
      <CharacterCardPlayer
        character={myCharacter}
        isLongCampaign={isLongCampaign}
        isTorneoCampaign={isTorneoCampaign}
      />
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
