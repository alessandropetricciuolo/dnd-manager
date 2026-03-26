"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCampaignMemberForGm,
  assignCampaignMemberParty,
  createCampaignParty,
  listAssignablePlayersForCampaign,
  listCampaignMembersForGm,
  listCampaignParties,
  removeCampaignMemberForGm,
  type AssignablePlayerForCampaignRow,
  type CampaignMemberForGmRow,
} from "@/app/campaigns/actions";

type CampaignPartyMembersPanelProps = {
  campaignId: string;
};

export function CampaignPartyMembersPanel({ campaignId }: CampaignPartyMembersPanelProps) {
  const [loading, setLoading] = useState(true);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [creatingParty, setCreatingParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");
  const [parties, setParties] = useState<{ id: string; name: string }[]>([]);
  const [members, setMembers] = useState<CampaignMemberForGmRow[]>([]);
  const [assignablePlayers, setAssignablePlayers] = useState<AssignablePlayerForCampaignRow[]>([]);
  const [selectedPlayerToAdd, setSelectedPlayerToAdd] = useState("");
  const [selectedPartyForAdd, setSelectedPartyForAdd] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [partiesRes, membersRes, assignableRes] = await Promise.all([
      listCampaignParties(campaignId),
      listCampaignMembersForGm(campaignId),
      listAssignablePlayersForCampaign(campaignId),
    ]);
    setLoading(false);

    if (partiesRes.success && partiesRes.data) {
      setParties(partiesRes.data.map((p) => ({ id: p.id, name: p.name })));
    } else {
      setParties([]);
      if (partiesRes.message) toast.error(partiesRes.message);
    }

    if (membersRes.success && membersRes.data) {
      setMembers(membersRes.data);
    } else {
      setMembers([]);
      if (membersRes.message) toast.error(membersRes.message);
    }

    if (assignableRes.success && assignableRes.data) {
      setAssignablePlayers(assignableRes.data);
    } else {
      setAssignablePlayers([]);
      if (assignableRes.message) toast.error(assignableRes.message);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleCreateParty() {
    if (!newPartyName.trim() || creatingParty) return;
    setCreatingParty(true);
    const res = await createCampaignParty(campaignId, { name: newPartyName.trim() });
    setCreatingParty(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? "Errore nella creazione del gruppo.");
      return;
    }
    toast.success("Gruppo creato.");
    setNewPartyName("");
    await loadData();
  }

  async function handleAssignParty(playerId: string, nextPartyId: string) {
    setSavingPlayerId(playerId);
    const res = await assignCampaignMemberParty(campaignId, playerId, nextPartyId || null);
    setSavingPlayerId(null);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    setMembers((prev) =>
      prev.map((m) =>
        m.player_id === playerId
          ? {
              ...m,
              party_id: nextPartyId || null,
              party_name: nextPartyId ? parties.find((p) => p.id === nextPartyId)?.name ?? null : null,
            }
          : m
      )
    );
    toast.success("Gruppo aggiornato.");
  }

  async function handleAddMember() {
    if (!selectedPlayerToAdd || addingMember) return;
    setAddingMember(true);
    const res = await addCampaignMemberForGm(campaignId, selectedPlayerToAdd, selectedPartyForAdd || null);
    setAddingMember(false);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success("Giocatore aggiunto alla campagna.");
    setSelectedPlayerToAdd("");
    setSelectedPartyForAdd("");
    await loadData();
  }

  async function handleRemoveMember(playerId: string) {
    setRemovingPlayerId(playerId);
    const res = await removeCampaignMemberForGm(campaignId, playerId);
    setRemovingPlayerId(null);
    if (!res.success) {
      toast.error(res.message);
      return;
    }
    toast.success("Membro rimosso.");
    await loadData();
  }

  return (
    <section className="rounded-lg border border-barber-gold/30 bg-barber-dark/50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-barber-paper">
        <Users className="h-4 w-4 text-barber-gold" />
        Gruppi campagna (Long)
      </h3>

      <div className="mb-4 flex gap-2">
        <Input
          value={newPartyName}
          onChange={(e) => setNewPartyName(e.target.value)}
          placeholder="Nome nuovo gruppo"
          className="bg-barber-dark border-barber-gold/30 text-barber-paper"
          disabled={creatingParty}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void handleCreateParty())}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 border-barber-gold/40 text-barber-paper"
          onClick={() => void handleCreateParty()}
          disabled={!newPartyName.trim() || creatingParty}
        >
          {creatingParty ? "..." : "Crea gruppo"}
        </Button>
      </div>

      <div className="mb-4 grid gap-2 rounded-md border border-barber-gold/20 bg-barber-dark/60 p-3 sm:grid-cols-[minmax(0,1fr)_220px_auto]">
        <div className="space-y-1">
          <Label className="text-xs text-barber-paper/70">Aggiungi giocatore alla campagna</Label>
          <select
            className="flex h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
            value={selectedPlayerToAdd}
            onChange={(e) => setSelectedPlayerToAdd(e.target.value)}
            disabled={addingMember}
          >
            <option value="">Seleziona giocatore</option>
            {assignablePlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-barber-paper/70">Gruppo iniziale (opzionale)</Label>
          <select
            className="flex h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
            value={selectedPartyForAdd}
            onChange={(e) => setSelectedPartyForAdd(e.target.value)}
            disabled={addingMember}
          >
            <option value="">Nessun gruppo</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>
        </div>
        <div className="self-end">
          <Button
            type="button"
            variant="outline"
            className="w-full border-barber-gold/40 text-barber-paper sm:w-auto"
            onClick={() => void handleAddMember()}
            disabled={!selectedPlayerToAdd || addingMember}
          >
            {addingMember ? "..." : "Aggiungi"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-barber-paper/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento membri...
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-barber-paper/60">Nessun membro ancora iscritto alla campagna.</p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.player_id}
              className="grid gap-2 rounded-md border border-barber-gold/20 bg-barber-dark/70 p-2 sm:grid-cols-[minmax(0,1fr)_220px]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-barber-paper">{member.player_name}</p>
                <p className="text-xs text-barber-paper/60">
                  Gruppo attuale: {member.party_name ?? "Nessuno"}
                </p>
              </div>
                    <div className="space-y-1">
                <Label className="text-xs text-barber-paper/70">Assegna gruppo</Label>
                      <div className="flex gap-2">
                        <select
                          className="flex h-9 w-full rounded-md border border-barber-gold/30 bg-barber-dark px-2 text-sm text-barber-paper"
                          value={member.party_id ?? ""}
                          onChange={(e) => void handleAssignParty(member.player_id, e.target.value)}
                          disabled={savingPlayerId === member.player_id || removingPlayerId === member.player_id}
                        >
                          <option value="">Nessun gruppo</option>
                          {parties.map((party) => (
                            <option key={party.id} value={party.id}>
                              {party.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 border border-red-500/30 text-red-300 hover:bg-red-500/20 hover:text-red-200"
                          disabled={removingPlayerId === member.player_id}
                          onClick={() => void handleRemoveMember(member.player_id)}
                          title="Rimuovi membro dalla campagna"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
